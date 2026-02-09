async function initMonitorAsisten() {
    const container = document.getElementById("monitorContent");
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    const emailDosen = user.email;

    if (!container) return;

    // Reset view & Loading state
    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Sinkronisasi data pengampu & logbook...</p>
        </div>`;

    try {
        const [resMK, resPendaftaran] = await Promise.all([
            fetch(ENDPOINT_MK),
            fetch(ENDPOINT_PENDAFTARAN)
        ]);

        const allMK = await resMK.json();
        const allAsisten = await resPendaftaran.json();

        // Filter MK yang diampu dosen login
        const myMK = allMK.filter(mk => 
            mk.emailDosen1 === emailDosen || mk.emailDosen2 === emailDosen || mk.emailDosen3 === emailDosen ||
            emailDosen === "calvin.wijaya@mail.ugm.ac.id"
        );

        if (myMK.length === 0) {
            container.innerHTML = `<div class="col-12 text-center py-5 text-muted">Anda belum memiliki jadwal mata kuliah pengampu.</div>`;
            return;
        }

        renderCards(myMK, allAsisten);
        setupReviuListener();

        } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="alert alert-danger col-12">Gagal menyegarkan data. Periksa koneksi internet.</div>`;
    }
}

function renderCards(myMK, allAsisten) {
    const container = document.getElementById("monitorContent");
    container.innerHTML = myMK.map(mk => {
        const asistenMK = allAsisten.filter(a => a.kodeMK === mk.kodeMK && a.kelas === mk.kelas && a.status === "Diterima");
        return `
        <div class="col-md-6 monitor-card" data-nama="${mk.namaMK.toLowerCase()}">
            <div class="card h-100 shadow-sm border-0 overflow-hidden">
                <div class="card-header bg-white border-bottom py-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <span class="badge bg-primary-subtle text-primary mb-1">${mk.kodeMK}</span>
                            <h5 class="card-title mb-0 fw-bold">${mk.namaMK}</h5>
                        </div>
                        <span class="badge bg-dark">Kelas ${mk.kelas}</span>
                    </div>
                    <small class="text-muted"><i class="bi bi-calendar3 me-1"></i>${mk.hari}, ${mk.jam}</small>
                </div>
                <div class="card-body p-0">
                    <table class="table table-hover align-middle mb-0" style="font-size: 0.9rem;">
                        <thead class="table-light">
                            <tr>
                                <th class="ps-3">Asisten</th>
                                <th class="text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${asistenMK.length > 0 ? asistenMK.map(as => `
                                <tr>
                                    <td class="ps-3">
                                        <div class="fw-bold text-primary">${as.nama}</div>
                                        <div class="text-muted small">${as.nim}</div>
                                    </td>
                                    <td class="text-center pe-3">
                                        <div class="btn-group btn-group-sm">
                                            <button class="btn btn-outline-primary" onclick="lihatLogbook('${as.email}', '${mk.kodeMK}', '${mk.kelas}')" title="Lihat Logbook">
                                                <i class="bi bi-journal-text"></i>
                                            </button>
                                            <button class="btn btn-outline-success" onclick="bukaModalReviu(${JSON.stringify(as).replace(/"/g, '&quot;')}, ${JSON.stringify(mk).replace(/"/g, '&quot;')})" title="Buat Reviu">
                                                <i class="bi bi-chat-left-text"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="2" class="text-center p-3 text-muted italic">Belum ada asisten diterima.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
    }).join('');
}

async function lihatLogbook(email, kodeMK, kelas) {
    const tbody = document.getElementById("bodyLogbookAsisten");
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';
    new bootstrap.Modal(document.getElementById('modalLihatLogbook')).show();

    try {
        const res = await fetch(ENDPOINT_LOGBOOK);
        const allLogs = await res.json();
        const filteredLogs = allLogs.filter(l => l.email === email && l.kodeMK === kodeMK && l.kelas === kelas);

        if (filteredLogs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Belum ada catatan logbook.</td></tr>';
            return;
        }

        tbody.innerHTML = filteredLogs.map(l => `
            <tr>
                <td>${l.tanggal}</td>
                <td class="text-center">${l.mingguKe}</td>
                <td class="text-center small">${l.jam}</td>
                <td>${l.materi}</td>
                <td class="text-center"><span class="badge bg-light text-dark border">${l.jenis === "Praktikum" ? "P" : "T"}</span></td>
                <td class="text-center">${l.kehadiran}</td>
                <td class="text-center">
                    ${l.linkDrive ? `
                        <a href="${l.linkDrive}" target="_blank" class="btn btn-xs btn-info text-white py-0 px-2 shadow-sm" style="font-size: 0.7rem;">
                            <i class="bi bi-eye-fill me-1"></i> Lihat
                        </a>
                    ` : '<span class="text-muted small">-</span>'}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-danger">Gagal memuat logbook.</td></tr>';
    }
}

function bukaModalReviu(dataAsisten, dataMK) {
    document.getElementById('formReviuAsisten').reset();
    
    // Simpan data asisten dan MK ke hidden/data attribute untuk di-post
    document.getElementById('revEmail').value = dataAsisten.email;
    document.getElementById('revNama').value = dataAsisten.nama;
    document.getElementById('revNIM').value = dataAsisten.nim;
    
    // Simpan data MK di object sementara untuk payload
    window.currentReviuMK = dataMK;
    window.currentReviuAsisten = dataAsisten;

    new bootstrap.Modal(document.getElementById('modalBuatReviu')).show();
}

function setupReviuListener() {
    const form = document.getElementById('formReviuAsisten');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSimpanReviu');
        const mk = window.currentReviuMK;
        const as = window.currentReviuAsisten;

        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Menyimpan...`;

        const payload = {
            action: "tambahReviu",
            email: as.email,
            nama: as.nama,
            nim: as.nim,
            noHP: as.noHP,
            semester: mk.semester,
            kodeMK: mk.kodeMK,
            namaMK: mk.namaMK,
            kelas: mk.kelas,
            reviu: document.getElementById('revIsi').value
        };

        try {
            await fetch(ENDPOINT_REVIU, { method: "POST", body: JSON.stringify(payload) });
            Swal.fire("Tersimpan", "Reviu kinerja asisten berhasil dicatat.", "success");
            bootstrap.Modal.getInstance(document.getElementById('modalBuatReviu')).hide();
        } catch (err) {
            Swal.fire("Error", "Gagal menghubungi server reviu.", "error");
        } finally {
            btn.disabled = false;
            btn.innerText = "Simpan Reviu";
        }
    };
}

function filterMK() {
    const keyword = document.getElementById("searchMK").value.toLowerCase();
    const cards = document.querySelectorAll(".monitor-card");

    cards.forEach(card => {
        const namaMK = card.getAttribute("data-nama");
        card.style.display = namaMK.includes(keyword) ? "" : "none";
    });
}