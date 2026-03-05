let currentUserEmail = "";
let currentRole = "";
let currentNamaPanggilan = "";
let rawTrackerData = [];
let chartTargetInstance = null;
let chartJenisInstance = null;

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
    const sortBy = document.getElementById("sortMedia").value;

    let filteredData = rawTrackerData.filter(r => {
        if (filterBulan === "Semua") return r.tanggal.includes(filterTahun);
        let parts = r.tanggal.split("/");
        if (parts.length === 3) {
            const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            return months[parseInt(parts[1]) - 1] === filterBulan && parts[2] == filterTahun;
        }
        return false; 
    });

    filteredData.sort((a, b) => {
        const parseDate = (str) => {
            if (!str) return new Date(0);
            let p = str.split("/");
            if (p.length === 3) return new Date(p[2], p[1]-1, p[0]); 
            return new Date(str);
        };
        return parseDate(sortBy === 'jadwalPub' && a.jadwalPublikasi ? a.jadwalPublikasi : a.tanggal) - parseDate(sortBy === 'jadwalPub' && b.jadwalPublikasi ? b.jadwalPublikasi : b.tanggal);
    });

    const activeData = filteredData.filter(r => r.status !== "Published");
    const publishedData = filteredData.filter(r => r.status === "Published");

    renderTrackerTable(activeData);
    renderPublishedTable(publishedData);
    renderCharts(publishedData, filterBulan);
}

