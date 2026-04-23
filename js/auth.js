let currentRole = ""; 

// Daftar Endpoint GAS
const ENDPOINTS = {
  dosen: GAS_LOGIN_DOSEN,
  mahasiswa: GAS_LOGIN_MAHASISWA,
  thl: GAS_LOGIN_THL
};

function setRole(role) {
  currentRole = role;
  console.log("Role dipilih:", currentRole);
}

window.onload = function () {
  google.accounts.id.initialize({
    client_id: "458714585003-dfskos90b4nv8570c747kc79ft9nsv7h.apps.googleusercontent.com",
    callback: handleCredentialResponse
  });

  // Render Tombol Dosen
  google.accounts.id.renderButton(
    document.getElementById("btn-dosen"),
    { theme: "outline", size: "large", text: "signin_with", click_listener: () => { currentRole = "dosen"; } }
  );

  // Render Tombol Mahasiswa
  google.accounts.id.renderButton(
    document.getElementById("btn-mahasiswa"),
    { theme: "outline", size: "large", text: "signin_with", click_listener: () => { currentRole = "mahasiswa"; } }
  );

  // Render Tombol THL
  google.accounts.id.renderButton(
    document.getElementById("btn-thl"),
    { theme: "outline", size: "large", text: "signin_with", click_listener: () => { currentRole = "thl"; } }
  );

  document.getElementById("btn-mahasiswa").addEventListener("mousedown", () => {currentRole = "mahasiswa";});
  document.getElementById("btn-dosen").addEventListener("mousedown", () => {currentRole = "dosen";});
  document.getElementById("btn-thl").addEventListener("mousedown", () => { currentRole = "thl"; });
};

function handleCredentialResponse(response) {
  const idToken = response.credential;

  // 1. Tampilkan Loading Spinner menggunakan SweetAlert
  Swal.fire({
    title: 'Memeriksa Kredensial...',
    text: 'Mohon tunggu sebentar',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  if (!currentRole) {
    // Diganti menggunakan Swal agar konsisten
    Swal.fire('Perhatian', 'Silakan klik salah satu tombol login kembali.', 'warning');
    return;
  }

  // Pilih URL berdasarkan role yang diklik
  const targetUrl = ENDPOINTS[currentRole];

  fetch(targetUrl, {
    method: "POST",
    body: JSON.stringify({
      action: "login",
      id_token: idToken,
      role: currentRole
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "ok") {
      // Simpan data user dan role untuk pengecekan
      sessionStorage.setItem("user", JSON.stringify(data.user));
      sessionStorage.setItem("role", currentRole);

      // --- SCRIPT POPUP SUKSES DIMASUKKAN DI SINI ---
      Swal.fire({
        icon: 'success',
        title: 'Login Berhasil!',
        text: 'Membuka Sistem Asisten...',
        confirmButtonText: 'OK',
        confirmButtonColor: '#1e7e34' // Warna hijau
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = "dashboard.html"; 
        }
      });

    } else {
      Swal.fire({
        icon: 'error',
        title: 'Akses Ditolak',
        text: data.message || `Email tidak terdaftar sebagai ${currentRole}.`,
        confirmButtonColor: '#b02a37'
      });
    }
  })
  .catch(err => {
    // --- SCRIPT POPUP CATCH ERROR DIMASUKKAN DI SINI ---
    console.error(err);
    Swal.fire({
      icon: 'error',
      title: 'Kesalahan Sistem',
      text: 'Terjadi masalah saat menghubungi server.',
      confirmButtonColor: '#b02a37'
    });
  });
}