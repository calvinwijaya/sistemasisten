function initDaftarAsisten() {
    renderCardMK();
    setupPendaftaranListener();
}

function renderCardMK() {
    const container = document.getElementById("containerDaftarMK");
    if (!container) return;

    fetch(ENDPOINT_MK)
        .then(res => res.json())
        .then(data => {
            allDataMK = data;
            if (!data || data.length === 0) {
                container.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <div class="card border-0 shadow-sm p-5">
                            <i class="bi bi-calendar-x text-muted mb-3" style="font-size: 4rem;"></i>
                            <h5 class="text-dark fw-bold">Pendaftaran Ditutup</h5>
                            <p class="text-muted mx-auto" style="max-width: 500px;">
                                Tidak ada Mata Kuliah yang membuka lowongan Asisten Praktikum/ Tutor 
                                atau periode pendaftaran Asisten Praktikum/ Tutor sudah lewat.
                            </p>
                        </div>
                    </div>`;
                return;
            }

            container.innerHTML = data.map(mk => `
                <div class="col-md-6 col-lg-4 mk-card-item">
                    <div class="card h-100 shadow-sm border-0 card-asisten">
                        <div class="card-header bg-light border-0 py-3">
                            <span class="badge bg-primary mb-2">${mk.kodeMK}</span>
                            <h5 class="card-title mb-0 fw-bold text-dark">${mk.namaMK}</h5>
                        </div>
                        <div class="card-body">
                            <p class="mb-1"><i class="bi bi-layers me-2"></i>Kelas: <strong>${mk.kelas}</strong></p>
                            <p class="mb-1"><i class="bi bi-calendar3 me-2"></i>${mk.hari}, ${mk.jam}</p>
                            <hr>
                            <div class="mb-3 small">
                                <div class="text-muted mb-1">Dosen Pengampu:</div>
                                <div>1. ${getNamaDosen(mk.dosen1)}</div>
                                ${mk.dosen2 ? `<div>2. ${getNamaDosen(mk.dosen2)}</div>` : ''}
                                ${mk.dosen3 ? `<div>3. ${getNamaDosen(mk.dosen3)}</div>` : ''}
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge bg-success-subtle text-success p-2">
                                    <i class="bi bi-people-fill me-1"></i>Kuota: ${mk.kuotaAsisten}
                                </span>
                                <button class="btn btn-outline-primary" onclick="bukaModalDaftar('${mk.semester}', '${mk.kodeMK}', '${mk.namaMK}', '${mk.kelas}', '${mk.hari}', '${mk.jam}')">
                                    Daftar <i class="bi bi-arrow-right ms-1"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join("");
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p class="text-muted small">Periode pendaftaran asisten saat ini belum dibuka atau sedang dalam pemeliharaan.</p>
                </div>`;
        });
}

function bukaModalDaftar(semester, kode, nama, kelas, hari, jam) {
    const titleElement = document.getElementById('modalTitleDaftar');
    if (titleElement) {
        titleElement.textContent = `Form Pendaftaran Asisten - ${nama} Kelas ${kelas}`;
    }
    
    // Isi data MK ke field hidden
    document.getElementById('regSemester').value = semester;
    document.getElementById('regKodeMK').value = kode;
    document.getElementById('regNamaMK').value = nama;
    document.getElementById('regKelas').value = kelas;
    document.getElementById('regHari').value = hari;
    document.getElementById('regJam').value = jam;

    // Isi data diri dari Session Storage
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    document.getElementById('regEmail').value = user.email || "";
    document.getElementById('regNama').value = user.nama || "";
    document.getElementById('regNIM').value = user.nim || "";

    const modal = new bootstrap.Modal(document.getElementById('modalDaftarAsisten'));
    modal.show();
}

function setupPendaftaranListener() {
    const form = document.getElementById('formDaftarAsisten');
    if (!form) return;

    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const submitBtn = newForm.querySelector('button[type="submit"]');
        const userEmail = document.getElementById('regEmail').value;

        const namaMK = document.getElementById('regNamaMK').value;
        const kelas = document.getElementById('regKelas').value;
        const hari = document.getElementById('regHari').value;
        const jam = document.getElementById('regJam').value;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Mengecek kuota...';

        try {
            const response = await fetch(ENDPOINT_PENDAFTARAN);
            const daftarPendaftar = await response.json();
            const pendaftaranSaya = daftarPendaftar.filter(p => p.email === userEmail);
            const kodeMKBaru = document.getElementById('regKodeMK').value;
            const kelasBaru = document.getElementById('regKelas').value;
            
            const sudahDaftarKelasIni = pendaftaranSaya.some(p => p.kodeMK === kodeMKBaru && p.kelas === kelasBaru);
            
            if (sudahDaftarKelasIni) {
                Swal.fire({
                    title: "Gagal!",
                    text: "Anda sudah terdaftar di Mata Kuliah dan Kelas ini.",
                    icon: "error"
                });
                resetButton(submitBtn);
                return;
            }

            const daftarMKUnik = [...new Set(pendaftaranSaya.map(p => p.kodeMK))];
            const isMKBaru = !daftarMKUnik.includes(kodeMKBaru);
            if (isMKBaru && daftarMKUnik.length >= 2) {
                Swal.fire({
                    title: "Batas Pendaftaran Tercapai",
                    text: "Anda sudah mendaftar asisten di 2 mata kuliah lain. Lakukan pembatalan terlebih dahulu di tab Lihat Status lalu mendaftar di mata kuliah baru.",
                    icon: "warning",
                    confirmButtonColor: "#0d6efd"
                });
                submitBtn.disabled = false;
                submitBtn.innerHTML = "Kirim Pendaftaran";
                resetButton(submitBtn);
                return;
            }
            const jadwalBentrok = pendaftaranSaya.find(p => p.hari === hari && p.jam === jam);
            if (jadwalBentrok) {
                Swal.fire({
                    title: "Jadwal Bentrok!",
                    html: `Anda tidak bisa mendaftar karena jadwal bentrok dengan mata kuliah yang sudah Anda daftar sebelumnya:<br><br><b>${jadwalBentrok.namaMK} (Kelas ${jadwalBentrok.kelas})</b><br>Jadwal: ${jadwalBentrok.hari}, ${jadwalBentrok.jam}`,
                    icon: "error"
                });
                resetButton(submitBtn);
                return;
            }

            Swal.fire({
                title: 'Konfirmasi Pendaftaran',
                html: `Apakah Anda yakin untuk melakukan pendaftaran sebagai asisten untuk mata kuliah <b>${namaMK}</b> kelas <b>${kelas}</b> dengan jadwal hari <b>${hari}</b>, Jam <b>${jam}</b>?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#0d6efd',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Ya, Daftar Sekarang',
                cancelButtonText: 'Batal',
                reverseButtons: true
            }).then((result) => {
                if (result.isConfirmed) {
                    prosesKirimData(newForm);
                } else {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = "Kirim Pendaftaran";
                }
            });
        } catch (err) {
                console.error(err);
                Swal.fire("Error", "Gagal memvalidasi data. Coba lagi nanti.", "error");
                submitBtn.disabled = false;
                submitBtn.innerHTML = "Kirim Pendaftaran";
        }
    });
}

