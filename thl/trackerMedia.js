let currentUserEmail = "";
let currentRole = "";
let currentNamaPanggilan = "";
let rawTrackerData = [];
let chartTargetInstance = null;
let chartJenisInstance = null;
let chartSosmedInstance = null;
let chartBebanInstance = null;
let filterState = { dosenPesanan: false, dosenQC: false, thlDesain: false, thlCopy: false };

async function initTrackerMedia() {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    currentUserEmail = user.email;
    currentRole = sessionStorage.getItem("role");

    const container = document.getElementById("trackerMediaContent");
    container.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2">Menyiapkan workspace...</p>
        </div>`;

    if (currentRole === "thl") {
        try {
            const res = await fetch(ENDPOINT_THL_TERPILIH).then(r => r.json());
            const myJobs = res.data.filter(row => row[5]?.toString().toLowerCase() === currentUserEmail.toLowerCase());
            currentNamaPanggilan = myJobs.length > 0 ? (myJobs[0][6] || currentUserEmail.split('@')[0]) : currentUserEmail.split('@')[0];
        } catch (e) {
            currentNamaPanggilan = currentUserEmail.split('@')[0];
        }
    }

    if (currentRole === "dosen" || (typeof ADMIN_EMAILS !== 'undefined' && ADMIN_EMAILS.includes(currentUserEmail))) {
        document.getElementById("btnBuatPesanan").classList.remove("d-none");
    } else {
        document.getElementById("btnBuatPesanan").classList.add("d-none");
    }

    const notifDropdown = document.getElementById('dropdownNotifArea');
    if(notifDropdown) {
        notifDropdown.addEventListener('hidden.bs.dropdown', function () {
            const badge = document.getElementById("badgeNotifMedia");
            if(badge) badge.style.display = "none";
        });
    }

    // Inisialisasi Tombol Filter berdasarkan Role
    const filterArea = document.getElementById("filterRoleArea");
    if (currentRole === "dosen") {
        filterArea.innerHTML = `
            <button class="btn btn-sm btn-outline-primary" id="btnFiltDosenPesanan" onclick="toggleFilter('dosenPesanan')">Pesanan Saya</button>
            <button class="btn btn-sm btn-outline-warning text-dark" id="btnFiltDosenQC" onclick="toggleFilter('dosenQC')">Perlu QC Saya</button>`;
    } else if (currentRole === "thl") {
        filterArea.innerHTML = `
            <button class="btn btn-sm btn-outline-info text-dark" id="btnFiltThlDesain" onclick="toggleFilter('thlDesain')">Desain Saya</button>
            <button class="btn btn-sm btn-outline-success" id="btnFiltThlCopy" onclick="toggleFilter('thlCopy')">Copywriting Saya</button>`;
    }

    fetchTrackerData(true);
    setupEventListeners(); // Mencegah double event listener
}

// 1. MENCEGAH DOUBLE POST: Daftarkan Listener Sekali Saja di Awal
function setupEventListeners() {
    const formPesanan = document.getElementById("formPesananDesain");
    // Hapus listener lama jika ada (untuk keamanan SPA)
    const newFormPesanan = formPesanan.cloneNode(true);
    formPesanan.parentNode.replaceChild(newFormPesanan, formPesanan);
    
    newFormPesanan.addEventListener("submit", function(e) {
        e.preventDefault();
        const btn = document.getElementById("btnSubmitPesanan");
        btn.disabled = true;
        
        const mode = btn.getAttribute("data-mode"); // "create" atau "edit"
        const orderId = btn.getAttribute("data-order-id");

        const payload = {
            action: mode === "create" ? "createOrder" : "editOrder",
            data: {
                jenisKonten: document.getElementById("tmdJenis").value,
                judul: document.getElementById("tmdJudul").value,
                detail: document.getElementById("tmdDetail").value,
                linkDokumentasi: document.getElementById("tmdDokumentasi").value
            }
        };

        if (mode === "create") {
            const namaUser = JSON.parse(sessionStorage.getItem("user")).nama;
            payload.data.pemberiOrder = getKodeDosenByNama(namaUser);
            const d = new Date();
            payload.data.tanggal = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
        } else {
            payload.orderId = orderId;
        }

        Swal.fire({ title: mode === "create" ? 'Membuat Pesanan...' : 'Menyimpan Perubahan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        postTrackerAPI(payload, 'modalPesananDesain');
    });

    // ... sisanya bisa dipertahankan seperti biasa karena modal lain tidak di-override dinamis.
}


function fetchTrackerData(showLoading = false) {
    if(showLoading) Swal.fire({ title: 'Memuat...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    fetch(ENDPOINT_TRACKER_MEDIA)
        .then(res => res.json())
        .then(res => {
            if(res.status === "ok") {
                rawTrackerData = res.data;
                renderSemuaUI();
                hitungNotifikasi(rawTrackerData);
                if(showLoading) Swal.close();
            }
        });
}

function renderSemuaUI() {
    const filterBulan = document.getElementById("filterBulanMedia").value;
    const filterTahun = document.getElementById("filterTahunMedia").value;
    const searchJudul = document.getElementById("searchJudulMedia").value.toLowerCase();
    const sortBy = document.getElementById("sortMedia").value; // Ambil nilai dropdown sort
    
    const myKode = getKodeDosenByNama(JSON.parse(sessionStorage.getItem("user")).nama);

    let filteredData = rawTrackerData.filter(r => {
        // 1. Filter Bulan & Tahun
        let dateMatch = false;
        if (filterBulan === "Semua") {
            dateMatch = r.tanggal.includes(filterTahun);
        } else {
            let parts = r.tanggal.split("/");
            if (parts.length === 3) {
                const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                dateMatch = months[parseInt(parts[1]) - 1] === filterBulan && parts[2] == filterTahun;
            }
        }
        if (!dateMatch) return false;

        // 2. Filter Pencarian Judul
        if (searchJudul && !r.judul.toLowerCase().includes(searchJudul)) return false;

        // 3. Filter Tombol State
        if (currentRole === "dosen") {
            if (filterState.dosenPesanan && filterState.dosenQC) {
                return r.pemberiOrder === myKode || r.reviewer === myKode;
            } else if (filterState.dosenPesanan) {
                return r.pemberiOrder === myKode;
            } else if (filterState.dosenQC) {
                return r.reviewer === myKode;
            }
        } else if (currentRole === "thl") {
            if (filterState.thlDesain && filterState.thlCopy) {
                return (r.desainer && r.desainer.includes(currentNamaPanggilan)) || (r.copywriter && r.copywriter.includes(currentNamaPanggilan));
            } else if (filterState.thlDesain) {
                return r.desainer && r.desainer.includes(currentNamaPanggilan);
            } else if (filterState.thlCopy) {
                return r.copywriter && r.copywriter.includes(currentNamaPanggilan);
            }
        }
        
        return true; // Jika tidak ada filter khusus yang menyala
    });

    // Urutkan default by Tanggal Order terbaru (ID)
    filteredData.sort((a, b) => {
        if (sortBy === 'tglOrderDesc') {
            return b.rowIdx - a.rowIdx; // Terbaru (baris terbawah di Sheet) ke Teratas
        } else if (sortBy === 'tglOrderAsc') {
            return a.rowIdx - b.rowIdx; // Terlama (baris teratas di Sheet) ke Terbawah
        } else if (sortBy === 'judulAsc') {
            return a.judul.localeCompare(b.judul); // Judul A - Z
        } else if (sortBy === 'judulDesc') {
            return b.judul.localeCompare(a.judul); // Judul Z - A
        }
        return 0;
    });

    const activeData = filteredData.filter(r => r.status !== "Published");
    const publishedData = filteredData.filter(r => r.status === "Published");

    renderTrackerTable(activeData);
    renderPublishedTable(publishedData);
    renderCharts(publishedData, filterBulan);

    if (currentRole === "dosen") {
        document.getElementById("sectionBebanKerjaDosen").classList.remove("d-none");
        // Kita menggunakan filteredData agar tabel & chartnya menyesuaikan filter bulan/tahun yang sedang aktif
        renderBebanKerjaDosen(filteredData); 
    } else {
        document.getElementById("sectionBebanKerjaDosen").classList.add("d-none");
    }
}

function renderTrackerTable(data) {
    const container = document.getElementById("trackerMediaContent");
    
    // Pesan Kosong Custom berdasarkan Filter
    if (data.length === 0) {
        let msg = "Belum ada pesanan desain aktif.";
        if(filterState.dosenPesanan && filterState.dosenQC) msg = "Belum ada pesanan yang Anda buat dan desain yang perlu Anda QC.";
        else if(filterState.dosenPesanan) msg = "Belum ada pesanan yang Anda buat.";
        else if(filterState.dosenQC) msg = "Belum ada desain yang perlu Anda QC.";
        else if(filterState.thlDesain) msg = "Belum ada desain yang Anda kerjakan.";
        else if(filterState.thlCopy) msg = "Belum ada copywriting yang Anda kerjakan.";
        
        container.innerHTML = `<div class="alert alert-warning text-center">${msg}</div>`;
        return;
    }

    let html = `
    <div class="table-responsive bg-white rounded shadow-sm border">
        <table class="table align-middle mb-0">
            <thead class="tracker-header text-white" style="background-color: #165cc4 !important; font-size: 0.85rem;">
                <tr class="align-middle text-center">
                    <th width="5%" class="py-3">NO</th>
                    <th width="15%" class="text-start">JENIS KONTEN</th>
                    <th width="20%" class="text-start">JUDUL KONTEN</th>
                    <th width="15%">LINK DESAIN</th>
                    <th width="15%">PLATFORM SOSMED</th> 
                    <th width="30%" class="text-start">STATUS & TRACKER</th>
                </tr>
            </thead>
            <tbody>`;

    data.forEach((row, index) => {
        // Render Badge Sosmed Berwarna
        let sosmedHtml = '-';
        if (row.medsos) {
            const smColors = {"IG": "bg-danger", "YT": "bg-danger", "FB": "bg-primary", "Tiktok": "bg-dark", "Website": "bg-info text-dark", "Cetak": "bg-secondary", "E-Mail": "bg-warning text-dark"};
            sosmedHtml = row.medsos.split(", ").map(s => `<span class="badge ${smColors[s] || 'bg-secondary'} me-1 mb-1">${s}</span>`).join('');
        }

        html += `
        <tr>
            <td class="text-center fw-bold">${index + 1}</td>
            <td><span class="badge ${getBadgeColor(row.jenisKonten)}">${row.jenisKonten}</span></td>
            <td class="fw-semibold">${row.judul}</td>
            <td class="text-center">
                ${row.linkDesain ? `<a href="${row.linkDesain}" target="_blank" class="btn btn-sm btn-outline-info"><i class="bi bi-link-45deg"></i> Link</a>` : '-'}
            </td>
            <td class="text-center">${sosmedHtml}</td>
            <td class="py-3">
                ${generateAksiStatus(row)}
                ${generateStepper(row)}
            </td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

// 2. FUNGSI AKSI: Tambah tombol Mata (Detail) dan Teks Desainer
function generateAksiStatus(row) {
    // Memberikan warna badge otomatis agar lebih intuitif
    let badgeColor = "bg-dark";
    if (row.status.includes("Revisi")) badgeColor = "bg-danger";
    else if (row.status === "QC") badgeColor = "bg-warning text-dark";
    else if (row.status === "Published") badgeColor = "bg-success";
    
    let badge = `<span class="badge ${badgeColor} mb-2">${row.status}</span>`;
    let aksiHtml = "";
    
    let btnMata = `<button class="btn btn-sm btn-outline-secondary me-1" title="Lihat Arahan" onclick="bukaModalDetail('${row.orderId}')"><i class="bi bi-info-circle"></i></button>`;
    
    let btnEdit = "";
    const myKode = getKodeDosenByNama(JSON.parse(sessionStorage.getItem("user")).nama);
    if (currentRole === "dosen" && row.pemberiOrder === myKode && row.status !== "Published") {
        btnEdit = `<button class="btn btn-sm btn-outline-primary me-1" title="Edit Pesanan" onclick="editPesanan('${row.orderId}')"><i class="bi bi-pencil"></i></button>`;
    }

    if (currentRole === "thl") {
        if (row.status === "Request") {
            aksiHtml = `<button class="btn btn-sm btn-primary" onclick="terimaTugas('${row.orderId}', 'Desainer')">Terima Desain</button>`;
        } 
        // 1. TAHAP DESAIN (Termasuk Revisi Desain & Revisi Keduanya)
        else if (row.status === "On Process" || row.status === "Revisi Desain" || row.status === "Revision") {
            if (row.desainer && row.desainer.includes(currentNamaPanggilan)) {
                aksiHtml = `<button class="btn btn-sm btn-info" onclick="bukaModalDraft('${row.orderId}')">Unggah Desain</button>`;
            } else {
                aksiHtml = `<button class="btn btn-sm btn-outline-primary" onclick="terimaTugas('${row.orderId}', 'Desainer')"><i class="bi bi-plus-circle me-1"></i>Ikut Desain</button>`;
            }
        } 
        else if (row.status === "Wait Copywrite") {
            aksiHtml = `<button class="btn btn-sm btn-secondary" onclick="terimaTugas('${row.orderId}', 'Copywriter')">Terima Copywriting</button>`;
        } 
        // 2. TAHAP COPYWRITE (Termasuk Revisi Caption)
        else if (row.status === "Copywrite" || row.status === "Revisi Caption") {
            if (row.copywriter && row.copywriter.includes(currentNamaPanggilan)) {
                aksiHtml = `<button class="btn btn-sm btn-warning text-dark" onclick="bukaModalCopywrite('${row.orderId}')">Unggah Caption</button>`;
            } else {
                aksiHtml = `<button class="btn btn-sm btn-outline-secondary" onclick="terimaTugas('${row.orderId}', 'Copywriter')"><i class="bi bi-plus-circle me-1"></i>Ikut Copywrite</button>`;
            }
        } 
        else if (row.status === "Publication") {
            aksiHtml = `<button class="btn btn-sm btn-dark" onclick="bukaModalPublikasi('${row.orderId}')">Publikasi Konten</button>`;
        }
    } 
    else if (currentRole === "dosen") {
        if (row.status === "Request" && row.pemberiOrder === myKode) {
            aksiHtml = `<button class="btn btn-sm btn-outline-danger" title="Hapus" onclick="hapusPesanan('${row.orderId}')"><i class="bi bi-trash"></i></button>`;
        } 
        else if (row.status === "QC") {
            if(row.reviewer === myKode || row.pemberiOrder === myKode) {
                aksiHtml = `<button class="btn btn-sm btn-warning text-dark" onclick="bukaModalQC('${row.orderId}')">Cek QC</button>`;
            } else {
                aksiHtml = `<span class="small text-muted fst-italic">Menunggu QC dari ${row.reviewer}</span>`;
            }
        }
    }

    let picInfo = "";
    if (row.desainer && ["On Process", "Revisi Desain", "Revision"].includes(row.status)) {
        picInfo = `<div class="small mt-1 text-primary"><i class="bi bi-palette me-1"></i>${row.desainer}</div>`;
    } else if (row.copywriter && ["Copywrite", "Revisi Caption"].includes(row.status)) {
        picInfo = `<div class="small mt-1 text-success"><i class="bi bi-pen me-1"></i>${row.copywriter}</div>`;
    }

    // Tampilkan catatan dosen di semua state revisi
    if(row.catatanRevisi && row.status.includes("Revisi")) {
        picInfo += `<div class="small text-danger mt-1 fw-bold">Note QC: ${row.catatanRevisi}</div>`;
    }

    return `<div class="mb-2">${badge}<br><div class="d-flex align-items-center mt-1">${btnMata}${btnEdit}${aksiHtml}</div>${picInfo}</div>`;
}

function generateStepper(row) {
    const stepNames = [`Request`, `Desain`, `Copywrite`, `QC`, `Publikasi`, `<span class="${row.status === 'Published' ? 'text-warning' : 'text-success'} fw-bold"><i class="bi bi-stars"></i>Published</span>`];
    const stepIcons = ['<i class="bi bi-1-circle"></i>', '<i class="bi bi-2-circle"></i>', '<i class="bi bi-3-circle"></i>', '<i class="bi bi-4-circle"></i>', '<i class="bi bi-5-circle"></i>', `<i class="bi bi-patch-check-fill ${row.status === 'Published' ? 'text-warning' : 'text-success'}" style="font-size: 1.4rem;"></i>`]; 

    let uiStep = 0;
    if(["On Process", "Revisi Desain", "Revision"].includes(row.status)) uiStep = 1;
    if(["Wait Copywrite", "Copywrite", "Revisi Caption"].includes(row.status)) uiStep = 2;
    if(row.status === "QC") uiStep = 3;
    if(row.status === "Publication") uiStep = 4;
    if(row.status === "Published") uiStep = 5;

    let stepperHtml = `<div class="stepper-wrapper">`;
    for(let i=0; i<6; i++) {
        let stateClass = i < uiStep ? "completed" : (i === uiStep ? "active" : "");
        stepperHtml += `
            <div class="stepper-item ${stateClass}">
                <div class="step-counter ${i===5 ? 'border-0 bg-transparent' : ''}">${stepIcons[i]}</div>
                <div class="step-name">${stepNames[i]}</div>
            </div>`;
    }
    return stepperHtml + `</div>`;
}

// --- FUNGSI OPERASIONAL DOSEN ---
// FUNGSI TOGGLE FILTER
window.toggleFilter = function(tipe) {
    filterState[tipe] = !filterState[tipe];
    
    // Update visual tombol
    const btnMap = { 
        'dosenPesanan': { id: 'btnFiltDosenPesanan', classAktif: 'btn-primary', classPasif: 'btn-outline-primary' },
        'dosenQC': { id: 'btnFiltDosenQC', classAktif: 'btn-warning', classPasif: 'btn-outline-warning' },
        'thlDesain': { id: 'btnFiltThlDesain', classAktif: 'btn-info', classPasif: 'btn-outline-info' },
        'thlCopy': { id: 'btnFiltThlCopy', classAktif: 'btn-success', classPasif: 'btn-outline-success' }
    };
    
    const btn = document.getElementById(btnMap[tipe].id);
    if (filterState[tipe]) {
        btn.classList.remove(btnMap[tipe].classPasif); btn.classList.add(btnMap[tipe].classAktif);
        if(tipe==='dosenQC' || tipe==='thlDesain') btn.classList.remove('text-dark'); // styling khusus
    } else {
        btn.classList.remove(btnMap[tipe].classAktif); btn.classList.add(btnMap[tipe].classPasif);
        if(tipe==='dosenQC' || tipe==='thlDesain') btn.classList.add('text-dark');
    }
    
    renderSemuaUI();
};

window.bukaModalPesanan = function() {
    document.getElementById("formPesananDesain").reset();
    document.getElementById("modalPesananDesain").querySelector(".modal-title").innerText = "Buat Pesanan Desain Baru";
    
    const btn = document.getElementById("btnSubmitPesanan");
    btn.setAttribute("data-mode", "create"); // Memberi tahu setupEventListeners() bahwa ini mode Create
    btn.disabled = false; btn.innerText = "Buat Pesanan";

    new bootstrap.Modal(document.getElementById('modalPesananDesain')).show();
};

window.editPesanan = function(orderId) {
    const row = rawTrackerData.find(r => r.orderId === orderId);
    if (!row) return;

    document.getElementById("tmdJenis").value = row.jenisKonten;
    document.getElementById("tmdJudul").value = row.judul;
    document.getElementById("tmdDetail").value = row.detail;
    document.getElementById("tmdDokumentasi").value = row.linkDokumentasi;

    document.getElementById("modalPesananDesain").querySelector(".modal-title").innerText = "Edit Pesanan Desain";
    
    const btn = document.getElementById("btnSubmitPesanan");
    btn.setAttribute("data-mode", "edit"); // Memberi tahu setupEventListeners() bahwa ini mode Edit
    btn.setAttribute("data-order-id", orderId);
    btn.disabled = false; btn.innerText = "Simpan Perubahan";

    new bootstrap.Modal(document.getElementById('modalPesananDesain')).show();
};

window.hapusPesanan = function(orderId) {
    Swal.fire({
        title: 'Hapus Pesanan?', text: "Pesanan yang dihapus tidak dapat dikembalikan.",
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Ya, Hapus'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            postTrackerAPI({ action: "deleteOrder", orderId: orderId }, null);
        }
    });
};

