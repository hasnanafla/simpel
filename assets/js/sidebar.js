const MENU_ITEMS = [
  { page: "dashboard", href: "dashboard.html", icon: "📊", label: "Dashboard" },
  { page: "data-satker", href: "satker.html", icon: "🏢", label: "Data Satker" },
  { page: "data-transaksi", href: "transaksi.html", icon: "💳", label: "Data Transaksi" },
  { page: "sheet-proses", href: "proses.html", icon: "⚙️", label: "Proses" },
  { page: "rekap-digipay", href: "rekap.html", icon: "📈", label: "Rekap Digipay" },
  { page: "manajemen-admin", href: "admin.html", icon: "👤", label: "Manajemen Admin" },
];

function renderSidebar(activePage) {
  const el = document.getElementById("sidebar-container");
  if (!el) return;

  const menuHtml = MENU_ITEMS.map(
    (m) => `<a class="menu-item${m.page === activePage ? " active" : ""}" href="${m.href}">
      <span class="menu-icon">${m.icon}</span><span>${m.label}</span>
    </a>`
  ).join("");

  el.innerHTML = `
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>KPPN Sistem</h2>
        <p>Digipay Monitoring</p>
      </div>
      <div class="sidebar-menu">${menuHtml}</div>
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-info-text">Login Sebagai:</div>
          <div class="user-info-name" id="currentUsername">-</div>
        </div>
        <button class="logout-btn" id="logoutBtn">🚪 Logout</button>
      </div>
    </div>`;

  document.getElementById("currentUsername").textContent = getSessionUsername();
  setupLogout();
}
