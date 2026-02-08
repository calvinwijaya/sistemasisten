function initLihatStatus() {
    renderStatusPendaftaran();
    setupEditListener();
}

function renderStatusPendaftaran() {
    const container = document.getElementById("containerStatusMK");
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    if (!container) return;

    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;"></div>
            <p class="mt-2">Memuat Data...</p>
        </div>`;

    fetch(ENDPOINT_PENDAFTARAN)
        .then(res => res.json())
        .then(data => {
            // Filter pendaftaran milik user yang sedang login
            const myRegistration = data.filter(item => item.email === user.email);

            if (myRegistration.length === 0) {
                container.innerHTML = `
                    <div class="col-12 text-center text-muted py-5">
                        <i class="bi bi-folder2-open display-1"></i>
                        <p class="mt-3">Anda belum mendaftar di mata kuliah manapun.</p>
                    </div>`;
                return;
            }

            tampilkanPengumuman(myRegistration);

            container.innerHTML = myRegistration.map(reg => {
                let statusHtml = '';
                let isActionDisabled = false;

                const currentStatus = (reg.status || "").trim();

                if (currentStatus === "Diterima") {
                    statusHtml = `
                        <div class="alert alert-success py-2 mb-3 small border-0 shadow-sm">
                            <i class="bi bi-check-circle-fill me-2"></i><strong>Status:</strong> Lolos Seleksi
                        </div>`;
                    isActionDisabled = true;
                } else if (currentStatus === "Ditolak") {
                    statusHtml = `
                        <div class="alert alert-danger py-2 mb-3 small border-0 shadow-sm">
                            <i class="bi bi-x-circle-fill me-2"></i><strong>Status:</strong> Tidak Lolos Seleksi
                        </div>`;
                    isActionDisabled = true;
                } else {
                    statusHtml = `
                        <div class="alert alert-info py-2 mb-3 small">
                            <i class="bi bi-hourglass-split me-2"></i><strong>Status:</strong> Menunggu Seleksi oleh Dosen Pengampu
                        </div>`;
                }

                return `
                <div class="col-md-6">
                    <div class="card h-100 shadow-sm border-0 overflow-hidden">
                        <div class="card-header ${currentStatus === 'Diterima' ? 'bg-success' : (currentStatus === 'Ditolak' ? 'bg-danger' : 'bg-dark')} text-white py-3">
                            <span class="badge bg-white text-dark mb-2">${reg.kodeMK}</span>
                            <h5 class="card-title mb-0">${reg.namaMK}</h5>
                        </div>
                        <div class="card-body d-flex flex-column">
                            <div class="row small mb-3">
                                <div class="col-6"><strong>Kelas:</strong> ${reg.kelas}</div>
                                <div class="col-6"><strong>Jadwal:</strong> ${reg.hari}, ${reg.jam}</div>
                            </div>

                            ${statusHtml}

                            <div class="mt-auto pt-3">
                                <div class="d-grid gap-3 d-md-flex mb-3 ${isActionDisabled ? 'd-none' : ''}">
                                    <button class="btn btn-sm btn-outline-primary flex-grow-1 py-2" 
                                        onclick="bukaModalEdit('${reg.regId}', '${reg.email}', '${reg.nama}', '${reg.nim}', '${reg.noHP}', '${reg.nilaiTeori}', '${reg.nilaiPrak}')"
                                        ${isActionDisabled ? 'disabled' : ''}>
                                        <i class="bi bi-pencil-square me-1"></i> Edit Pendaftaran
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger flex-grow-1 py-2" 
                                        onclick="hapusPendaftaran('${reg.regId}', '${reg.namaMK}')"
                                        ${isActionDisabled ? 'disabled' : ''}>
                                        <i class="bi bi-trash me-1"></i> Hapus
                                    </button>
                                </div>

                                <div class="d-grid ${isActionDisabled ? '' : 'd-none'}">
                                    <button class="btn btn-sm ${currentStatus === 'Diterima' ? 'btn-success' : 'btn-danger'} w-100 py-2 shadow-sm" 
                                        onclick="ulangPengumuman('${reg.status}', '${reg.namaMK}', '${reg.kelas}')">
                                        <i class="bi bi-megaphone me-1"></i> Buka Pengumuman
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join("");
        });
}