function renderTrackerTable(data) {
    const container = document.getElementById("trackerMediaContent");
    if (data.length === 0) {
        container.innerHTML = `<div class="alert alert-warning text-center">Belum ada pesanan desain aktif.</div>`;
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
                    <th width="15%">JADWAL PUBLIKASI</th> 
                    <th width="30%" class="text-start">STATUS & TRACKER</th>
                </tr>
            </thead>
            <tbody>`;

    data.forEach((row, index) => {
        html += `
        <tr>
            <td class="text-center fw-bold">${index + 1}</td>
            <td><span class="badge ${getBadgeColor(row.jenisKonten)}">${row.jenisKonten}</span></td>
            <td class="fw-semibold">${row.judul}</td>
            <td class="text-center">
                ${row.linkDesain ? `<a href="${row.linkDesain}" target="_blank" class="btn btn-sm btn-outline-info"><i class="bi bi-link-45deg"></i> Link</a>` : '-'}
            </td>
            <td class="text-center fw-bold text-success">
                ${row.jadwalPublikasi ? row.jadwalPublikasi : '<span class="text-muted small">-</span>'}
            </td>
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
    let badge = `<span class="badge bg-dark mb-2">${row.status}</span>`;
    let aksiHtml = "";
    
    // --- TOMBOL GLOBAL ---
    // Tombol Mata (Lihat Arahan) selalu ada untuk THL dan Dosen
    let btnMata = `<button class="btn btn-sm btn-outline-secondary me-1" title="Lihat Arahan" onclick="bukaModalDetail('${row.orderId}')"><i class="bi bi-info-circle"></i></button>`;
    
    // Tombol Edit selalu ada untuk Dosen yang membuat order (selama belum Published)
    let btnEdit = "";
    const myKode = getKodeDosenByNama(JSON.parse(sessionStorage.getItem("user")).nama);
    
    if (currentRole === "dosen" && row.pemberiOrder === myKode && row.status !== "Published") {
        btnEdit = `<button class="btn btn-sm btn-outline-primary me-1" title="Edit Pesanan" onclick="editPesanan('${row.orderId}')"><i class="bi bi-pencil"></i></button>`;
    }

    // --- TOMBOL BERDASARKAN STATUS & ROLE ---
    if (currentRole === "thl") {
        if (row.status === "Request") {
            aksiHtml = `<button class="btn btn-sm btn-primary" onclick="terimaTugas('${row.orderId}', 'Desainer')">Terima Desain</button>`;
        } 
        else if (row.status === "On Process" || row.status === "Revision") {
            // CEK OTORISASI DESAINER: Hanya yang namanya ada di row.desainer yang bisa unggah
            if (row.desainer && row.desainer.includes(currentNamaPanggilan)) {
                aksiHtml = `<button class="btn btn-sm btn-info" onclick="bukaModalDraft('${row.orderId}', '${row.judul}', '${row.pemberiOrder}')">Unggah Desain</button>`;
            } else {
                aksiHtml = `<span class="small text-muted fst-italic"><i class="bi bi-lock-fill me-1"></i>Akses Desain: ${row.desainer}</span>`;
            }
        } 
        else if (row.status === "Wait Copywrite") {
            aksiHtml = `<button class="btn btn-sm btn-secondary" onclick="terimaTugas('${row.orderId}', 'Copywriter')">Terima Copywriting</button>`;
        } 
        else if (row.status === "Copywrite") {
            // CEK OTORISASI COPYWRITER: Hanya yang namanya ada di row.copywriter yang bisa unggah
            if (row.copywriter && row.copywriter.includes(currentNamaPanggilan)) {
                aksiHtml = `<button class="btn btn-sm btn-warning text-dark" onclick="bukaModalCopywrite('${row.orderId}')">Unggah Caption</button>`;
            } else {
                aksiHtml = `<span class="small text-muted fst-italic"><i class="bi bi-lock-fill me-1"></i>Akses Copy: ${row.copywriter}</span>`;
            }
        } 
        else if (row.status === "Publication") {
            // Publikasi biasanya bisa dilakukan oleh siapa saja dalam tim, 
            // tapi jika ingin dibatasi ke desainer/copywriter yang terlibat, bisa pakai kondisi ini:
            if ((row.desainer && row.desainer.includes(currentNamaPanggilan)) || (row.copywriter && row.copywriter.includes(currentNamaPanggilan))) {
                aksiHtml = `<button class="btn btn-sm btn-dark" onclick="bukaModalPublikasi('${row.orderId}')">Publikasi Konten</button>`;
            } else {
                aksiHtml = `<span class="small text-muted fst-italic"><i class="bi bi-lock-fill me-1"></i>Hanya tim terkait yang bisa mempublikasikan</span>`;
            }
        }
    } 
    else if (currentRole === "dosen") {
        if (row.status === "Request") {
            aksiHtml = `<button class="btn btn-sm btn-outline-danger" title="Hapus" onclick="hapusPesanan('${row.orderId}')"><i class="bi bi-trash"></i></button>`;
        } else if (row.status === "QC") {
            if(row.reviewer === myKode || row.pemberiOrder === myKode) {
                aksiHtml = `<button class="btn btn-sm btn-warning text-dark" onclick="bukaModalQC('${row.orderId}')">Cek QC</button>`;
            } else {
                aksiHtml = `<span class="small text-muted fst-italic">Menunggu QC dari ${row.reviewer}</span>`;
            }
        }
    }

    // --- INFORMASI DESAINER & REVISI ---
    let picInfo = "";
    if (row.desainer && (row.status === "On Process" || row.status === "Revision")) {
        picInfo = `<div class="small mt-1 text-primary"><i class="bi bi-palette me-1"></i>${row.desainer}</div>`;
    } else if (row.copywriter && row.status === "Copywrite") {
        picInfo = `<div class="small mt-1 text-success"><i class="bi bi-pen me-1"></i>${row.copywriter}</div>`;
    }

    if(row.catatanRevisi && (row.status === "Revision" || row.status === "On Process")) {
        picInfo += `<div class="small text-danger mt-1">Revisi: ${row.catatanRevisi}</div>`;
    }

    return `<div class="mb-2">${badge}<br><div class="d-flex align-items-center mt-1">${btnMata}${btnEdit}${aksiHtml}</div>${picInfo}</div>`;
}

function generateStepper(row) {
    const stepNames = [`Request`, `Desain`, `Copywrite`, `QC`, `Publikasi`, `<span class="${row.status === 'Published' ? 'text-warning' : 'text-success'} fw-bold"><i class="bi bi-stars"></i>Published</span>`];
    const stepIcons = ['<i class="bi bi-1-circle"></i>', '<i class="bi bi-2-circle"></i>', '<i class="bi bi-3-circle"></i>', '<i class="bi bi-4-circle"></i>', '<i class="bi bi-5-circle"></i>', `<i class="bi bi-patch-check-fill ${row.status === 'Published' ? 'text-warning' : 'text-success'}" style="font-size: 1.4rem;"></i>`]; 

    let uiStep = 0;
    if(row.status === "On Process" || row.status === "Revision") uiStep = 1;
    if(row.status === "Wait Copywrite" || row.status === "Copywrite") uiStep = 2;
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
window.bukaModalPesanan = function() {
    document.getElementById("formPesananDesain").reset();
    document.getElementById("modalPesananDesain").querySelector(".modal-title").innerText = "Buat Pesanan Desain Baru";
    
    const btn = document.getElementById("btnSubmitPesanan");
    btn.setAttribute("data-mode", "create"); // Set mode
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
    btn.setAttribute("data-mode", "edit"); // Set mode
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
    
    document.getElementById("detTanggal").textContent = row.tanggal;
    document.getElementById("detPemberi").textContent = row.pemberiOrder;
    document.getElementById("detJenis").textContent = row.jenisKonten;
    document.getElementById("detJudul").textContent = row.judul;
    document.getElementById("detArahan").textContent = row.detail;
    
    if (row.linkDokumentasi) {
        document.getElementById("detDokumenArea").classList.remove("d-none");
        document.getElementById("detDokumenLink").href = row.linkDokumentasi;
    } else {
        document.getElementById("detDokumenArea").classList.add("d-none");
    }

    new bootstrap.Modal(document.getElementById('modalDetailPesanan')).show();
};

window.terimaTugas = function(orderId, roleType) {
    Swal.fire({ title: 'Memproses...', didOpen: () => Swal.showLoading() });
    postTrackerAPI({ action: "terimaTugas", orderId: orderId, roleType: roleType, namaPIC: currentNamaPanggilan });
};

window.bukaModalDraft = function(orderId, judul, pemberiOrder) {
    document.getElementById("formUnggahDraft").reset();
    document.getElementById("draftOrderId").value = orderId;
    document.getElementById("draftJudul").value = judul;
    
    const selectReviewer = document.getElementById("draftReviewer");
    if(Array.from(selectReviewer.options).some(opt => opt.value === pemberiOrder)){
        selectReviewer.value = pemberiOrder;
    }

    new bootstrap.Modal(document.getElementById('modalUnggahDraft')).show();
};

window.bukaModalCopywrite = function(orderId) {
    document.getElementById("formCopywrite").reset();
    document.getElementById("cwOrderId").value = orderId;
    new bootstrap.Modal(document.getElementById('modalUnggahCopywrite')).show();
};

window.bukaModalPublikasi = function(orderId) {
    document.getElementById("formPublikasi").reset();
    document.getElementById("pubOrderId").value = orderId;
    new bootstrap.Modal(document.getElementById('modalPublikasi')).show();
};

// 6. EVENT LISTENER DRAFT & COPYWRITE (Fix Loading)
document.getElementById("formUnggahDraft").addEventListener("submit", function(e) {
    e.preventDefault();
    const medsosSelect = document.getElementById("draftMedsos");
    const selectedMedsos = Array.from(medsosSelect.selectedOptions).map(opt => opt.value).join(", ");
    
    Swal.fire({ title: 'Mengajukan Copywrite...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    postTrackerAPI({
        action: "updateStatus", orderId: document.getElementById("draftOrderId").value,
        status: "Wait Copywrite", linkDesain: document.getElementById("draftLink").value,
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
        notifs = data.filter(r => ["Request", "Wait Copywrite", "Publication", "Revision"].includes(r.status));
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
                else if(n.status === "Revision") { msg = `Revisi QC: ${n.judul}`; icon = "bi-x-circle"; color = "text-danger"; }
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

    const count = publishedData.length;
    const target = filterBulan === "Semua" ? 384 : 32;

    // Menghitung persentase
    const persentase = target > 0 ? ((count / target) * 100).toFixed(1) : 0;

    // 1. PLUGIN CUSTOM UNTUK TEKS DI TENGAH DOUGHNUT CHART
    const centerTextPlugin = {
        id: 'centerText',
        beforeDraw: function(chart) {
            const width = chart.width,
                  height = chart.height,
                  ctx = chart.ctx;

            ctx.restore();
            // Menyesuaikan ukuran font secara dinamis dengan tinggi chart
            const fontSize = (height / 110).toFixed(2);
            ctx.font = "bold " + fontSize + "em sans-serif";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#198754"; // Warna hijau success agar senada

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
                data: [count, Math.max(0, target - count)], 
                backgroundColor: ['#198754', '#e9ecef'],
                borderWidth: 0 // Menghilangkan garis tepi agar lebih bersih
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            cutout: '75%', // Memperbesar lubang di tengah agar teks muat
            plugins: {
                legend: { position: 'bottom' }
            }
        },
        plugins: [centerTextPlugin] // Memasukkan plugin teks ke dalam chart
    });

    // 2. MENGHITUNG DATA UNTUK BAR CHART
    const countsByJenis = {};
    publishedData.forEach(r => { countsByJenis[r.jenisKonten] = (countsByJenis[r.jenisKonten] || 0) + 1; });
    
    // Menghitung nilai maksimum untuk sumbu Y (+2)
    const dataValues = Object.values(countsByJenis);
    const maxData = dataValues.length > 0 ? Math.max(...dataValues) : 0;
    const yAxisMax = maxData + 2;

    if(chartJenisInstance) chartJenisInstance.destroy();
    chartJenisInstance = new Chart(document.getElementById('chartJenisKonten'), {
        type: 'bar',
        data: { 
            labels: Object.keys(countsByJenis), 
            datasets: [{ 
                label: 'Jumlah Konten', 
                data: dataValues, 
                backgroundColor: '#0d6efd',
                borderRadius: 4 // Sedikit melengkungkan ujung bar agar estetis
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false } // Menyembunyikan legend karena hanya ada 1 dataset
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: yAxisMax, // Set nilai maksimum +2 dari data tertinggi
                    ticks: {
                        stepSize: 1, // Memaksa step per 1 angka
                        precision: 0 // Menghilangkan desimal (0.1, 0.2)
                    }
                }
            }
        }
    });
}