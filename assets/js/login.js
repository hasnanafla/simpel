// If already logged in, skip straight to dashboard
(function redirectIfLoggedIn() {
  const existing = localStorage.getItem("kppn_session");
  if (!existing) return;
  try {
    const session = JSON.parse(existing);
    if (new Date().getTime() < session.expiryTime) {
      window.location.href = "dashboard.html";
    } else {
      localStorage.removeItem("kppn_session");
    }
  } catch (e) {
    localStorage.removeItem("kppn_session");
  }
})();

function showError(msg) {
  const el = document.getElementById("loginError");
  el.textContent = "❌ " + msg;
  el.classList.add("active");
}
function clearError() {
  document.getElementById("loginError").classList.remove("active");
}
function setLoading(isLoading) {
  const btn = document.getElementById("loginBtn");
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "⏳ Memproses..." : "Masuk";
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  setLoading(true);

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    if (!username || !password) throw new Error("Username dan password harus diisi");

    const result = await api.post("auth", { username, password });
    if (!result.success) throw new Error(result.message || "Username atau password salah");

    const sessionData = {
      username: result.username,
      loginTime: new Date().getTime(),
      expiryTime: new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem("kppn_session", JSON.stringify(sessionData));
    window.location.href = "dashboard.html";
  } catch (err) {
    showError(err.message);
    setLoading(false);
  }
});
