function initLihatPendaftar() {
    refreshPendaftar();
}

// Fungsi Utama: Mengambil data MK dan Pendaftar secara bersamaan
async function refreshPendaftar() {
    const tbody = document.getElementById("listMKPendaftar");
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    const emailDosen = user.email;

    if (!tbody) return;

    // Loading State
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-5">
                <div class="spinner-border text-primary mb-2"></div>
                <p class="mb-0 text-muted">Memuat Data Mata Kuliah & Pendaftar...</p>
            </td>
        </tr>`;

    try {
        // Parallel Fetch untuk efisiensi waktu
        const [resMK, resPendaftar, resReviu] = await Promise.all([
            fetch(ENDPOINT_MK),
            fetch(ENDPOINT_PENDAFTARAN),
            fetch(ENDPOINT_REVIU)
        ]);

        const allMK = await resMK.json();
        const allPendaftar = await resPendaftar.json();
        const allReviu = await resReviu.json();

        // 1. Filter MK milik dosen yang sedang login
        const myMK = allMK.filter(mk => 
            mk.emailDosen1 === emailDosen || 
            mk.emailDosen2 === emailDosen || 
            mk.emailDosen3 === emailDosen ||
            emailDosen === "calvin.wijaya@mail.ugm.ac.id" // Akses Admin
        );

        if (myMK.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Anda belum memiliki jadwal mata kuliah pengampu.</td></tr>';
            return;
        }

        // 2. Render baris MK dan baris Detail (Hidden)
        tbody.innerHTML = myMK.map((mk, i) => {
            // Cari pendaftar untuk MK + Kelas ini dari hasil fetch pendaftaran
            const pendaftarMK = allPendaftar.filter(p => p.kodeMK === mk.kodeMK && p.kelas === mk.kelas);
            const targetId = `collapse-${i}`;

            return `
                <tr class="mk-row-pendaftar fw-semibold" style="cursor: pointer;" 
                    onclick="toggleRow('${targetId}')">
                    <td class="text-center">${i + 1}</td>
                    <td>${mk.namaMK}</td>
                    <td class="text-center"><span class="badge bg-light text-dark border">${mk.kelas}</span></td>
                    <td class="text-center small">${mk.hari}, ${mk.jam}</td>
                    <td class="text-center">${mk.kuotaAsisten}</td>
                    <td class="text-center">
                        <span class="badge ${pendaftarMK.length > 0 ? 'bg-primary' : 'bg-secondary'} rounded-pill">
                            ${pendaftarMK.length} Pendaftar
                        </span>
                    </td>
                </tr>

                <tr class="collapse collapse-row bg-light" id="${targetId}" style="display: none;">
                    <td colspan="7" class="p-3">
                        <div class="card card-body border-0 shadow-sm p-0 overflow-hidden">
                            <table class="table table-sm table-hover align-middle mb-0">
                                <thead class="table-dark">
                                    <tr style="font-size: 0.75rem;">
                                        <th class="text-center py-2">No</th>
                                        <th>Nama Mahasiswa</th>
                                        <th class="text-center">NIM</th>
                                        <th class="text-center">Nilai (Teori & Praktek)</th>
                                        <th class="text-center">WhatsApp</th>
                                        <th class="text-center">Reviu</th>
                                        <th class="text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pendaftarMK.length > 0 ? pendaftarMK.map((p, idx) => {
                                        const histori = allReviu.filter(r => r.nim === p.nim);
            
                                        let reviuHtml = "";
                                        if (histori.length > 0) {
                                            reviuHtml = histori.map(h => `
                                                <div class="border-bottom pb-1 mb-1">
                                                    <small class="d-block fw-bold text-primary" style="font-size: 0.65rem;">
                                                        ${h.semester} | ${h.namaMK} (${h.kelas})
                                                    </small>
                                                    <small class="text-muted d-block italic" style="font-size: 0.65rem; line-height: 1;">
                                                        "${h.reviu || 'Tidak ada catatan reviu'}"
                                                    </small>
                                                </div>
                                            `).join('');
                                        } else {
                                            reviuHtml = `<small class="text-muted italic" style="font-size: 0.65rem;">Mahasiswa ini baru pertama kali mendaftar sebagai Asisten Praktikum/ Tutor.</small>`;
                                        }

                                        return `
                                        <tr>
                                            <td class="text-center">${idx + 1}</td>
                                            <td class="small fw-bold">${p.nama}</td>
                                            <td class="text-center small">${p.nim}</td>
                                            <td class="text-center small">${p.nilaiTeori} & ${p.nilaiPrak}</td>
                                            <td class="text-center">
                                                <a href="https://wa.me/0${p.noHP}" target="_blank" class="btn btn-xs btn-success py-0 px-2 small" style="font-size: 0.7rem;">
                                                    <i class="bi bi-whatsapp"></i> Hubungi
                                                </a>
                                            </td>
                                            <td class="p-2" style="max-width: 200px;"> <div style="max-height: 80px; overflow-y: auto;">
                                                    ${reviuHtml}
                                                </div>
                                            </td>
                                            <td class="text-center" style="position: relative;">
                                                ${(() => {
                                                    // Tentukan warna badge berdasarkan status dari server
                                                    if (p.status === "Diterima") {
                                                        return `<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Diterima</span>`;
                                                    } else if (p.status === "Ditolak") {
                                                        return `<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Ditolak</span>`;
                                                    } else {
                                                        // Jika status masih kosong atau "Menunggu", tampilkan Dropdown
                                                        return `
                                                            <div class="dropdown">
                                                                <button class="btn btn-xs btn-warning dropdown-toggle py-1 px-2" 
                                                                        type="button" 
                                                                        id="dropdownMenu-${p.regId}"
                                                                        data-bs-toggle="dropdown" 
                                                                        data-bs-display="static"
                                                                        aria-expanded="false"
                                                                        style="font-size: 0.65rem;"
                                                                        onclick="event.stopPropagation();">
                                                                    Menunggu
                                                                </button>
                                                                <ul class="dropdown-menu dropdown-menu-end shadow-lg border" aria-labelledby="dropdownMenu-${p.regId}">
                                                                    <li>
                                                                        <a class="dropdown-item text-success fw-bold" href="javascript:void(0)" 
                                                                        onclick="event.stopPropagation(); konfirmasiAksi('Terima', '${p.regId}', '${p.nama}', '${mk.namaMK}', '${mk.kelas}', ${JSON.stringify(p).replace(/"/g, '&quot;')}, ${JSON.stringify(mk).replace(/"/g, '&quot;')})">
                                                                        <i class="bi bi-check-circle-fill me-2"></i>Terima
                                                                        </a>
                                                                    </li>
                                                                    <li>
                                                                        <a class="dropdown-item text-danger fw-bold" href="javascript:void(0)" 
                                                                        onclick="event.stopPropagation(); konfirmasiAksi('Tolak', '${p.regId}', '${p.nama}', '${mk.namaMK}', '${mk.kelas}')">
                                                                        <i class="bi bi-x-circle-fill me-2"></i>Tolak
                                                                        </a>
                                                                    </li>
                                                                </ul>
                                                            </div>`;
                                                    }
                                                })()}
                                            </td>
                                        </tr>`;
                                    }).join('') : `
                                        <tr>
                                            <td colspan="6" class="text-center py-3 text-muted small italic">Belum ada mahasiswa yang mendaftar di kelas ini.</td>
                                        </tr>
                                    `}
                                </tbody>
                                <tfoot class="bg-light">
                                    <tr>
                                        <td colspan="6" class="text-end py-3 px-4">
                                            <button class="btn btn-sm btn-primary shadow-sm" 
                                                onclick="event.stopPropagation(); generateLaporanTerpilih(${JSON.stringify(mk).replace(/"/g, '&quot;')}, ${JSON.stringify(pendaftarMK).replace(/"/g, '&quot;')})">
                                                <i class="bi bi-file-earmark-word me-2"></i>Buat Laporan Asisten Terpilih
                                            </button>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Error refreshing data:", err);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-danger">Terjadi kesalahan saat memuat data pendaftar.</td></tr>';
    }
}

