
function initDaftarMKAsisten() {
    const tbody = document.getElementById("listMK");
    if (!tbody) return;

    // UI Feedback: Memastikan container tombol refresh muncul
    const actionContainer = document.getElementById("actionContainer");
    if (actionContainer) {
        actionContainer.style.setProperty("display", "flex", "important");
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-4">
                <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                Memuat data mata kuliah...
            </td>
        </tr>`;

    // Ambil variabel langsung dari config.js
    const URL_TARGET = typeof ENDPOINT_MK !== 'undefined' ? ENDPOINT_MK : window.ENDPOINT_MK;

    if (!URL_TARGET) {
        console.error("Error: ENDPOINT_MK tidak ditemukan. Pastikan config.js sudah dimuat.");
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Konfigurasi API tidak ditemukan.</td></tr>';
        return;
    }

    fetch(URL_TARGET)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-5 text-muted">
                            <i class="bi bi-info-circle me-2"></i>
                            Tidak ada Mata Kuliah yang membuka lowongan Asisten Praktikum/ Tutor atau periode pendaftaran sudah lewat.
                        </td>
                    </tr>`;
                return;
            }

            // Duplikasi logika render agar sama dengan versi Dosen
            tbody.innerHTML = data.map((mk, i) => `
                <tr>
                    <td class="text-center fw-bold">${i + 1}</td>
                    <td class="text-center"><span class="badge bg-light text-dark border">${mk.kodeMK}</span></td>
                    <td>${mk.namaMK}</td>
                    <td class="text-center"><span class="badge bg-info text-dark">${mk.kelas}</span></td>
                    <td class="text-center small">${mk.hari}<br><span class="text-muted">${mk.jam}</span></td>
                    <td>
                        <div class="d-flex flex-column gap-1">
                            <small class="fw-semibold">1. ${getNamaDosen(mk.dosen1)}</small>
                            ${mk.dosen2 ? `<small class="text-muted">2. ${getNamaDosen(mk.dosen2)}</small>` : ""}
                            ${mk.dosen3 ? `<small class="text-muted">3. ${getNamaDosen(mk.dosen3)}</small>` : ""}
                        </div>
                    </td>
                    <td class="text-center">${mk.kuotaKelas}</td>
                    <td class="text-center fw-bold text-success">${mk.kuotaAsisten}</td>
                </tr>
            `).join("");
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            // Mengganti pesan error teknis menjadi pesan periode ditutup
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5 text-muted italic">
                        Periode pendaftaran Asisten Praktikum/ Tutor saat ini sedang ditutup.
                    </td>
                </tr>`;
        });
}

function refreshDataMK() {
    initDaftarMKAsisten();
}

// Fungsi Filter MK
function filterMK() {
    const keyword = document.getElementById("searchMK").value.toLowerCase();
    const rows = document.querySelectorAll("#listMK tr");
    let visibleCount = 0;

    rows.forEach(row => {
        const namaMK = row.children[2]?.textContent.toLowerCase() || "";
        const show = namaMK.includes(keyword);
        row.style.display = show ? "" : "none";
        if (show) visibleCount++;
    });
}