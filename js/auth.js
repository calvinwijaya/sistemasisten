let currentRole = ""; 

// Daftar Endpoint GAS
const ENDPOINTS = {
  dosen: "https://script.google.com/macros/s/AKfycbxYh8AO79OHElYXHClU7UyNPhMhXbr-AdFfa514M2s8YYIrrTcJO3GsFuZbnPuxOUZU/exec",
  mahasiswa: "https://script.google.com/macros/s/AKfycbygalRAuM27-77OhOGfdFSOLCJR54sBSDBePech_5JZPFYBtUldVXHnss7VyNBuM5ZlnQ/exec"
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

  document.getElementById("btn-mahasiswa").addEventListener("mousedown", () => {currentRole = "mahasiswa";});
  document.getElementById("btn-dosen").addEventListener("mousedown", () => {currentRole = "dosen";});
};

function handleCredentialResponse(response) {
  const idToken = response.credential;

  if (!currentRole) {
    alert("Silakan klik salah satu tombol login kembali.");
    return;
  }

  // Pilih URL berdasarkan role yang diklik
  const targetUrl = ENDPOINTS[currentRole];

  showSuccessMessage(`Memverifikasi akses ${currentRole}...`);

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
      // Simpan data user dan role untuk pengecekan di dashboard.html
      sessionStorage.setItem("user", JSON.stringify(data.user));
      sessionStorage.setItem("role", currentRole);

      showSuccessMessage(`Login ${currentRole} berhasil! Membuka Dashboard...`);

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);
    } else {
      showErrorMessage(data.message || `Email tidak terdaftar sebagai ${currentRole}.`);
    }
  })
  .catch(err => {
    console.error(err);
    showErrorMessage("Terjadi kesalahan koneksi server.");
  });
}

function showSuccessMessage(message) {
  const box = document.getElementById("login-message");
  box.textContent = message;
  box.className = "success";
}

function showErrorMessage(message) {
  const box = document.getElementById("login-message");
  box.textContent = message;
  box.className = "error";
}