function filterPendaftar() {
    const keyword = document.getElementById("searchPendaftar").value.toLowerCase();
    // Kita filter baris MK saja, baris collapse akan ikut tersembunyi
    const rows = document.querySelectorAll(".mk-row-pendaftar");
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const collapseRow = row.nextElementSibling;
        if (text.includes(keyword)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
            // Jika baris utama disembunyikan, pastikan detailnya juga (jika sedang terbuka)
            if (collapseRow && collapseRow.classList.contains('collapse')) {
                collapseRow.style.display = "none";
            }
        }
    });
}

// Fungsi Toggle Manual (Klik per baris)
function toggleRow(id) {
    const row = document.getElementById(id);
    if (!row) return;
    if (row.style.display === 'none') {
        row.style.display = 'table-row';
        row.classList.add('show'); 
    } else {
        row.style.display = 'none';
        row.classList.remove('show');
    }
}

// Fungsi Expand/Collapse All
function toggleAllDetails(show) {
    const detailRows = document.querySelectorAll(".collapse-row");
    detailRows.forEach(row => {
        if (show) {
            row.style.display = "table-row";
            row.classList.add("show");
        } else {
            row.style.display = "none";
            row.classList.remove("show");
        }
    });
    const masterRows = document.querySelectorAll(".mk-row-pendaftar");
    masterRows.forEach(btn => btn.setAttribute("aria-expanded", show));
}

