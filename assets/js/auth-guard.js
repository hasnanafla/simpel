(function checkSession() {
  const raw = localStorage.getItem("kppn_session");
  if (!raw) { window.location.replace("login.html"); return; }
  try {
    const s = JSON.parse(raw);
    if (new Date().getTime() > s.expiryTime) {
      localStorage.removeItem("kppn_session");
      window.location.replace("login.html");
    }
  } catch (e) {
    localStorage.removeItem("kppn_session");
    window.location.replace("login.html");
  }
})();

function getSessionUsername() {
  try {
    return JSON.parse(localStorage.getItem("kppn_session")).username || "-";
  } catch (e) {
    return "-";
  }
}

function setupLogout() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (confirm("Yakin ingin logout?")) {
      localStorage.removeItem("kppn_session");
      window.location.replace("login.html");
    }
  });
}
