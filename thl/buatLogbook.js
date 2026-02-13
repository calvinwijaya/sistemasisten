// Variabel global untuk menyimpan data pekerjaan yang sedang aktif di modal
let activeWorkData = null;

function initBuatLogbook() {
    const user = JSON.parse(sessionStorage.getItem("user"));
    const container = document.getElementById("thlWorkContent");
    
    container.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2">Mencari pekerjaan terdaftar untuk ${user.nama}...</p>
        </div>`;

    Promise.all([
        fetch(ENDPOINT_THL_KEBUTUHAN).then(res => res.json()),
        fetch(ENDPOINT_THL_TERPILIH).then(res => res.json())
    ])
    .then(([resKebutuhan, resTerpilih]) => {
        if (resKebutuhan.status === "ok" && resTerpilih.status === "ok") {
            renderWorkTable(resKebutuhan.data, resTerpilih.data, user.email);
        } else {
            throw new Error("Gagal mengambil data dari server.");
        }
    })
    .catch(err => {
        console.error(err);
        container.innerHTML = `<div class="alert alert-danger">Terjadi kesalahan: ${err.message}</div>`;
    });

    setupModalInputs();
}

function renderWorkTable(dataKebutuhan, dataTerpilih, userEmail) {
    const container = document.getElementById("thlWorkContent");
    const myWorks = dataTerpilih.filter(row => row[5]?.toString().toLowerCase() === userEmail.toLowerCase());

    if (myWorks.length === 0) {
        container.innerHTML = `<div class="alert alert-warning text-center">Anda belum terdaftar di pekerjaan apapun.</div>`;
        return;
    }

    let html = "";
    myWorks.forEach((work, index) => {
        const tahun = work[1];
        const namaPekerjaan = work[2];
        const workId = `work-${index}`;
        const detailKebutuhan = dataKebutuhan.find(k => k[2] === namaPekerjaan && k[1] == tahun);

        html += `
        <div class="card shadow-sm mb-4 border-0" style="border-radius: 12px; overflow: hidden;">
            <div class="table-responsive">
                <table class="table align-middle mb-0">
                    <thead style="background-color: #1e3a8a; color: white;">
                        <tr style="font-size: 0.8rem; letter-spacing: 1px;">
                            <th width="5%" class="text-center py-3">NO</th>
                            <th class="py-3">PEKERJAAN THL</th>
                            <th width="15%" class="text-center py-3">TAHUN</th>
                            <th width="15%" class="text-center py-3">LOGBOOK</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="text-center fw-bold">${index + 1}</td>
                            <td><span class="fw-bold text-primary fs-5">${namaPekerjaan}</span></td>
                            <td class="text-center"><span class="badge bg-light text-dark border">${tahun}</span></td>
                            <td class="text-center">
                                <div class="btn-group shadow-sm">
                                    <button class="btn btn-primary" title="Tambah Log" onclick='openLogbookModal(${JSON.stringify(work)}, ${JSON.stringify(detailKebutuhan)})'>
                                        <i class="bi bi-plus-lg"></i>
                                    </button>
                                    <button class="btn btn-outline-primary" title="Generate Laporan" onclick="openGenerateModal('${namaPekerjaan}')">
                                        <i class="bi bi-file-earmark-word"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="4" class="p-3 bg-light">
                                <div class="table-responsive bg-white rounded shadow-sm">
                                    <table class="table table-sm table-hover mb-0" style="font-size: 0.85rem;">
                                        <thead class="bg-primary text-white text-uppercase" style="font-size: 0.75rem;">
                                            <tr>
                                                <th class="text-center" width="8%">AKSI</th>
                                                <th width="12%">TANGGAL</th>
                                                <th width="10%">HARI</th>
                                                <th width="15%">JAM</th>
                                                <th>PEKERJAAN / AKTIVITAS</th>
                                                <th class="text-center" width="8%">DURASI</th>
                                            </tr>
                                        </thead>
                                        <tbody id="history-${workId}">
                                            <tr>
                                                <td colspan="6" class="text-center py-3 text-muted">
                                                    <div class="spinner-border spinner-border-sm text-primary me-2"></div>Memuat data...
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    });

    container.innerHTML = html;
    setTimeout(() => {
        myWorks.forEach((work, index) => {
            loadHistory(work[2], `work-${index}`);
        });
    }, 0);
}