function tampilkanPengumuman(registrations) {
    const decided = registrations.filter(reg => reg.status === "Diterima" || reg.status === "Ditolak");
    if (decided.length === 0) return;
    const sessionKey = 'global_notif_shown';
    if (sessionStorage.getItem(sessionKey)) return;

    let htmlContent = "";

    decided.forEach(reg => {
        if (reg.status === "Diterima") {
            htmlContent += `
                <div class="alert alert-success text-start mb-2">
                    <i class="bi bi-check-circle-fill me-2"></i>
                    <b>Lolos:</b> ${reg.namaMK} (Kelas ${reg.kelas})
                </div>`;
        } else {
            htmlContent += `
                <div class="alert alert-danger text-start mb-2">
                    <i class="bi bi-x-circle-fill me-2"></i>
                    <b>Tidak Lolos:</b> ${reg.namaMK} (Kelas ${reg.kelas})
                </div>`;
        }
    });

    const anyAccepted = decided.some(reg => reg.status === "Diterima");

    Swal.fire({
        title: 'Update Status Pendaftaran',
        html: `
            <p>Berikut adalah hasil seleksi asisten Anda:</p>
            ${htmlContent}
            ${anyAccepted ? '<hr><p class="small">Selamat bagi yang lolos! Silakan scan QR Code atau klik tombol di bawah kartu MK untuk bergabung ke grup koordinasi.</p>' : '<hr><p class="small text-muted">Tetap semangat dan coba lagi di kesempatan berikutnya!</p>'}
        `,
        icon: anyAccepted ? 'success' : 'info',
        confirmButtonText: 'Tutup',
        confirmButtonColor: '#0d6efd'
    });

    sessionStorage.setItem(sessionKey, 'true');
}

function ulangPengumuman(status, namaMK, kelas) {
    if (status === "Diterima") {
        Swal.fire({
            title: 'Informasi Kelolosan',
            html: `Selamat! Anda terdaftar sebagai asisten <b>${namaMK}</b> Kelas <b>${kelas}</b>.<br><br>Silakan bergabung ke grup koordinasi melalui QR Code berikut:`,
            icon: 'success',
            imageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://chat.whatsapp.com/LINK_GRUP_ANDA',
            imageWidth: 150,
            imageHeight: 150,
            confirmButtonText: 'Tutup'
        });
    } else {
        Swal.fire({
            title: 'Informasi Seleksi',
            html: `Anda dinyatakan tidak lolos untuk mata kuliah <b>${namaMK}</b> Kelas <b>${kelas}</b>.<br>Terima kasih atas partisipasi Anda.`,
            icon: 'info',
            confirmButtonText: 'Tutup'
        });
    }
}

function bukaModalEdit(id, email, nama, nim, hp, teori, prak) {
    document.getElementById('editRegId').value = id;
    document.getElementById('editEmail').value = email;
    document.getElementById('editNama').value = nama;
    document.getElementById('editNIM').value = nim;
    document.getElementById('editHP').value = hp;
    document.getElementById('editNilaiTeori').value = teori;
    document.getElementById('editNilaiPrak').value = prak;

    const modal = new bootstrap.Modal(document.getElementById('modalEditPendaftaran'));
    modal.show();
}

function setupEditListener() {
    const form = document.getElementById('formEditAsisten');
    if (!form) return;

    form.onsubmit = function(e) {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = "Menyimpan...";

        const payload = {
            action: "updateAsisten",
            regId: document.getElementById('editRegId').value,
            noHP: document.getElementById('editHP').value,
            nilaiTeori: document.getElementById('editNilaiTeori').value,
            nilaiPrak: document.getElementById('editNilaiPrak').value
        };

        fetch(ENDPOINT_PENDAFTARAN, {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(() => {
            Swal.fire("Berhasil", "Data pendaftaran telah diperbarui", "success");
            bootstrap.Modal.getInstance(document.getElementById('modalEditPendaftaran')).hide();
            initLihatStatus();
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Simpan Perubahan";
        });
    };
}

function hapusPendaftaran(id, namaMK) {
    Swal.fire({
        title: 'Hapus Pendaftaran?',
        text: `Apakah Anda yakin ingin membatalkan pendaftaran pada mata kuliah ${namaMK}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Sedang Menghapus...',
                html: 'Mohon tunggu sebentar.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            fetch(ENDPOINT_PENDAFTARAN, {
                method: "POST",
                body: JSON.stringify({ action: "deleteAsisten", regId: id })
            })
            .then(res => res.json())
            .then(() => {
                Swal.fire({
                    title: "Dihapus!",
                    text: "Pendaftaran telah berhasil dibatalkan.",
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
                initLihatStatus();
            })
            .catch(err => {
                console.error(err);
                Swal.fire("Error", "Gagal menghapus data pendaftaran.", "error");
            });
        }
    });
}