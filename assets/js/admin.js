const adminPage = {
  data: [],
  currentEdit: null,
  toDelete: null,

  async init() {
    this.setupEventListeners();
    await this.load();
  },

  async load() {
    try {
      const res = await api.get("admin");
      this.data = res.data || [];
      this.render();
    } catch (err) {
      document.getElementById("adminTableBody").innerHTML = `<tr><td colspan="4" class="error">Gagal memuat data: ${err.message}</td></tr>`;
    }
  },

  setupEventListeners() {
    const on = (id, ev, fn) => document.getElementById(id)?.addEventListener(ev, fn);
    on("btnAddAdmin", "click", () => this.openModal());
    on("closeAdminModal", "click", () => this.closeModal());
    on("cancelAdmin", "click", () => this.closeModal());
    on("adminForm", "submit", (e) => this.save(e));
    on("searchAdmin", "input", () => this.render());
    on("closeDeleteAdminModal", "click", () => this.closeDeleteModal());
    on("cancelDeleteAdmin", "click", () => this.closeDeleteModal());
    on("confirmDeleteAdmin", "click", () => this.confirmDelete());
    on("adminPasswordConfirm", "input", () => {
      const match = document.getElementById("adminPassword").value === document.getElementById("adminPasswordConfirm").value;
      document.getElementById("passMatchMsg").style.display = match ? "none" : "block";
    });
  },

  render() {
    const q = (document.getElementById("searchAdmin").value || "").toLowerCase();
    const filtered = this.data.filter((a) => (a.username || "").toLowerCase().includes(q));
    const tbody = document.getElementById("adminTableBody");
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="4" class="loading">Tidak ada data</td></tr>'; return; }
    tbody.innerHTML = filtered.map((a, i) => {
      const tgl = a.created_at ? new Date(a.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
      return `<tr><td>${i + 1}</td><td><strong>${a.username}</strong></td><td style="color:#64748b;font-size:13px">${tgl}</td>
        <td><button class="btn-icon btn-edit" onclick="adminPage.edit(${a.id_admin})">✏️ Edit</button>
        <button class="btn-icon btn-delete" onclick="adminPage.promptDelete(${a.id_admin},'${a.username}')">🗑️ Hapus</button></td></tr>`;
    }).join("");
  },

  openModal(data = null) {
    this.currentEdit = data;
    document.getElementById("adminModalTitle").textContent = data ? "Edit Admin" : "Tambah Admin";
    document.getElementById("adminSubmitBtn").textContent = data ? "Perbarui" : "Simpan";
    document.getElementById("adminUsername").value = data?.username || "";
    document.getElementById("adminPassword").value = "";
    document.getElementById("adminPasswordConfirm").value = "";
    document.getElementById("passMatchMsg").style.display = "none";
    if (data) {
      document.getElementById("adminPassLabel").textContent = "Password Baru (kosongkan jika tidak diubah)";
      document.getElementById("adminPassHint").textContent = "Kosongkan jika tidak ingin mengubah.";
      document.getElementById("adminPassword").required = false;
    } else {
      document.getElementById("adminPassLabel").textContent = "Password";
      document.getElementById("adminPassHint").textContent = "Minimal 6 karakter.";
      document.getElementById("adminPassword").required = true;
    }
    document.getElementById("adminModal").classList.add("active");
  },

  closeModal() { document.getElementById("adminModal").classList.remove("active"); this.currentEdit = null; },

  edit(id) {
    const d = this.data.find((a) => a.id_admin === id);
    if (d) this.openModal(d);
  },

  async save(e) {
    e.preventDefault();
    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value;
    const confirm2 = document.getElementById("adminPasswordConfirm").value;
    if (username.length < 3) { alert("Username minimal 3 karakter!"); return; }
    if (!this.currentEdit || password) {
      if (!password) { alert("Password harus diisi!"); return; }
      if (password.length < 6) { alert("Password minimal 6 karakter!"); return; }
      if (password !== confirm2) { alert("Password tidak cocok!"); return; }
    }
    const btn = document.getElementById("adminSubmitBtn");
    btn.disabled = true; btn.textContent = "Menyimpan...";
    try {
      if (this.currentEdit) {
        const payload = { id_admin: this.currentEdit.id_admin, username };
        if (password) payload.password = password;
        await api.put("admin", payload);
        alert("Admin berhasil diperbarui!");
      } else {
        await api.post("admin", { username, password });
        alert("Admin baru berhasil ditambahkan!");
      }
      await this.load();
      this.closeModal();
    } catch (err) {
      alert("Gagal: " + err.message);
    } finally {
      btn.disabled = false; btn.textContent = this.currentEdit ? "Perbarui" : "Simpan";
    }
  },

  promptDelete(id, username) {
    this.toDelete = id;
    document.getElementById("deleteAdminName").textContent = username;
    document.getElementById("deleteAdminModal").classList.add("active");
  },
  closeDeleteModal() { document.getElementById("deleteAdminModal").classList.remove("active"); this.toDelete = null; },

  async confirmDelete() {
    if (!this.toDelete) return;
    const btn = document.getElementById("confirmDeleteAdmin");
    btn.disabled = true; btn.textContent = "Menghapus...";
    try {
      await api.delete("admin", { id: this.toDelete });
      this.toDelete = null;
      await this.load();
      this.closeDeleteModal();
      alert("Admin berhasil dihapus!");
    } catch (err) {
      alert("Gagal: " + err.message);
    } finally {
      btn.disabled = false; btn.textContent = "Hapus";
    }
  },
};
