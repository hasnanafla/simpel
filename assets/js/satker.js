const satkerPage = {
  data: [],
  currentEdit: null,
  importData: null,

  async init() {
    this.setupEventListeners();
    await this.load();
  },

  async load() {
    try {
      const res = await api.get("satker");
      this.data = res.data || [];
      this.render();
    } catch (err) {
      document.getElementById("satkerTableBody").innerHTML = `<tr><td colspan="6" class="error">Gagal memuat data: ${err.message}</td></tr>`;
    }
  },

  setupEventListeners() {
    const on = (id, ev, fn) => document.getElementById(id)?.addEventListener(ev, fn);
    on("btnAddSatker", "click", () => this.openModal());
    on("closeSatkerModal", "click", () => this.closeModal());
    on("cancelSatker", "click", () => this.closeModal());
    on("satkerForm", "submit", (e) => this.save(e));
    on("searchSatker", "input", () => this.render());

    on("closeWhatsappModal", "click", () => document.getElementById("whatsappModal").classList.remove("active"));
    on("cancelWhatsapp", "click", () => document.getElementById("whatsappModal").classList.remove("active"));
    on("whatsappForm", "submit", (e) => this.sendWhatsApp(e));

    on("btnImportSatker", "click", () => this.showImportModal());
    on("closeImportModal", "click", () => this.closeImportModal());
    on("cancelImport", "click", () => this.closeImportModal());
    on("excelFile", "change", () => this.previewImport());
    on("btnProcessImport", "click", () => this.processImport());
  },

  render() {
    const q = (document.getElementById("searchSatker").value || "").toLowerCase();
    const filtered = this.data.filter((d) => (d.kode_satker || "").toLowerCase().includes(q) || (d.nama_satker || "").toLowerCase().includes(q));
    const tbody = document.getElementById("satkerTableBody");
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="6" class="loading">Tidak ada data</td></tr>'; return; }
    tbody.innerHTML = filtered.map((d, i) => `<tr>
      <td>${i + 1}</td><td>${d.kode_satker || "-"}</td><td>${d.nama_satker || "-"}</td>
      <td>Rp ${(d.nominal || 0).toLocaleString("id-ID")}</td><td>${d.nomor_wa || "-"}</td>
      <td><button class="btn-icon btn-edit" onclick="satkerPage.edit('${d.kode_satker}')">✏️ Edit</button>
      <button class="btn-icon btn-whatsapp" onclick="satkerPage.prepareWhatsApp('${d.kode_satker}')">📱 WA</button></td>
    </tr>`).join("");
  },

  openModal(data = null) {
    this.currentEdit = data;
    document.getElementById("satkerModalTitle").textContent = data ? "Edit Data Satker" : "Tambah Data Satker";
    const ki = document.getElementById("kodeSatkerDash");
    ki.value = data?.kode_satker || "";
    if (data) { ki.setAttribute("readonly", "readonly"); ki.style.background = "#f8fafc"; }
    else { ki.removeAttribute("readonly"); ki.style.background = "white"; }
    document.getElementById("namaSatkerDash").value = data?.nama_satker || "";
    document.getElementById("upRM").value = data?.nominal || 0;
    document.getElementById("nomorWA").value = data?.nomor_wa || "";
    document.getElementById("satkerModal").classList.add("active");
  },

  closeModal() { document.getElementById("satkerModal").classList.remove("active"); this.currentEdit = null; },

  edit(kode) {
    const d = this.data.find((x) => x.kode_satker === kode);
    if (d) this.openModal(d);
  },

  async save(e) {
    e.preventDefault();
    const payload = {
      kode_satker: document.getElementById("kodeSatkerDash").value,
      nama_satker: document.getElementById("namaSatkerDash").value,
      nominal: parseFloat(document.getElementById("upRM").value) || 0,
      nomor_wa: document.getElementById("nomorWA").value,
    };
    try {
      if (this.currentEdit) {
        await api.put("satker", payload);
      } else {
        if (this.data.some((d) => d.kode_satker === payload.kode_satker)) {
          alert('Kode "' + payload.kode_satker + '" sudah ada!');
          return;
        }
        await api.post("satker", payload);
      }
      await this.load();
      this.closeModal();
      alert("Data satker berhasil " + (this.currentEdit ? "diperbarui" : "ditambahkan") + "!");
    } catch (err) {
      alert("Gagal: " + err.message);
    }
  },

  async prepareWhatsApp(kode) {
    const s = this.data.find((d) => d.kode_satker === kode);
    if (!s) return;
    let sheetProses = [];
    try {
      const transRes = await api.get("transaksi");
      sheetProses = calculateSheetProses(this.data, transRes.data || []);
    } catch (e) { /* ignore, fallback to generic message */ }
    const p = sheetProses.find((x) => x.kodeSatker === kode);
    const msg = p && p.status === "SUDAH"
      ? `Kami memberikan apresiasi kepada ${s.nama_satker} yang telah mengimplementasikan Digipay.\n\nSampai saat ini telah melakukan ${p.prosesTransaksi} proses transaksi dan ${p.transaksi} transaksi berhasil.\n\nMohon terus lakukan optimalisasi digitalisasi pembayaran.`
      : `Berdasarkan monitoring, ${s.nama_satker} belum mengimplementasikan Digipay.\n\nSesuai Nota Dinas Direktur Pengelolaan Kas Negara, setiap satker ditargetkan minimal 2 transaksi.\n\nHubungi CSO KPPN: 081349358202`;
    document.getElementById("waSatkerName").value = s.nama_satker;
    document.getElementById("waNumber").value = s.nomor_wa || "";
    document.getElementById("waMessage").value = msg;
    document.getElementById("whatsappModal").classList.add("active");
  },

  sendWhatsApp(e) {
    e.preventDefault();
    const num = document.getElementById("waNumber").value;
    if (!num) { alert("Nomor WA harus diisi!"); return; }
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(document.getElementById("waMessage").value)}`, "_blank");
    document.getElementById("whatsappModal").classList.remove("active");
  },

  showImportModal() {
    document.getElementById("excelFile").value = "";
    document.getElementById("previewContainer").style.display = "none";
    document.getElementById("btnProcessImport").disabled = true;
    this.importData = null;
    document.getElementById("importModal").classList.add("active");
  },
  closeImportModal() { document.getElementById("importModal").classList.remove("active"); },

  readExcelFile(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
          res(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }));
        } catch (err) { rej(err); }
      };
      r.onerror = () => rej(new Error("Gagal membaca file"));
      r.readAsArrayBuffer(file);
    });
  },

  async previewImport() {
    const file = document.getElementById("excelFile").files[0];
    if (!file) return;
    try {
      const raw = await this.readExcelFile(file);
      if (raw.length < 2) { alert("File harus minimal 2 baris"); return; }
      const norm = (h) => (h ? String(h).toLowerCase().trim().replace(/\s+/g, "_") : "");
      const hmap = {};
      raw[0].forEach((h, i) => { hmap[norm(h)] = i; });
      const maps = { kode_satker: ["kode_satker", "kode"], nama_satker: ["nama_satker", "satker", "nama"], nominal: ["nominal", "up_rm"], nomor_wa: ["nomor_wa", "wa", "whatsapp"] };
      this.importData = raw.slice(1).filter((r) => r.some((c) => c !== null && c !== undefined && c !== "")).map((row) => {
        const obj = {};
        Object.keys(maps).forEach((k) => { for (const ph of maps[k]) { if (hmap[norm(ph)] !== undefined) { obj[k] = row[hmap[norm(ph)]]; break; } } });
        return obj;
      });
      const cols = Object.keys(this.importData[0] || {});
      let html = "<thead><tr>" + cols.map((h) => `<th style="background:#2563eb;color:white;padding:8px;font-size:11px">${h}</th>`).join("") + "</tr></thead><tbody>";
      this.importData.slice(0, 5).forEach((row) => {
        html += "<tr>" + cols.map((h) => `<td style="border:1px solid #e2e8f0;padding:8px;font-size:11px">${row[h] ?? "-"}</td>`).join("") + "</tr>";
      });
      html += "</tbody>";
      document.getElementById("previewTable").innerHTML = html;
      document.getElementById("previewContainer").style.display = "block";
      document.getElementById("previewInfo").innerHTML = `<strong style="color:#10b981">&#10003; ${this.importData.length} baris siap diimport</strong>`;
      document.getElementById("btnProcessImport").disabled = false;
    } catch (err) { alert("Gagal membaca file: " + err.message); }
  },

  async processImport() {
    if (!this.importData?.length) { alert("Tidak ada data"); return; }
    if (!confirm(`Import ${this.importData.length} data?`)) return;
    const btn = document.getElementById("btnProcessImport");
    btn.disabled = true; btn.textContent = "Memproses...";
    try {
      const rows = this.importData
        .filter((r) => r.kode_satker && r.nama_satker)
        .map((r) => ({ kode_satker: String(r.kode_satker).trim(), nama_satker: String(r.nama_satker).trim(), nominal: parseFloat(r.nominal) || 0, nomor_wa: r.nomor_wa ? String(r.nomor_wa).trim() : null }));
      if (!rows.length) throw new Error("Tidak ada baris valid (kode_satker & nama_satker wajib)");
      await api.post("satker", rows);
      await this.load();
      alert(`Import selesai! ${rows.length} data diproses.`);
      this.closeImportModal();
    } catch (err) {
      alert("Gagal: " + err.message);
    } finally {
      btn.disabled = false; btn.innerHTML = "&#11014;&#65039; Proses Import";
    }
  },
};
