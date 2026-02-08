async function initAsistensi() {
    const content = document.getElementById("asistensiContent");
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    
    if (!content) return;

    content.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Mengecek validasi & memperbarui data asistensi...</p>
        </div>`;

    try {
        // Ambil data dari ENDPOINT_PENDAFTARAN (Data Calon + Status)
        const [resDaftar, resLog, resMK] = await Promise.all([
            fetch(ENDPOINT_PENDAFTARAN),
            fetch(ENDPOINT_LOGBOOK),
            fetch(ENDPOINT_MK)
        ]);

        const allDaftar = await resDaftar.json();
        const allLogs = await resLog.json();
        const allMKMaster = await resMK.json();

        // Filter: Hanya ambil pendaftaran milik user ini yang statusnya 'Diterima'
        const dataDiterimaRaw = allDaftar.filter(item => 
            item.email === user.email && item.status === "Diterima"
        );

        const dataDiterimaLengkap = dataDiterimaRaw.map(pendaftaran => {
            const detailMK = allMKMaster.find(m => m.kodeMK === pendaftaran.kodeMK && m.kelas === pendaftaran.kelas);
            return {
                ...pendaftaran,
                // Tambahkan data dosen & semester dari master MK
                semester: detailMK?.semester || pendaftaran.semester,
                dosen1: detailMK?.dosen1 || "-",
                dosen2: detailMK?.dosen2 || "-",
                dosen3: detailMK?.dosen3 || "-"
            };
        });

        // LOGIKA PENGUNCIAN: Jika tidak ada yang diterima, tampilkan pesan terkunci
        if (dataDiterimaLengkap.length === 0) {
            content.innerHTML = `
                <div class="card border-0 shadow-sm mt-4">
                    <div class="card-body text-center py-5">
                        <i class="bi bi-lock-fill text-danger display-1"></i>
                        <h3 class="mt-3 fw-bold">Halaman Terkunci</h3>
                        <p class="text-muted">Mohon maaf, halaman ini hanya dapat diakses oleh Mahasiswa yang telah dinyatakan <b>Lolos Seleksi</b> sebagai Asisten.</p>
                        <hr class="w-25 mx-auto">
                        <p class="small">Silakan cek status pendaftaran Anda pada menu <b>Lihat Hasil</b>.</p>
                    </div>
                </div>`;
            return;
        }

        // JIKA LOLOS: Tampilkan Tabel Manajemen Asistensi
        renderTabelAsistensi(dataDiterimaLengkap, allLogs);

    } catch (err) {
        console.error(err);
        content.innerHTML = '<div class="alert alert-danger">Gagal memvalidasi data pendaftaran.</div>';
    }
}

function renderTabelAsistensi(data, allLogs) {
    const content = document.getElementById("asistensiContent");
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    
    content.innerHTML = `
        <div class="card shadow-sm border-0">
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0" id="tableMK">
                        <thead class="table-primary text-white">
                            <tr>
                                <th class="text-center" style="width: 50px;">No</th>
                                <th class="text-center">Kode MK</th>
                                <th>Nama Mata Kuliah</th>
                                <th class="text-center">Kelas</th>
                                <th class="text-center">Jadwal</th>
                                <th class="text-center">Logbook</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map((item, i) => {
                                const myLogs = allLogs.filter(l => l.kodeMK === item.kodeMK && l.kelas === item.kelas && l.email === user.email);
                                const targetId = `logs-${i}`;                                
                                return `
                                <tr class="fw-bold bg-white">
                                    <td class="text-center">${i + 1}</td>
                                    <td class="text-center"><span class="badge bg-light text-dark border">${item.kodeMK}</span></td>
                                    <td>${item.namaMK}</td>
                                    <td class="text-center"><span class="badge bg-info text-dark">${item.kelas}</span></td>
                                    <td class="text-center small">${item.hari}, <span class="text-muted">${item.jam}</span></td>
                                    <td class="text-center">
                                        <div class="btn-group btn-group-sm">
                                            <button class="btn btn-primary" onclick="bukaModalLog('${item.kodeMK}', ${JSON.stringify(item).replace(/"/g, '&quot;')})" title="Tambah Log">
                                                <i class="bi bi-plus-lg"></i>
                                            </button>
                                            <button class="btn btn-outline-primary" 
                                                onclick="generateWord('${item.kodeMK}', '${item.kelas}', ${JSON.stringify(item).replace(/"/g, '&quot;')})" 
                                                title="Generate Word">
                                                <i class="bi bi-file-earmark-word"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                <tr id="${targetId}" class="bg-light shadow-inner">
                                    <td colspan="6" class="p-3">
                                        <div class="table-responsive bg-white rounded shadow-sm">
                                            <table class="table table-sm mb-0 small">
                                                <thead class="table-dark">
                                                    <tr>
                                                        <th class="text-center" style="width: 80px;">Aksi</th>
                                                        <th>Tanggal</th>
                                                        <th class="text-center">Minggu ke- di bulan</th>
                                                        <th class="text-center">Jam</th>
                                                        <th>Materi</th>
                                                        <th class="text-center">Hadir</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${myLogs.length > 0 ? myLogs.map(l => `
                                                        <tr>
                                                            <td class="text-center">
                                                                <button class="btn btn-link btn-sm p-0 text-warning me-2" onclick="editLog(${JSON.stringify(l).replace(/"/g, '&quot;')})"><i class="bi bi-pencil-square"></i></button>
                                                                <button class="btn btn-link btn-sm p-0 text-danger" onclick="hapusLog('${l.logId}')"><i class="bi bi-trash"></i></button>
                                                            </td>
                                                            <td>${l.tanggal}</td>
                                                            <td class="text-center">${l.mingguKe}</td>
                                                            <td class="text-center">${l.jam}</td>
                                                            <td>${l.materi}</td>
                                                            <td class="text-center">${l.kehadiran}</td>
                                                        </tr>
                                                    `).join('') : `<tr><td colspan="6" class="text-center p-3 text-muted">Belum ada logbook. Klik tombol + untuk menambah.</td></tr>`}
                                                </tbody>
                                            </table>
                                        </div>
                                    </td>
                                </tr>`;
                            }).join('')}    
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="alert alert-success mt-4 border-0 shadow-sm small">
            <i class="bi bi-info-circle-fill me-2"></i>
            Anda terdaftar sebagai asisten untuk mata kuliah di atas. Gunakan halaman ini untuk manajemen aktivitas asistensi Anda.
        </div>`;
        setupLogbookForm();
}

async function toggleLogbook(kodeMK, kelas, index) {
    const row = document.getElementById(`logs-${index}`);
    const arrow = document.querySelector(`.icon-arrow-${index}`);
    const container = document.getElementById(`container-logs-${kodeMK}-${kelas}`);

    if (row.classList.contains('d-none')) {
        row.classList.remove('d-none');
        arrow.classList.replace('bi-chevron-right', 'bi-chevron-down');
        
        const res = await fetch(ENDPOINT_LOGBOOK);
        const allLogs = await res.json();
        const user = JSON.parse(sessionStorage.getItem("user") || "{}");
        
        const myLogs = allLogs.filter(l => l.kodeMK === kodeMK && l.kelas === kelas && l.email === user.email);

        if (myLogs.length === 0) {
            container.innerHTML = `<div class="text-center py-2 small text-muted italic">Belum ada catatan logbook untuk mata kuliah ini.</div>`;
        } else {
            container.innerHTML = `
                <table class="table table-sm table-bordered bg-white small mb-0">
                    <thead class="bg-secondary text-white">
                        <tr>
                            <th>Aksi</th>
                            <th>Tanggal</th>
                            <th>Wek</th>
                            <th>Jam</th>
                            <th>Materi</th>
                            <th>Hadir</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${myLogs.map(l => `
                            <tr>
                                <td class="text-center">
                                    <i class="bi bi-pencil-square text-warning me-2" style="cursor:pointer" onclick="editLog(${JSON.stringify(l).replace(/"/g, '&quot;')})"></i>
                                    <i class="bi bi-trash text-danger" style="cursor:pointer" onclick="hapusLog('${l.logId}')"></i>
                                </td>
                                <td>${l.tanggal}</td>
                                <td class="text-center">${l.mingguKe}</td>
                                <td>${l.jam}</td>
                                <td>${l.materi}</td>
                                <td class="text-center">${l.kehadiran}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`;
        }
    } else {
        row.classList.add('d-none');
        arrow.classList.replace('bi-chevron-down', 'bi-chevron-right');
    }
}