function setupModalInputs() {
    const jamMasuk = document.getElementById("logThlJamMasuk");
    const jamPulang = document.getElementById("logThlJamPulang");
    const menitMasuk = document.getElementById("logThlMenitMasuk");
    const menitPulang = document.getElementById("logThlMenitPulang");

    const renderJam = (selectEl, start, end) => {
        let html = "";
        for (let i = start; i <= end; i++) {
            let h = i.toString().padStart(2, '0');
            html += `<option value="${h}">${h}</option>`;
        }
        selectEl.innerHTML = html;
    };

    const renderMenit = (selectEl) => {
        let html = "";
        for (let i = 0; i < 60; i += 5) {
            let m = i.toString().padStart(2, '0');
            html += `<option value="${m}">${m}</option>`;
        }
        selectEl.innerHTML = html;
    };

    renderJam(jamMasuk, 7, 18);
    renderJam(jamPulang, 7, 19);
    renderMenit(menitMasuk);
    renderMenit(menitPulang);

    // Logika menyembunyikan jam pulang yang lebih kecil dari jam masuk
    jamMasuk.addEventListener("change", function() {
        const selectedJamMasuk = parseInt(this.value);
        let html = "";
        for (let i = selectedJamMasuk; i <= 19; i++) {
            let h = i.toString().padStart(2, '0');
            html += `<option value="${h}">${h}</option>`;
        }
        jamPulang.innerHTML = html;
    });

    document.getElementById("logThlTanggal").addEventListener("change", function() {
        if (!this.value) return;
        const date = new Date(this.value);
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        document.getElementById("logThlHari").value = days[date.getDay()];
    });
}

function openLogbookModal(work, kebutuhan) {
    activeWorkData = { work, kebutuhan };
    document.getElementById("logbookTitleThl").textContent = "Buat Logbook Baru";
    document.getElementById("logThlId").value = "";
    document.getElementById("displayNamaPekerjaan").textContent = work[2];
    document.getElementById("formLogbookThl").reset();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("logThlTanggal").value = today;
    document.getElementById("logThlTanggal").dispatchEvent(new Event('change'));

    // Reset tombol simpan ke mode default
    const btn = document.getElementById("btnSimpanLogThl");
    btn.onclick = null; 

    new bootstrap.Modal(document.getElementById('modalLogbookThl')).show();
}

