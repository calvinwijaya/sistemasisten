// ==== INIT ====
function initDaftarMK() {
    const tbody = document.getElementById("listMK");
    if (!tbody) return;

    const role = sessionStorage.getItem("role");
    const user = JSON.parse(sessionStorage.getItem("user"));

    const actionContainer = document.getElementById("actionContainer");
    if (actionContainer) {
        if (role === "dosen" || ADMIN_EMAILS.includes(user?.email)) {
            const btn = document.getElementById("actionContainer");
            if (btn) btn.style.display = "block";
            populateDosenDropdown();
            
            // PENTING: Panggil listener form di sini agar aktif
            setupFormListener(); 
        } else {
            actionContainer.style.setProperty("display", "none", "important");
        }
    }

    renderTableData();
}

// ==== FUNGSI RENDER TABEL ====
function renderTableData() {
    const tbody = document.getElementById("listMK");
    if (!tbody) return;

    tbody.innerHTML = `
    <tr>
        <td colspan="7" class="text-center py-4">
            <div class="spinner-border spinner-border-sm text-primary me-2"></div>
            Memuat data mata kuliah...
        </td>
    </tr>`;

    fetch(ENDPOINT_MK)
        .then(res => res.json())
        .then(data => {
            if (!data.length) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Belum ada data mata kuliah</td></tr>`;
                return;
            }

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
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Gagal memuat data</td></tr>`;
        });
}

// ==== LISTENER FORM ====
function setupFormListener() {
    const form = document.getElementById('formAjukanMK');
    if (!form) return;

    // Bersihkan listener lama
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', function(e) {
        e.preventDefault(); // MENCEGAH RELOAD KE HOME
        
        const submitBtn = newForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Mengirim...';

        const payload = {
            action: "tambahMK",
            kodeMK: document.getElementById('formKodeMK').value,
            namaMK: document.getElementById('formNamaMK').value,
            kelas: document.getElementById('formKelas').value,
            hari: document.getElementById('formHari').value, 
            jam: document.getElementById('formJam').value,
            kodeDosen1: document.getElementById('formDosen1').value,
            kodeDosen2: document.getElementById('formDosen2').value || null,
            kodeDosen3: document.getElementById('formDosen3').value || null,
            kuotaKelas: document.getElementById('formKuotaKelas').value,
            kuotaAsisten: document.getElementById('formKuotaAsisten').value
        };

        fetch(ENDPOINT_MK, {
            method: "POST",
            mode: "no-cors", 
            body: JSON.stringify(payload)
        })
        .then(() => {
            Swal.fire("Berhasil!", "Pengajuan asisten telah disimpan.", "success");
            newForm.reset();
            
            // Tutup Modal Bootstrap
            const modalEl = document.getElementById('modalAjukan');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
            
            renderTableData(); 
        })
        .catch(err => {
            console.error(err);
            Swal.fire("Error", "Gagal mengirim data.", "error");
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Kirim Pengajuan';
        });
    });
}

function refreshDataMK() {
    renderTableData();
}

function populateDosenDropdown() {
    document.querySelectorAll(".select-dosen").forEach(select => {
        select.innerHTML =
            `<option value="">-- Pilih Dosen --</option>` +
            Object.entries(DOSEN_MAP).map(
                ([kode, nama]) => `<option value="${kode}">${nama}</option>`
            ).join("");
    });
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
