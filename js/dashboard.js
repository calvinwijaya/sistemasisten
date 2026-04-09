const user = JSON.parse(sessionStorage.getItem("user"));
const role = sessionStorage.getItem("role");

if (!user) {
    window.location.href = 'index.html';
}

document.getElementById("userNama").textContent = user.nama;

const sidebarUserNama = document.getElementById("sidebarUserNama");
const sidebarUserRole = document.getElementById("sidebarUserRole");
const userProfilePic = document.getElementById("userProfilePic");

if (sidebarUserNama) sidebarUserNama.textContent = user.nama;
if (sidebarUserRole) sidebarUserRole.textContent = user.status;

if (userProfilePic) {
    const nameForAvatar = user.nama.replace(/\s+/g, '+');
    const defaultAvatarUrl = `https://ui-avatars.com/api/?name=${nameForAvatar}&background=0d6efd&color=fff&rounded=true&bold=true`;

    if (user.picture) {
        userProfilePic.src = user.picture;
        // Jika foto Google gagal dimuat, ganti ke Inisial Nama
        userProfilePic.onerror = function() {
            this.onerror = null; 
            this.src = defaultAvatarUrl;
        };
    } else {
        userProfilePic.src = defaultAvatarUrl;
    }
}

// Logika Role-Based Access Control (RBAC)
document.addEventListener("DOMContentLoaded", () => {
    const menuDosen = document.getElementById("menuDosen");
    const menuAsisten = document.getElementById("menuAsisten");

    if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        return;
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email);
    if (isAdmin && sidebarUserRole) {
            sidebarUserRole.innerHTML = `${user.status} <span class="badge bg-warning text-dark ms-1">Admin</span>`;
        }

    if (role === "mahasiswa") {
        // Sembunyikan menu Dosen sepenuhnya
        if (menuDosen) menuDosen.remove(); 
        
        // Tambahkan proteksi tambahan: jika mahasiswa mencoba akses page dosen via URL
        const params = new URLSearchParams(window.location.search);
        if (params.get("page") && params.get("page").includes("lihat")) {
            Swal.fire('Akses Ditolak', 'Mahasiswa tidak diizinkan mengakses menu ini.', 'error');
            window.location.href = 'dashboard.html';
        }
    } else if (role === "dosen") {
        // Sembunyikan menu Asisten sepenuhnya
        if (menuAsisten) menuAsisten.remove();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    const role = sessionStorage.getItem("role");
    const isAdmin = typeof ADMIN_EMAILS !== 'undefined' && ADMIN_EMAILS.includes(user?.email?.toLowerCase());

    const menuDosen = document.getElementById("menuDosen");
    const menuAsisten = document.getElementById("menuAsisten");
    const menuThl = document.getElementById("menuThl");

    const expandMenu = (menuId, collapseId) => {
        const menuEl = document.getElementById(menuId);
        const collapseEl = document.getElementById(collapseId);
        if (menuEl && collapseEl) {
            // Set panah/toggle agar posisinya 'expanded'
            const toggler = menuEl.querySelector('.dropdown-toggle');
            if (toggler) toggler.setAttribute('aria-expanded', 'true');
            // Munculkan list menu
            collapseEl.classList.add("show");
        }
    };

    if (!isAdmin) {
        if (role === "dosen") {
            if (menuAsisten) menuAsisten.remove();
            if (menuThl) menuThl.remove();
            expandMenu("menuDosen", "dosenMenu");
        } 
        else if (role === "mahasiswa") {
            if (menuDosen) menuDosen.remove();
            if (menuThl) menuThl.remove();
            expandMenu("menuAsisten", "asistenMenu");
        } 
        else if (role === "thl") {
            if (menuDosen) menuDosen.remove();
            if (menuAsisten) menuAsisten.remove();
            expandMenu("menuThl", "thlMenu");
        }
    } else {
        expandMenu("menuDosen", "dosenMenu");
        expandMenu("menuAsisten", "asistenMenu");
        expandMenu("menuThl", "thlMenu");
    }
});

document.getElementById('toggleSidebar').addEventListener('click', function () {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');

    // Tutup semua submenu ketika sidebar dicollapse
    if (sidebar.classList.contains('collapsed')) {
        document.querySelectorAll('.sidebar .collapse.show').forEach(el => {
            const bsCollapse = bootstrap.Collapse.getInstance(el);
            if (bsCollapse) {
                bsCollapse.hide();
            } else {
                new bootstrap.Collapse(el, { toggle: false }).hide();
            }
        });
    }
});