function konfirmasiAksi(aksi, regId, namaMhs, namaMK, kelas, dataMhs = null, dataMK = null) {
    Swal.fire({
        title: `${aksi} Pendaftar?`,
        html: `Apakah Anda yakin ingin <b>${aksi}</b> <b>${namaMhs}</b> sebagai Asisten <b>${namaMK}</b> Kelas <b>${kelas}</b>?`,
        icon: aksi === 'Terima' ? 'success' : 'warning',
        showCancelButton: true,
        confirmButtonColor: aksi === 'Terima' ? '#198754' : '#dc3545',
        confirmButtonText: `Ya, ${aksi}`,
        cancelButtonText: 'Batal',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            eksekusiKeputusan(aksi, regId, dataMhs, dataMK);
        }
    });
}

async function eksekusiKeputusan(aksi, regId, dataMhs, dataMK) {
    Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        // 1. Update Status di Spreadsheet Calon (GAS 1)
        await fetch(ENDPOINT_PENDAFTARAN, {
            method: "POST",
            body: JSON.stringify({
                action: "updateStatusAsisten",
                regId: regId,
                status: aksi === 'Terima' ? "Diterima" : "Ditolak"
            })
        });

        // 2. Jika Diterima, kirim ke Spreadsheet Terpilih (GAS 2)
        if (aksi === 'Terima') {
            await fetch(ENDPOINT_TERPILIH, { // Pastikan ENDPOINT_TERPILIH ada di config.js
                method: "POST",
                body: JSON.stringify({
                    action: "tambahTerpilih",
                    semester: dataMK.semester,
                    kodeMK: dataMK.kodeMK,
                    namaMK: dataMK.namaMK,
                    kelas: dataMK.kelas,
                    nama: dataMhs.nama,
                    nim: dataMhs.nim,
                    noHP: dataMhs.noHP,
                    email: dataMhs.email
                })
            });
        }

        Swal.fire("Berhasil", `Mahasiswa telah ${aksi === 'Terima' ? 'diterima' : 'ditolak'}.`, "success");
        refreshPendaftar(); // Refresh tabel
    } catch (err) {
        console.error(err);
        Swal.fire("Error", "Terjadi kesalahan saat menyimpan data.", "error");
    }
}

// Buat report asisten terpilih
async function generateLaporanTerpilih(mk, allPendaftar) {
    // 1. Filter hanya mahasiswa yang Diterima
    const terpilih = allPendaftar.filter(p => p.status === "Diterima");

    if (terpilih.length === 0) {
        Swal.fire("Gagal", "Belum ada mahasiswa yang diterima untuk mata kuliah ini.", "warning");
        return;
    }

    Swal.fire({ title: 'Menyiapkan Dokumen...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        // 2. Load Template
        const response = await fetch('template/Template_Asisten_Terpilih.docx');
        const content = await response.arrayBuffer();
        const zip = new PizZip(content);
        const doc = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        // 3. Mapping Data Dosen & Tanggal
        const today = new Date();
        const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        
        const d1 = getNamaDosen(mk.dosen1);
        const d2 = getNamaDosen(mk.dosen2);
        const d3 = getNamaDosen(mk.dosen3);

        // 4. Mapping Placeholder & Tabel
        const dataRender = {
            namaMK: mk.namaMK,
            kodeMK: mk.kodeMK,
            DosenPengampu1: d1,
            DosenPengampu2: d2,
            DosenPengampu3: d3,
            TanggalHari: `${today.getDate()} ${daftarBulan[today.getMonth()]} ${today.getFullYear()}`,
            // Inilah loop untuk tabel di Word
            asistenList: terpilih.map((p, index) => ({
                No: index + 1,
                NIM: p.nim,
                NamaAsisten: p.nama,
                AsistenTutor: mk.namaMK.startsWith("Praktikum") ? "Asisten Praktikum" : "Tutor",
                NamaMK: mk.namaMK,
                Kelas: mk.kelas,
                DosenPengampu1: d1,
                DosenPengampu2: d2,
                DosenPengampu3: d3
            }))
        };

        // 5. Render
        doc.render(dataRender);
        const out = doc.getZip().generate({ 
            type: "blob", 
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
        });

        // 6. Download
        saveAs(out, `Laporan_Terpilih_${mk.namaMK}_${mk.kelas}.docx`);
        Swal.close();

    } catch (error) {
        console.error(error);
        Swal.fire("Error", "Gagal mengenerate laporan. Pastikan folder template dan library docxtemplater sudah benar.", "error");
    }
}