// 5. Fungsi Gabungan Simpan dan Update
function processSaveOrUpdate(isEdit = false) {
    const btn = document.getElementById("btnSimpanLogThl");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${isEdit ? 'Memperbarui...' : 'Menyimpan...'}`;

    const tanggalVal = document.getElementById("logThlTanggal").value;
    const dateObj = new Date(tanggalVal);
    const bulanNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    const hMasuk = document.getElementById("logThlJamMasuk").value;
    const mMasuk = document.getElementById("logThlMenitMasuk").value;
    const hPulang = document.getElementById("logThlJamPulang").value;
    const mPulang = document.getElementById("logThlMenitPulang").value;
    
    // Hitung selisih jam
    const totalMasuk = parseInt(hMasuk) + (parseInt(mMasuk) / 60);
    const totalPulang = parseInt(hPulang) + (parseInt(mPulang) / 60);
    const selisihJam = (totalPulang - totalMasuk).toFixed(2);

    if (selisihJam <= 0) {
        Swal.fire("Error", "Jam pulang harus lebih besar dari jam masuk!", "error");
        btn.disabled = false;
        btn.innerText = "Simpan Logbook";
        return;
    }

    const cleanAktivitas = document.getElementById("logThlAktivitas").value.trim();
    const logId = document.getElementById("logThlId").value;

    // Gunakan activeWorkData untuk save, atau ambil dari data tersembunyi/activeWorkData saat edit
    const formData = {
        tahun: activeWorkData.work[1],
        pekerjaan: activeWorkData.work[2],
        dosen1: activeWorkData.kebutuhan ? (activeWorkData.kebutuhan[4] || "-") : "-",
        dosen2: activeWorkData.kebutuhan ? (activeWorkData.kebutuhan[5] || "-") : "-",
        dosen3: activeWorkData.kebutuhan ? (activeWorkData.kebutuhan[6] || "-") : "-",
        dosen4: activeWorkData.kebutuhan ? (activeWorkData.kebutuhan[7] || "-") : "-",
        dosen5: activeWorkData.kebutuhan ? (activeWorkData.kebutuhan[8] || "-") : "-",
        namaThl: activeWorkData.work[3],
        noHp: activeWorkData.work[4],
        email: activeWorkData.work[5],
        bulan: bulanNames[dateObj.getMonth()],
        hari: document.getElementById("logThlHari").value,
        tanggal: formatDateToIndoFull(tanggalVal),
        jamMasuk: `${hMasuk}:${mMasuk}`,
        jamPulang: `${hPulang}:${mPulang}`,
        jumlahJam: selisihJam,
        jumlahHari: 1,
        aktivitas: cleanAktivitas
    };

    const payload = { 
        action: isEdit ? "updateLogbook" : "saveLogbook", 
        formData: formData 
    };
    if (isEdit) payload.logId = logId;

    fetch(ENDPOINT_THL_LOGBOOK, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "ok") {
            Swal.fire("Berhasil", isEdit ? "Logbook diperbarui!" : "Logbook disimpan!", "success");
            bootstrap.Modal.getInstance(document.getElementById('modalLogbookThl')).hide();
            initBuatLogbook();
        } else {
            throw new Error(data.message);
        }
    })
    .catch(err => {
        Swal.fire("Gagal", err.message, "error");
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerText = "Simpan Logbook";
    });
}

document.getElementById("formLogbookThl").addEventListener("submit", function(e) {
    e.preventDefault();
    // Jika tombol diklik biasa (bukan via onclick edit), jalankan mode save
    if (!this.querySelector("#btnSimpanLogThl").onclick) {
        processSaveOrUpdate(false);
    }
});

function loadHistory(namaPekerjaan, workId) {
    const user = JSON.parse(sessionStorage.getItem("user"));
    const tbody = document.getElementById(`history-${workId}`);

    if (!tbody) return;

    fetch(`${ENDPOINT_THL_LOGBOOK}?action=getLogbook&email=${user.email}`)
        .then(res => res.json())
        .then(res => {
            if (res.status === "ok") {
                const filteredData = res.data.filter(row => row[3] === namaPekerjaan);
                renderHistoryRows(filteredData, tbody);
            }
        });
}

function renderHistoryRows(data, tbody) {
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-muted">Belum ada logbook.</td></tr>`;
        return;
    }

    let html = "";
    data.forEach((row) => {
        const fixTimeFormat = (val) => {
            if (!val) return "00:00";
            let s = val.toString();
            // Jika format ISO (1899-12-30T07:15:00.000Z)
            if (s.includes('T')) return s.split('T')[1].substring(0, 5);
            // Jika format waktu (07:15:00)
            if (s.includes(':')) return s.substring(0, 5);
            return s;
        };

        const jamM = fixTimeFormat(row[15]);
        const jamP = fixTimeFormat(row[16]);

        html += `
        <tr>
            <td class="text-center">
                <div class="d-flex justify-content-center gap-2">
                    <button class="btn btn-sm text-primary p-0" onclick='openEditModal(${JSON.stringify(row)})'>
                        <i class="bi bi-pencil-square fs-6"></i>
                    </button>
                    <button class="btn btn-sm text-danger p-0" onclick="deleteLog('${row[0]}')">
                        <i class="bi bi-trash fs-6"></i>
                    </button>
                </div>
            </td>
            <td class="fw-semibold">${row[14]}</td>
            <td class="text-uppercase text-secondary" style="font-size: 0.7rem;">${row[13]}</td>
            <td><span class="badge bg-light text-dark border fw-normal">${jamM} - ${jamP}</span></td>
            <td class="text-wrap">${row[19]}</td>
            <td class="text-center fw-bold text-primary">${row[17]} Jam</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function formatDateToIndoFull(dateStr) {
    const d = new Date(dateStr);
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function deleteLog(logId) {
    Swal.fire({
        title: 'Hapus Logbook?',
        text: "Data ini akan dihapus permanen dari sistem.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            // Menampilkan loading spinner ala myDTGD
            Swal.fire({
                title: 'Sedang menghapus data...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            fetch(ENDPOINT_THL_LOGBOOK, {
                method: "POST",
                body: JSON.stringify({ action: "deleteLogbook", logId: logId })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "ok") {
                    Swal.fire('Terhapus!', 'Logbook telah dihapus.', 'success');
                    initBuatLogbook(); 
                } else {
                    throw new Error(data.message);
                }
            })
            .catch(err => {
                Swal.fire('Gagal', err.message, 'error');
            });
        }
    });
}

function openEditModal(rowData) {
    // 1. Set Identitas Pekerjaan
    activeWorkData = {
        work: [null, rowData[2], rowData[3], rowData[9], rowData[10], rowData[11]],
        kebutuhan: null
    };

    document.getElementById("logbookTitleThl").textContent = "Edit Logbook";
    document.getElementById("logThlId").value = rowData[0];
    document.getElementById("displayNamaPekerjaan").textContent = rowData[3];
    document.getElementById("logThlAktivitas").value = rowData[19];

    // 2. Parsing Tanggal (Dari "18 Februari 2026" ke "2026-02-18")
    const parts = rowData[14].split(' ');
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const mIdx = (months.indexOf(parts[1]) + 1).toString().padStart(2, '0');
    const dIdx = parts[0].padStart(2, '0');
    const yIdx = parts[2];
    document.getElementById("logThlTanggal").value = `${yIdx}-${mIdx}-${dIdx}`;
    document.getElementById("logThlTanggal").dispatchEvent(new Event('change'));

    // 3. Parsing Jam & Menit
    const parseClock = (val) => {
        let s = val.toString();
        let time = s.includes('T') ? s.split('T')[1] : s;
        let [h, m] = time.split(':');
        return [h.padStart(2, '0'), m.substring(0, 2)];
    };

    const [hM, mM] = parseClock(rowData[15]);
    const [hP, mP] = parseClock(rowData[16]);

    // Update dropdown jam pulang dulu agar nilai hP tersedia
    document.getElementById("logThlJamMasuk").value = hM;
    document.getElementById("logThlJamMasuk").dispatchEvent(new Event('change')); 
    
    document.getElementById("logThlMenitMasuk").value = mM;
    document.getElementById("logThlJamPulang").value = hP;
    document.getElementById("logThlMenitPulang").value = mP;

    // 4. Update Button Action
    const btn = document.getElementById("btnSimpanLogThl");
    btn.onclick = function(e) {
        e.preventDefault();
        processSaveOrUpdate(true);
    };

    new bootstrap.Modal(document.getElementById('modalLogbookThl')).show();
}