function loadPage(eventOrPage, pagePath, key) {
    let finalPage, finalKey;

    if (typeof eventOrPage === 'object' && eventOrPage !== null) {
        if (eventOrPage.preventDefault) eventOrPage.preventDefault();
        finalPage = pagePath;
        finalKey = key;
    } else {
        finalPage = eventOrPage;
        finalKey = pagePath;
    }

    if (!finalPage || !finalKey || finalKey === "undefined") return;

    fetch(finalPage)
        .then(res => {
            if (!res.ok) throw new Error("Gagal mengambil file");
            return res.text();
        })
        .then(html => {
            document.getElementById("mainContent").innerHTML = html;

            const newUrl = window.location.origin + window.location.pathname + `?page=${finalKey}`;
            history.pushState({ page: finalPage, key: finalKey }, "", newUrl);

            document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'))
            const activeLink = document.querySelector(`a[onclick*="'${finalKey}'"]`);
            if (activeLink) activeLink.classList.add('active');

            if (finalKey === 'lihatDaftarMK') {
                loadScript('dosen/daftarMK.js', () => {
                if (typeof initDaftarMK === 'function') initDaftarMK();
                });
            } else if (finalKey === 'lihatPendaftar') {
                loadScript('dosen/lihatPendaftar.js', () => {
                    if (typeof initLihatPendaftar === 'function') initLihatPendaftar();
                });
            } else if (finalKey === 'monitorAsisten') {
                loadScript('dosen/monitorAsisten.js', () => {
                    if (typeof initMonitorAsisten === 'function') initMonitorAsisten();
                });
            } else if (finalKey === 'lihatDaftarMKAsisten') {
                loadScript('asisten/daftarMKAsisten.js', () => {
                    if (typeof initDaftarMKAsisten === 'function') initDaftarMKAsisten();
                });
            } else if (finalKey === 'daftarAsisten') {
                loadScript('asisten/daftarAsisten.js', () => {
                    if (typeof initDaftarAsisten === 'function') initDaftarAsisten();
                });
            } else if (finalKey === 'lihatStatus') {
                loadScript('asisten/lihatStatus.js', () => {
                    if (typeof initLihatStatus === 'function') initLihatStatus();
                });
            } else if (finalKey === 'asistensi') {
                loadScript('asisten/asistensi.js', () => {
                    if (typeof initAsistensi === 'function') initAsistensi();
                });
            } else if (finalKey === 'monitorThl') {
                loadScript('dosen/monitorThl.js', () => {
                    if (typeof initMonitorThl === 'function') initMonitorThl();
                });
            } else if (finalKey === 'buatLogbook') {
                loadScript('thl/buatLogbook.js', () => {
                    if (typeof initBuatLogbook === 'function') initBuatLogbook();
                });
            } else if (finalKey === 'trackerMedia') {
                loadScript('thl/trackerMedia.js', () => {
                    if (typeof initTrackerMedia === 'function') initTrackerMedia();
                });
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById("mainContent").innerHTML = 
                "<p class='text-danger'>Gagal memuat halaman.</p>";
        });
}

function loadScript(src, callback) {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.src = src;
    script.onload = callback;
    document.body.appendChild(script);
}

// Menangani kondisi ketika user menekan tombol 'Back' atau 'Forward' di browser
window.onpopstate = function(event) {
    if (event.state && event.state.page) {
        loadPage(event.state.page, event.state.key);
    } else {
        window.location.href = window.location.pathname; 
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const pageKey = params.get("page");

    const routes = {
        'lihatDaftarMK':'dosen/daftarMK.html',
        'lihatPendaftar': 'dosen/lihatPendaftar.html',
        'monitorAsisten': 'dosen/monitorAsisten.html',
        'monitorThl': 'dosen/monitorThl.html',
        'lihatDaftarMKAsisten':'asisten/daftarMKAsisten.html',
        'daftarAsisten': 'asisten/daftarAsisten.html',
        'lihatStatus': 'asisten/lihatStatus.html',
        'asistensi': 'asisten/asistensi.html',
        'buatLogbook': 'thl/buatLogbook.html',
        'trackerMedia': 'thl/trackerMedia.html'
    };

    if (pageKey && routes[pageKey]) {
        loadPage(routes[pageKey], pageKey);
    }
});

document.getElementById("btnLogout").addEventListener("click", (e) => {
    e.preventDefault();

    Swal.fire({
        title: 'Keluar dari Sistem?',
        text: "Anda harus login kembali untuk mengakses data penilaian.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Ya, Keluar',
        cancelButtonText: 'Batal',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            performLogout();
        }
    });
});

function performLogout() {
    try {
        const userRaw = sessionStorage.getItem("user");
        const user = userRaw ? JSON.parse(userRaw) : null;
        const email = user?.email;

        if (window.google?.accounts?.id) {
            google.accounts.id.disableAutoSelect();
            if (email) {
                google.accounts.id.revoke(email, () => {
                    console.log("Google session revoked");
                });
            }
        }
    } catch (err) {
        console.warn("Logout cleanup error:", err);
    }

    sessionStorage.clear();
    localStorage.clear();
    
    // Optional: Show a quick success message before redirecting
    Swal.fire({
        title: 'Berhasil Keluar',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
    }).then(() => {
        window.location.href = "index.html";
    });
}