function prosesKirimData(formElement) {
    const submitBtn = formElement.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Memproses...';

    const payload = {
        action: "daftarAsisten",
        email: document.getElementById('regEmail').value,
        nama: document.getElementById('regNama').value,
        nim: document.getElementById('regNIM').value,
        noHP: document.getElementById('regHP').value,
        semester: document.getElementById('regSemester').value,
        kodeMK: document.getElementById('regKodeMK').value,
        namaMK: document.getElementById('regNamaMK').value,
        kelas: document.getElementById('regKelas').value,
        hari: document.getElementById('regHari').value,
        jam: document.getElementById('regJam').value,
        nilaiTeori: document.getElementById('regNilaiTeori').value,
        nilaiPrak: document.getElementById('regNilaiPrak').value
    };

    fetch(ENDPOINT_PENDAFTARAN, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload)
    })
    .then(() => {
        Swal.fire({
            title: "Berhasil!",
            text: "Pendaftaran Anda telah terkirim ke sistem.",
            icon: "success",
            confirmButtonColor: "#0d6efd"
        });

        formElement.reset();
        const modalEl = document.getElementById('modalDaftarAsisten');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
    
    })
    .catch(err => {
        console.error(err);
        Swal.fire("Error", "Gagal mengirim pendaftaran.", "error");
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Kirim Pendaftaran";
    });
}

// Fungsi Filter MK
let allDataMK = [];
function filterMK() {
    const keyword = document.getElementById("searchMK").value.toLowerCase();
    const cards = document.querySelectorAll(".mk-card-item");

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(keyword) ? "" : "none";
    });
}

// Fungsi Refresh Data
function refreshDataAsisten() {
    const container = document.getElementById("containerDaftarMK");
    container.innerHTML = `<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Memperbarui data...</p></div>`;
    renderCardMK();
}

// Fungsi pembantu untuk mengembalikan tombol
function resetButton(btn) {
    btn.disabled = false;
    btn.innerHTML = "Kirim Pendaftaran";
}