// --- FUNGSI OPERASIONAL THL ---
window.bukaModalDetail = function(orderId) {
    const row = rawTrackerData.find(r => r.orderId === orderId);
    if (!row) return;
    
    // Reset Form & State
    document.getElementById("formEditDetail").reset();
    document.getElementById("detOrderId").value = orderId;
    const btnSimpan = document.getElementById("btnSimpanDetail");
    btnSimpan.classList.add("d-none");
    let statusAkses = "Hanya Lihat";
    let isEditing = false;

    // Isi Info Statis
    document.getElementById("detTanggal").textContent = row.tanggal;
    document.getElementById("detPemberi").textContent = row.pemberiOrder;
    document.getElementById("detDesainer").textContent = row.desainer || "-";
    document.getElementById("detCopywriter").textContent = row.copywriter || "-";
    document.getElementById("detReviewer").textContent = row.reviewer || "-";

    // Isi Data Form
    document.getElementById("detJenis").value = row.jenisKonten;
    document.getElementById("detJudul").value = row.judul;
    document.getElementById("detArahan").value = row.detail;
    document.getElementById("detDokumenLink").value = row.linkDokumentasi;
    document.getElementById("detLinkDesain").value = row.linkDesain;
    document.getElementById("detMedsos").value = row.medsos;
    document.getElementById("detCaption").value = row.caption;

    // Logika Disable/Enable Field berdasarkan Role & Status
    const fieldsDosen = document.querySelectorAll(".det-dosen");
    const fieldsDesain = document.querySelectorAll(".det-desain");
    const fieldsCopy = document.querySelectorAll(".det-copy");
    
    fieldsDosen.forEach(f => f.disabled = true);
    fieldsDesain.forEach(f => f.disabled = true);
    fieldsCopy.forEach(f => f.disabled = true);

    const myKode = getKodeDosenByNama(JSON.parse(sessionStorage.getItem("user")).nama);

    if (currentRole === "dosen" && row.pemberiOrder === myKode && row.status !== "Published") {
        fieldsDosen.forEach(f => f.disabled = false);
        isEditing = true; statusAkses = "Akses Edit (Pemberi Tugas)";
    } 
    else if (currentRole === "thl") {
        const isMyDesain = row.desainer && row.desainer.includes(currentNamaPanggilan);
        const isMyCopy = row.copywriter && row.copywriter.includes(currentNamaPanggilan);
        
        // Desainer bisa edit di tahap On Process, Wait Copywrite, Copywrite, atau Revision
        if (isMyDesain && ["On Process", "Wait Copywrite", "Copywrite", "Revision"].includes(row.status)) {
            fieldsDesain.forEach(f => f.disabled = false);
            isEditing = true; statusAkses = "Akses Edit (Desainer)";
        }
        // Copywriter bisa edit di tahap Copywrite
        if (isMyCopy && row.status === "Copywrite") {
            fieldsCopy.forEach(f => f.disabled = false);
            isEditing = true; statusAkses = "Akses Edit (Copywriter)";
        }
    }

    if (isEditing) btnSimpan.classList.remove("d-none");
    document.getElementById("detStatusAkses").textContent = statusAkses;

    // Handle Link Desain Button
    const btnBuka = document.getElementById("btnBukaDesain");
    if(row.linkDesain) {
        btnBuka.href = row.linkDesain; btnBuka.classList.remove("disabled");
    } else {
        btnBuka.href = "#"; btnBuka.classList.add("disabled");
    }

    // Tampilkan Catatan QC jika ada
    if(row.catatanRevisi) {
        document.getElementById("areaCatatanQC").classList.remove("d-none");
        document.getElementById("detCatatanQC").textContent = row.catatanRevisi;
    } else {
        document.getElementById("areaCatatanQC").classList.add("d-none");
    }

    new bootstrap.Modal(document.getElementById('modalDetailPesanan')).show();
};