function bukaModalLog(kodeMK, dataMK) {
    document.getElementById('formLogbook').reset();
    document.getElementById('logId').value = "";
    document.getElementById('logDataMK').value = JSON.stringify(dataMK);
    document.getElementById('logbookTitle').innerText = "Buat Logbook Baru: " + dataMK.namaMK;
    document.getElementById('btnSimpanLog').innerText = "Buat Logbook";
    
    new bootstrap.Modal(document.getElementById('modalLogbook')).show();
}

function setupLogbookForm() {
    const form = document.getElementById('formLogbook');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSimpanLog');
        const user = JSON.parse(sessionStorage.getItem("user") || "{}");
        const mkRaw = document.getElementById('logDataMK').value;
        const mk = JSON.parse(mkRaw);
        const logId = document.getElementById('logId').value;
        const tglInput = document.getElementById('logTanggal').value;
        const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const dateObj = new Date(tglInput);
        const tglIndo = `${dateObj.getDate()} ${daftarBulan[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Memproses...`;

        try {
            const payload = {
                action: logId ? "updateLog" : "addLog",
                logId: logId,
                // Data MK & Asisten
                semester: mk.semester,
                kodeMK: mk.kodeMK,
                namaMK: mk.namaMK,
                kelas: mk.kelas,
                dosen1: mk.dosen1,
                dosen2: mk.dosen2, 
                dosen3: mk.dosen3 || "-",
                namaAsisten: user.nama,
                nim: user.nim,
                emailAsisten: user.email,
                // Data Input
                tanggal: tglIndo,
                mingguKe: document.getElementById('logMinggu').value,
                jam: document.getElementById('logJam').value,
                materi: document.getElementById('logMateri').value,
                jenis: document.getElementById('logJenis').value,
                kehadiran: document.getElementById('logHadir').value
            };

            const response = await fetch(ENDPOINT_LOGBOOK, { 
                method: "POST", 
                body: JSON.stringify(payload) 
            });

            if (!response.ok) throw new Error("Gagal menyimpan ke server");
            
            Swal.fire("Berhasil", "Data logbook disimpan!", "success");
            bootstrap.Modal.getInstance(document.getElementById('modalLogbook')).hide();
            initAsistensi(); 
        } catch (err) {
            console.error(err);
            Swal.fire("Error", "Gagal memproses data: " + err.message, "error");
        } finally {
            btn.disabled = false;
            btn.innerText = logId ? "Simpan Perubahan" : "Buat Logbook";
        }
    };
}

