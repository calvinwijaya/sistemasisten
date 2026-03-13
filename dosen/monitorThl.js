function initMonitorThl() {
    const user = JSON.parse(sessionStorage.getItem("user"));
    const container = document.getElementById("monitorThlContent");
    
    container.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2">Mengambil daftar THL binaan Anda...</p>
        </div>`;

    Promise.all([
        fetch(ENDPOINT_THL_KEBUTUHAN).then(res => res.json()),
        fetch(ENDPOINT_THL_TERPILIH).then(res => res.json())
    ])
    .then(([resKebutuhan, resTerpilih]) => {
        if (resKebutuhan.status === "ok" && resTerpilih.status === "ok") {
            renderMonitorTable(resKebutuhan.data, resTerpilih.data, user.email);
        } else {
            throw new Error("Gagal mengambil data dari server.");
        }
    })
    .catch(err => {
        console.error(err);
        container.innerHTML = `<div class="alert alert-danger">Terjadi kesalahan: ${err.message}</div>`;
    });
}

function renderMonitorTable(dataKebutuhan, dataTerpilih, dosenEmail) {
    const container = document.getElementById("monitorThlContent");
    const targetEmail = dosenEmail.toLowerCase();
    
    // Cek apakah Admin
    const isAdmin = typeof ADMIN_EMAILS !== 'undefined' && ADMIN_EMAILS.includes(targetEmail);

    // 1. Kumpulkan semua Nama Pekerjaan yang dibimbing oleh Dosen ini
    let listPekerjaanDosen = [];
    if (isAdmin) {
        listPekerjaanDosen = dataKebutuhan.map(row => row[2]);
    } else {
        const pekerjaanBinaan = dataKebutuhan.filter(row => 
            (row[9]?.toString().toLowerCase() === targetEmail) ||
            (row[10]?.toString().toLowerCase() === targetEmail) ||
            (row[11]?.toString().toLowerCase() === targetEmail) ||
            (row[12]?.toString().toLowerCase() === targetEmail) ||
            (row[13]?.toString().toLowerCase() === targetEmail)
        );
        listPekerjaanDosen = pekerjaanBinaan.map(row => row[2]);
    }

    if (listPekerjaanDosen.length === 0 && !isAdmin) {
        container.innerHTML = `<div class="alert alert-warning text-center">Tidak ditemukan data pekerjaan di bawah bimbingan Anda.</div>`;
        return;
    }

    // 2. Kumpulkan THL yang terhubung dengan pekerjaan tersebut (TANPA DUPLIKASI)
    const uniqueThls = [];
    dataTerpilih.forEach(thl => {
        const pekerjaans = thl[2] ? thl[2].toString() : "";
        
        // Periksa apakah ada irisan antara pekerjaan THL ini dengan pekerjaan binaan Dosen
        let isSupervised = false;
        for (let i = 0; i < listPekerjaanDosen.length; i++) {
            if (pekerjaans.includes(listPekerjaanDosen[i])) {
                isSupervised = true;
                break;
            }
        }

        if (isAdmin || isSupervised) {
            // Pastikan THL ini belum masuk ke array (mencegah double tabel)
            if (!uniqueThls.some(u => u[5] === thl[5])) {
                uniqueThls.push(thl);
            }
        }
    });

    if (uniqueThls.length === 0) {
        container.innerHTML = `<div class="alert alert-warning text-center shadow-sm">Belum ada THL yang terdaftar pada pekerjaan binaan Anda.</div>`;
        return;
    }

    // 3. Render HTML berdasarkan THL Unik
    const currentMonth = new Date().toLocaleString('id-ID', { month: 'long' });
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    let html = "";
    let count = 0;

    uniqueThls.forEach(thl => {
        count++;
        const workId = `monitor-${count}`;
        const tahun = thl[1];
        const namaPekerjaanThl = thl[2]; // Akan memunculkan "Jaminan Mutu, Media DTGD" sekaligus
        const namaThl = thl[3];
        const emailThl = thl[5];

        html += `
        <div class="card shadow-sm mb-4 border-0" style="border-radius: 12px; overflow: hidden;">
            <div class="table-responsive">
                <table class="table align-middle mb-0">
                    <thead style="background-color: #1e3a8a; color: white;">
                        <tr style="font-size: 0.8rem; letter-spacing: 1px;">
                            <th width="5%" class="text-center py-3">NO</th>
                            <th width="30%" class="py-3">NAMA THL</th>
                            <th width="55%" class="py-3">PEKERJAAN</th>
                            <th width="10%" class="text-center py-3">TAHUN</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="text-center fw-bold">${count}</td>
                            <td>
                                <div class="fw-bold text-primary fs-5">${namaThl}</div>
                                <div class="small text-muted">${emailThl}</div>
                            </td>
                            <td>
                                ${namaPekerjaanThl.split(",").map(p => `<span class="badge bg-secondary me-1 mb-1 fw-normal">${p.trim()}</span>`).join('')}
                            </td>
                            <td class="text-center"><span class="badge bg-light text-dark border">${tahun}</span></td>
                        </tr>
                        <tr>
                            <td colspan="4" class="p-3 bg-light">
                                <div class="d-flex justify-content-end mb-2">
                                    <div class="d-inline-flex align-items-center bg-white p-1 px-2 rounded border shadow-sm" style="font-size: 0.8rem;">
                                        <i class="bi bi-funnel fs-6 me-2 text-primary"></i>
                                        <label class="me-2 fw-bold text-secondary mb-0">Bulan:</label>
                                        <select class="form-select form-select-sm border-0 bg-light py-0" id="filterBulan-${workId}" onchange="loadHistoryMonitor('${emailThl}', '${workId}')" style="width: 120px; font-size: 0.75rem;">
                                            ${months.map(m => `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>${m}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>

                                <div class="table-responsive bg-white rounded shadow-sm">
                                    <table class="table table-sm table-hover mb-0" style="font-size: 0.85rem;">
                                        <thead class="bg-primary text-white text-uppercase" style="font-size: 0.75rem;">
                                            <tr>
                                                <th width="15%">TANGGAL</th>
                                                <th width="10%">HARI</th>
                                                <th width="15%">JAM</th>
                                                <th>AKTIVITAS</th>
                                                <th class="text-center" width="10%">DURASI</th>
                                            </tr>
                                        </thead>
                                        <tbody id="history-${workId}">
                                            <tr><td colspan="5" class="text-center py-3 text-muted small">Memuat data logbook...</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        
        // Load otomatis dengan delay agar server Google tidak kena spamming request
        setTimeout(() => loadHistoryMonitor(emailThl, workId), 100 * count);
    });

    container.innerHTML = html;
}

// UBAH PARAMETER: Hapus `namaPekerjaan` karena logbook mengambil semua data bulan tersebut
function loadHistoryMonitor(emailThl, workId) {
    const tbody = document.getElementById(`history-${workId}`);
    const filterBulan = document.getElementById(`filterBulan-${workId}`).value;

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-4">
                <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                <span class="ms-2 small text-muted">Memuat data logbook ${filterBulan}...</span>
            </td>
        </tr>`;

    fetch(`${ENDPOINT_THL_LOGBOOK}?action=getLogbook&email=${emailThl}`)
        .then(res => res.json())
        .then(res => {
            if (res.status === "ok") {
                // FILTER HANYA BERDASARKAN BULAN SAJA
                let logs = res.data.filter(row => row[12] === filterBulan);
                
                if (typeof sortLogsByDate === 'function') {
                    logs = sortLogsByDate(logs, 14);
                }

                renderMonitorRows(logs, tbody); // Pastikan renderMonitorRows tetap ada di file Anda
            } else {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-danger">Gagal mengambil data.</td></tr>`;
            }
        })
        .catch(err => {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-3">Terjadi kesalahan koneksi.</td></tr>`;
        });
}

function renderMonitorRows(data, tbody) {
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted small">Tidak ada logbook untuk bulan ini.</td></tr>`;
        return;
    }

    let html = "";
    let totalJam = 0;

    data.forEach((row) => {
        const jam = `${row[15].toString().substring(0,5)} - ${row[16].toString().substring(0,5)}`;
        totalJam += parseFloat(row[17]) || 0;

        html += `
        <tr>
            <td class="fw-semibold">${row[14]}</td>
            <td class="text-uppercase text-secondary" style="font-size: 0.7rem;">${row[13]}</td>
            <td><span class="badge bg-light text-dark border fw-normal">${jam}</span></td>
            <td class="text-wrap">${row[19]}</td>
            <td class="text-center fw-bold text-primary">${row[17]} Jam</td>
        </tr>`;
    });
        html += `
        <tr class="table-light fw-bold border-top">
            <td colspan="4" class="text-end py-2">TOTAL:</td>
            <td class="text-center py-2 text-primary" style="white-space: nowrap;">
                ${data.length} Hari | ${totalJam.toFixed(2)} Jam
            </td>
        </tr>`;

    tbody.innerHTML = html;
}