document.getElementById("formEditDetail").addEventListener("submit", function(e) {
    e.preventDefault();
    Swal.fire({ title: 'Menyimpan Perubahan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    // Kirim semua data, backend hanya akan memproses yang dikirim sesuai kebutuhan (UpdateStatus universal)
    const payload = {
        action: currentRole === "dosen" ? "editOrder" : "updateStatus",
        orderId: document.getElementById("detOrderId").value,
    };

    if (currentRole === "dosen") {
        payload.data = {
            jenisKonten: document.getElementById("detJenis").value,
            judul: document.getElementById("detJudul").value,
            detail: document.getElementById("detArahan").value,
            linkDokumentasi: document.getElementById("detDokumenLink").value
        };
    } else {
        payload.status = rawTrackerData.find(r => r.orderId === payload.orderId).status; // Pertahankan status
        payload.linkDesain = document.getElementById("detLinkDesain").value;
        payload.medsos = document.getElementById("detMedsos").value;
        payload.caption = document.getElementById("detCaption").value;
    }

    postTrackerAPI(payload, 'modalDetailPesanan');
});

window.terimaTugas = function(orderId, roleType) {
    Swal.fire({ title: 'Memproses...', didOpen: () => Swal.showLoading() });
    postTrackerAPI({ action: "terimaTugas", orderId: orderId, roleType: roleType, namaPIC: currentNamaPanggilan });
};

window.bukaModalDraft = function(orderId) {
    const row = rawTrackerData.find(r => r.orderId === orderId);
    if (!row) return;

    document.getElementById("formUnggahDraft").reset();
    document.getElementById("draftOrderId").value = orderId;
    document.getElementById("draftJudul").value = row.judul;
    if (row.linkDesain) document.getElementById("draftLink").value = row.linkDesain;
    
    const medsosSelect = document.getElementById("draftMedsos");
    Array.from(medsosSelect.options).forEach(opt => opt.selected = false);
    if (row.medsos) {
        const selectedArr = row.medsos.split(", ");
        Array.from(medsosSelect.options).forEach(opt => {
            if (selectedArr.includes(opt.value)) opt.selected = true;
        });
    }

    const selectReviewer = document.getElementById("draftReviewer");
    if (row.reviewer && Array.from(selectReviewer.options).some(opt => opt.value === row.reviewer)) {
        selectReviewer.value = row.reviewer;
    } else if (Array.from(selectReviewer.options).some(opt => opt.value === row.pemberiOrder)) {
        selectReviewer.value = row.pemberiOrder;
    }

    // UBAH TEKS TOMBOL DINAMIS SESUAI STATUS REVISI
    const btnSubmit = document.getElementById("btnSubmitDraft");
    if (row.status === "Revisi Desain") {
        btnSubmit.innerText = "Ajukan Langsung ke QC";
        btnSubmit.className = "btn btn-warning text-dark fw-bold";
    } else if (row.status === "Revision") {
        btnSubmit.innerText = "Lanjut ke Copywriter";
        btnSubmit.className = "btn btn-info fw-bold";
    } else {
        btnSubmit.innerText = "Ajukan Copywrite";
        btnSubmit.className = "btn btn-primary fw-bold";
    }

    new bootstrap.Modal(document.getElementById('modalUnggahDraft')).show();
};

window.bukaModalCopywrite = function(orderId) {
    const row = rawTrackerData.find(r => r.orderId === orderId);
    if (!row) return;

    document.getElementById("formCopywrite").reset();
    document.getElementById("cwOrderId").value = orderId;
    
    // Isi Preview Desain untuk Copywriter
    document.getElementById("cwLinkDesain").href = row.linkDesain || "#";
    document.getElementById("cwMedsos").textContent = row.medsos || "Belum ditentukan";
    
    // Isi otomatis Caption jika sebelumnya sudah ada (kasus Revisi)
    if (row.caption) document.getElementById("cwCaption").value = row.caption;

    new bootstrap.Modal(document.getElementById('modalUnggahCopywrite')).show();
};

window.bukaModalPublikasi = function(orderId) {
    // 1. Cari data baris yang sesuai
    const row = rawTrackerData.find(r => r.orderId === orderId);
    if (!row) return;

    document.getElementById("formPublikasi").reset();
    document.getElementById("pubOrderId").value = orderId;
    
    // 2. Isi area preview untuk publisher
    document.getElementById("pubLinkDesain").href = row.linkDesain || "#";
    document.getElementById("pubMedsos").textContent = row.medsos || "-";
    document.getElementById("pubCaptionView").value = row.caption || "Tidak ada caption.";

    // Set default tanggal hari ini pada input tanggal publikasi (Opsional, agar lebih cepat)
    document.getElementById("pubTanggal").valueAsDate = new Date();

    new bootstrap.Modal(document.getElementById('modalPublikasi')).show();
};

// 6. EVENT LISTENER DRAFT & COPYWRITE (Fix Loading)
document.getElementById("formUnggahDraft").addEventListener("submit", function(e) {
    e.preventDefault();
    
    const orderId = document.getElementById("draftOrderId").value;
    const row = rawTrackerData.find(r => r.orderId === orderId);
    
    // Tentukan Tujuan Berikutnya berdasarkan Status Saat Ini
    let nextStatus = "Wait Copywrite"; // Default (On Process)
    let msgLoading = "Mengajukan Copywrite...";

    if (row.status === "Revisi Desain") {
        nextStatus = "QC"; // Skip copywrite karena hanya desain yang direvisi
        msgLoading = "Mengirim ulang ke QC...";
    } else if (row.status === "Revision") {
        nextStatus = "Copywrite"; // Skip 'Wait Copywrite' langsung ke Copywrite
        msgLoading = "Meneruskan ke Copywriter...";
    }

    const medsosSelect = document.getElementById("draftMedsos");
    const selectedMedsos = Array.from(medsosSelect.selectedOptions).map(opt => opt.value).join(", ");
    
    Swal.fire({ title: msgLoading, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    postTrackerAPI({
        action: "updateStatus", orderId: orderId,
        status: nextStatus, linkDesain: document.getElementById("draftLink").value,
        medsos: selectedMedsos, reviewer: document.getElementById("draftReviewer").value
    }, 'modalUnggahDraft');
});

document.getElementById("formCopywrite").addEventListener("submit", function(e) {
    e.preventDefault();
    Swal.fire({ title: 'Mengajukan ke QC...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    postTrackerAPI({
        action: "updateStatus", orderId: document.getElementById("cwOrderId").value,
        status: "QC", caption: document.getElementById("cwCaption").value
    }, 'modalUnggahCopywrite');
});

window.bukaModalQC = function(orderId) {
    const row = rawTrackerData.find(r => r.orderId === orderId);
    document.getElementById("qcOrderId").value = orderId;
    document.getElementById("qcLinkDesain").href = row.linkDesain;
    document.getElementById("qcMedsos").textContent = row.medsos;
    document.getElementById("qcCaptionView").value = row.caption;
    document.getElementById("qcCatatan").value = "";
    new bootstrap.Modal(document.getElementById('modalReviewQC')).show();
};

window.prosesQC = function(statusTarget) {
    const catatan = document.getElementById("qcCatatan").value;
    if(statusTarget === "Revision" && !catatan.trim()) {
        Swal.fire("Peringatan", "Wajib mengisi catatan jika meminta revisi.", "warning");
        return;
    }
    // 5. TAMBAH LOADING SAAT KLIK TERIMA/REVISI QC
    Swal.fire({ title: statusTarget === 'Publication' ? 'Meneruskan ke Publikasi...' : 'Mengembalikan Revisi...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    postTrackerAPI({
        action: "updateStatus", orderId: document.getElementById("qcOrderId").value,
        status: statusTarget, catatanRevisi: catatan
    }, 'modalReviewQC');
};

document.getElementById("formPublikasi").addEventListener("submit", function(e) {
    e.preventDefault();
    const inputs = document.querySelectorAll(".link-pub-input");
    let links = [];
    inputs.forEach(inp => { if(inp.value.trim()) links.push(inp.value.trim()); });
    
    Swal.fire({ title: 'Mempublikasikan Konten...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    postTrackerAPI({
        action: "updateStatus", orderId: document.getElementById("pubOrderId").value,
        status: "Published", linkPost: links.join(", "), jadwalPublikasi: document.getElementById("pubTanggal").value
    }, 'modalPublikasi');
});

// CORE API CALLER
function postTrackerAPI(payload, modalId) {
    fetch(ENDPOINT_TRACKER_MEDIA, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(res => {
        if(res.status === "ok"){
            if(modalId) bootstrap.Modal.getInstance(document.getElementById(modalId)).hide();
            
            fetch(ENDPOINT_TRACKER_MEDIA).then(r => r.json()).then(r => {
                if(r.status === "ok") {
                    rawTrackerData = r.data;
                    renderSemuaUI();
                    hitungNotifikasi(r.data);
                }
                Swal.fire("Berhasil", res.message, "success");
            });
        } else {
            Swal.fire("Gagal", res.message, "error");
        }
    });
}

// 6. PERBAIKAN NOTIFIKASI
function hitungNotifikasi(data) {
    let notifs = [];
    const namaUser = JSON.parse(sessionStorage.getItem("user")).nama;
    const kodeSaya = getKodeDosenByNama(namaUser); 

    if (currentRole === "thl") {
        // THL lihat Request, Revisi, Wait Copywrite, dan Publikasi
        notifs = data.filter(r => ["Request", "Wait Copywrite", "Publication", "Revisi Desain", "Revisi Caption", "Revision"].includes(r.status));
    } else if (currentRole === "dosen") {
        // Dosen lihat On Process (Terima), QC (Ajukan)
        notifs = data.filter(r => (r.status === "QC" || r.status === "On Process") && r.pemberiOrder === kodeSaya);
    }

    const badge = document.getElementById("badgeNotifMedia");
    const listContent = document.getElementById("listNotifMedia");

    if (notifs.length > 0) {
        badge.style.display = "inline-block";
        badge.textContent = notifs.length;

        let html = "";
        notifs.forEach(n => {
            let msg = "", icon = "", color = "";
            
            if (currentRole === "thl") {
                if(n.status === "Request") { msg = `Pesanan Baru: ${n.pemberiOrder}`; icon = "bi-file-earmark-plus"; color = "text-primary"; }
                else if(n.status === "Wait Copywrite") { msg = `Siap Copywrite: ${n.judul}`; icon = "bi-card-text"; color = "text-secondary"; }
                else if(n.status === "Publication") { msg = `QC Lulus, Siap Publish: ${n.judul}`; icon = "bi-send"; color = "text-success"; }
                else if(n.status.includes("Revisi")) { msg = `Revisi QC: ${n.judul}`; icon = "bi-x-circle"; color = "text-danger"; }
            } else {
                if(n.status === "QC") { msg = `Menunggu QC: ${n.judul}`; icon = "bi-search"; color = "text-warning"; }
                else if(n.status === "On Process") { msg = `Dikerjakan oleh: ${n.desainer}`; icon = "bi-palette"; color = "text-info"; }
            }

            html += `
            <li><div class="dropdown-item border-bottom py-2 text-wrap" style="cursor: default;">
                <div class="small fw-bold ${color}"><i class="bi ${icon} me-1"></i>${msg}</div>
                <div class="small text-muted">Tgl Order: ${n.tanggal}</div>
            </div></li>`;
        });
        listContent.innerHTML = html;
    } else {
        badge.style.display = "none";
        listContent.innerHTML = `<li><span class="dropdown-item text-muted small py-3 text-center">Tidak ada notifikasi baru.</span></li>`;
    }
}

function getKodeDosenByNama(namaUser) {
    const namaPendek = namaUser.split(" ")[0].toLowerCase();
    for (const [kode, namaLengkap] of Object.entries(DOSEN_MAP)) {
        if (namaLengkap.toLowerCase().includes(namaPendek)) return kode; 
    }
    return namaUser.substring(0, 3).toUpperCase();
}

function getBadgeColor(jenis) {
    const colors = { "Feeds/Berita": "bg-primary", "Poster": "bg-danger", "Newsletter": "bg-success", "Video Shorts/Reels": "bg-warning text-dark", "Story": "bg-info text-dark", "Website": "bg-dark", "Video Dokumenter": "bg-secondary", "Cover": "bg-success" };
    return colors[jenis] || "bg-secondary";
}

function renderPublishedTable(data) {
    let html = "";
    data.forEach((r, i) => {
        let linksHtml = r.linkPost.split(",").map((lk, idx) => `<a href="${lk.trim()}" target="_blank" class="badge bg-primary me-1 text-decoration-none">Link ${idx+1}</a>`).join('');
        html += `<tr><td>${i+1}</td><td><span class="badge ${getBadgeColor(r.jenisKonten)}">${r.jenisKonten}</span></td>
        <td>${r.judul}</td><td>${r.jadwalPublikasi}</td><td>${linksHtml}</td></tr>`;
    });
    document.getElementById("bodyTablePublished").innerHTML = html || `<tr><td colspan="5" class="text-center text-muted">Belum ada publikasi.</td></tr>`;
}

function renderCharts(publishedData, filterBulan) {
    document.getElementById("lblTargetChart").textContent = filterBulan === "Semua" ? "Tahun Ini" : filterBulan;
    document.getElementById("lblJenisChart").textContent = filterBulan === "Semua" ? "Tahun Ini" : filterBulan;
    document.getElementById("lblMedsosChart").textContent = filterBulan === "Semua" ? "Tahun Ini" : filterBulan;

    // 1. PENGHITUNGAN BARU: Hitung Total Publikasi berdasarkan jumlah platform Sosmed
    let totalPublikasiSosmed = 0;
    const countsByMedsos = {}; // Objek untuk Bar Chart Medsos

    publishedData.forEach(r => {
        if(r.medsos) {
            // Pecah string "IG, YT, Website" menjadi array
            const arrMedsos = r.medsos.split(", ");
            // Tambahkan jumlah platform ke total publikasi
            totalPublikasiSosmed += arrMedsos.length;
            
            // Hitung untuk Bar Chart Distribusi Medsos sekalian
            arrMedsos.forEach(sosmed => {
                countsByMedsos[sosmed] = (countsByMedsos[sosmed] || 0) + 1;
            });
        }
    });

    const target = filterBulan === "Semua" ? 384 : 32;
    // Hitung persentase berdasarkan perhitungan baru
    const persentase = target > 0 ? ((totalPublikasiSosmed / target) * 100).toFixed(1) : 0;

    // 2. PLUGIN CUSTOM UNTUK TEKS DI TENGAH DOUGHNUT CHART
    const centerTextPlugin = {
        id: 'centerText',
        beforeDraw: function(chart) {
            const width = chart.width,
                  height = chart.height,
                  ctx = chart.ctx;

            ctx.restore();
            const fontSize = (height / 110).toFixed(2);
            ctx.font = "bold " + fontSize + "em sans-serif";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#198754"; 

            const text = persentase + "%",
                  textX = Math.round((width - ctx.measureText(text).width) / 2),
                  textY = height / 2;

            ctx.fillText(text, textX, textY);
            ctx.save();
        }
    };

    if(chartTargetInstance) chartTargetInstance.destroy();
    chartTargetInstance = new Chart(document.getElementById('chartTargetPublikasi'), {
        type: 'doughnut',
        data: { 
            labels: ['Tercapai', 'Sisa Target'], 
            datasets: [{ 
                // Gunakan totalPublikasiSosmed di sini
                data: [totalPublikasiSosmed, Math.max(0, target - totalPublikasiSosmed)], 
                backgroundColor: ['#198754', '#e9ecef'],
                borderWidth: 0 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            cutout: '75%', 
            plugins: {
                legend: { position: 'bottom' }
            }
        },
        plugins: [centerTextPlugin] 
    });

    // 3. MENGHITUNG DATA UNTUK BAR CHART (Jenis Konten)
    const countsByJenis = {};
    publishedData.forEach(r => { countsByJenis[r.jenisKonten] = (countsByJenis[r.jenisKonten] || 0) + 1; });
    const maxJenis = Math.max(0, ...Object.values(countsByJenis));

    if(chartJenisInstance) chartJenisInstance.destroy();
    chartJenisInstance = new Chart(document.getElementById('chartJenisKonten'), {
        type: 'bar',
        data: { labels: Object.keys(countsByJenis), datasets: [{ label: 'Jumlah', data: Object.values(countsByJenis), backgroundColor: '#0d6efd', borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: maxJenis + 2, ticks: { stepSize: 1, precision: 0 } } } }
    });

    // 4. CHART DISTRIBUSI MEDSOS
    // (countsByMedsos sudah dihitung di looping pertama untuk efisiensi)
    const maxMedsos = Math.max(0, ...Object.values(countsByMedsos));

    if(chartSosmedInstance) chartSosmedInstance.destroy();
    chartSosmedInstance = new Chart(document.getElementById('chartSosmedKonten'), {
        type: 'bar',
        data: { 
            labels: Object.keys(countsByMedsos), 
            datasets: [{ label: 'Distribusi', data: Object.values(countsByMedsos), backgroundColor: '#198754', borderRadius: 4 }] 
        },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: false } }, 
            scales: { y: { beginAtZero: true, max: maxMedsos + 2, ticks: { stepSize: 1, precision: 0 } } } 
        }
    });
}

function renderBebanKerjaDosen(data) {
    const bebanMap = {}; // Format: { "Fadil": 4, "Natasha": 3 }
    const detailTugas = []; // Array of object untuk tabel rincian

    data.forEach(row => {
        // 1. Ekstrak Desainer (Bobot 2)
        if (row.desainer) {
            const desainerArr = row.desainer.split(", ");
            desainerArr.forEach(nama => {
                if (!nama.trim()) return;
                bebanMap[nama] = (bebanMap[nama] || 0) + 2;
                detailTugas.push({ nama: nama, peran: "Desainer", judul: row.judul, bobot: 2 });
            });
        }
        
        // 2. Ekstrak Copywriter (Bobot 1)
        if (row.copywriter) {
            const copyArr = row.copywriter.split(", ");
            copyArr.forEach(nama => {
                if (!nama.trim()) return;
                bebanMap[nama] = (bebanMap[nama] || 0) + 1;
                detailTugas.push({ nama: nama, peran: "Copywriter", judul: row.judul, bobot: 1 });
            });
        }
    });

    // 3. Render Chart (Diurutkan dari beban terberat ke teringan)
    const sortedNames = Object.keys(bebanMap).sort((a, b) => bebanMap[b] - bebanMap[a]);
    const sortedValues = sortedNames.map(name => bebanMap[name]);

    if(chartBebanInstance) chartBebanInstance.destroy();
    chartBebanInstance = new Chart(document.getElementById('chartBebanKerja'), {
        type: 'bar',
        data: { 
            labels: sortedNames, 
            datasets: [{ 
                label: 'Total Bobot Kinerja', 
                data: sortedValues, 
                backgroundColor: '#fd7e14', // Warna orange agar beda dari chart lain
                borderRadius: 4 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } }, 
            scales: { 
                y: { 
                    beginAtZero: true, 
                    ticks: { stepSize: 1, precision: 0 } 
                } 
            } 
        }
    });

    // 4. Render Tabel (Diurutkan berdasarkan Nama THL, lalu Peran)
    detailTugas.sort((a, b) => a.nama.localeCompare(b.nama) || b.bobot - a.bobot);
    
    let html = "";
    detailTugas.forEach((t, i) => {
        let badgePeran = t.peran === "Desainer" ? "bg-primary" : "bg-success";
        html += `<tr>
            <td class="text-center">${i + 1}</td>
            <td class="fw-bold">${t.nama}</td>
            <td><span class="badge ${badgePeran}">${t.peran}</span></td>
            <td>${t.judul}</td>
            <td class="text-center fw-bold text-danger">${t.bobot}</td>
        </tr>`;
    });
    
    document.getElementById("bodyTableBebanKerja").innerHTML = html || `<tr><td colspan="5" class="text-center text-muted py-3">Belum ada data pengerjaan dari THL pada periode ini.</td></tr>`;
}