// Fungsi Edit: Mengisi modal dengan data lama
function editLog(l) {
    const btn = document.getElementById('btnSimpanLog');
    document.getElementById('logbookTitle').innerText = "Edit Logbook";
    btn.disabled = false;
    btn.innerText = "Simpan Perubahan";
    document.getElementById('logId').value = l.logId;
    document.getElementById('logTanggal').value = formatToInputDate(l.tanggal);
    document.getElementById('logMinggu').value = l.mingguKe;
    document.getElementById('logJam').value = l.jam;
    document.getElementById('logMateri').value = l.materi;
    document.getElementById('logJenis').value = l.jenis;
    document.getElementById('logHadir').value = l.kehadiran;
    
    // MK data di-placeholder agar tidak error saat submit
    document.getElementById('logDataMK').value = JSON.stringify({kodeMK: l.kodeMK, namaMK: l.namaMK, kelas: l.kelas});
    
    new bootstrap.Modal(document.getElementById('modalLogbook')).show();
}

// Fungsi Hapus dengan SweetAlert
async function hapusLog(logId) {
    const res = await Swal.fire({
        title: 'Hapus Log ini?',
        text: "Data yang dihapus tidak bisa dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Ya, Hapus!'
    });

    if (res.isConfirmed) {
        Swal.fire({title: 'Menghapus...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
        await fetch(ENDPOINT_LOGBOOK, { method: "POST", body: JSON.stringify({action: "deleteLog", logId: logId}) });
        Swal.fire("Dihapus!", "Catatan logbook telah dihapus.", "success");
        initAsistensi();
    }
}

// Helper untuk convert "8 Februari 2026" ke "2026-02-08" agar bisa dibaca input date
function formatToInputDate(dateStr) {
    if(!dateStr) return "";
    const parts = dateStr.split(" ");
    const months = {"Januari":"01","Februari":"02","Maret":"03","April":"04","Mei":"05","Juni":"06","Juli":"07","Agustus":"08","September":"09","Oktober":"10","November":"11","Desember":"12"};
    return `${parts[2]}-${months[parts[1]]}-${parts[0].padStart(2, '0')}`;
}

async function generateWord(kodeMK, kelas, dataMK) {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    
    Swal.fire({ title: 'Menyiapkan Laporan Satu Semester...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(ENDPOINT_LOGBOOK);
        const allLogs = await res.json();

        // 1. Ambil SEMUA log untuk MK & Kelas ini milik user tersebut
        const myLogs = allLogs.filter(l => 
            l.kodeMK === kodeMK && 
            l.kelas === kelas && 
            l.email === user.email
        );

        if (myLogs.length === 0) {
            Swal.fire("Data Kosong", "Belum ada catatan logbook untuk digenerate.", "warning");
            return;
        }

        // 2. Grouping Data berdasarkan Bulan
        // Kita buat urutan bulan agar laporan berurutan (Jan-Jun atau Agst-Jan)
        const urutanBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        
        // Cari bulan-bulan unik yang ada di data logbook mahasiswa
        const bulanTersedia = [...new Set(myLogs.map(l => l.bulan))].sort((a, b) => {
            return urutanBulan.indexOf(a) - urutanBulan.indexOf(b);
        });

        const perBulan = bulanTersedia.map(namaBulan => {
            return {
                Bulan: namaBulan,
                // Ambil tahun dari salah satu entri di bulan tersebut
                Tahun: myLogs.find(l => l.bulan === namaBulan).tanggal.split(" ")[2],
                logs: myLogs.filter(l => l.bulan === namaBulan).map(l => ({
                    minggu: l.mingguKe,
                    tgl: l.tanggal,
                    jam: l.jam,
                    materi: l.materi,
                    jenis: l.jenis === "Praktikum" ? "P" : "T",
                    hadir: l.kehadiran,
                    catatan: "",
                    ttd: ""
                }))
            };
        });

        // 3. Load Template
        const response = await fetch('template/Template_Laporan_Asisten.docx');
        const content = await response.arrayBuffer();
        const zip = new PizZip(content);
        const doc = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        const today = new Date();
        const dataRender = {
            Semester: dataMK.semester || "Genap 25/26",
            NamaMK: dataMK.namaMK,
            Dosen1: getNamaDosen(dataMK.dosen1),
            Dosen2: getNamaDosen(dataMK.dosen2),
            Dosen3: getNamaDosen(dataMK.dosen3),
            NamaAsisten: user.nama,
            TanggalHari: `${today.getDate()} ${urutanBulan[today.getMonth()]} ${today.getFullYear()}`,
            // Inilah bagian yang akan meloop seluruh halaman per bulan
            halamanBulan: perBulan
        };

        doc.render(dataRender);
        const out = doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        
        saveAs(out, `Laporan_Semester_${dataMK.namaMK}_${dataMK.kelas}.docx`);
        Swal.close();

    } catch (error) {
        console.error(error);
        Swal.fire("Error", "Gagal mengenerate laporan semester.", "error");
    }
}