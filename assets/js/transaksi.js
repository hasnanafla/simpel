const transaksiPage = {
  data: [],
  satkerData: [],
  currentEdit: null,
  importData: null,
  activeFilter: null, // { start, end, label }

  async init() {
    this.setupEventListeners();
    this.setupFilterListeners(); // <-- tambahan
    await this.load();
  },

  async load() {
    try {
      const [transRes, satkerRes] = await Promise.all([api.get("transaksi"), api.get("satker")]);
      this.data = transRes.data || [];
      this.satkerData = satkerRes.data || [];
      this.render();
    } catch (err) {
      document.getElementById("transaksiTableBody").innerHTML = `<tr><td colspan="18" class="error">Gagal memuat data: ${err.message}</td></tr>`;
    }
  },

  setupEventListeners() {
    const on = (id, ev, fn) => document.getElementById(id)?.addEventListener(ev, fn);
    on("btnAddTransaksi", "click", () => this.openModal());
    on("closeTransaksiModal", "click", () => this.closeModal());
    on("cancelTransaksi", "click", () => this.closeModal());
    on("transaksiForm", "submit", (e) => this.save(e));
    on("searchTransaksi", "input", () => this.render());
    on("btnImportTransaksi", "click", () => this.showImportModal());
    on("closeImportModal", "click", () => this.closeImportModal());
    on("cancelImport", "click", () => this.closeImportModal());
    on("excelFile", "change", () => this.previewImport());
    on("btnProcessImport", "click", () => this.processImport());
  },

  // ─── FILTER LOGIC ────────────────────────────────────────────────────────────

  setupFilterListeners() {
    const on = (id, ev, fn) => document.getElementById(id)?.addEventListener(ev, fn);

    on("filterPeriode", "change", () => {
      const val = document.getElementById("filterPeriode").value;
      const rangeEl = document.getElementById("customDateRange");

      if (val === "custom") {
        rangeEl.classList.add("visible");
      } else {
        rangeEl.classList.remove("visible");
        if (val) this.applyPresetFilter(val);
        else this.resetFilter();
      }
    });

    on("btnApplyFilter", "click", () => this.applyCustomFilter());
    on("btnResetFilter", "click", () => this.resetFilter());
  },

  getPresetRange(preset) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (preset === "today") {
      return { start: today, end: today, label: "Hari Ini" };
    }
    if (preset === "this_week") {
      const day = today.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const start = new Date(today);
      start.setDate(today.getDate() + diffToMon);
      return { start, end: today, label: "Minggu Ini" };
    }
    if (preset === "this_month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start, end: today, label: "Bulan Ini" };
    }
    if (preset === "this_year") {
      const start = new Date(today.getFullYear(), 0, 1);
      return { start, end: today, label: "Tahun Ini" };
    }
    return null;
  },

  applyPresetFilter(preset) {
    const range = this.getPresetRange(preset);
    if (!range) return;
    this.activeFilter = range;
    this.render();
    this.showBadge(range);
  },

  applyCustomFilter() {
    const awal = document.getElementById("filterTglAwal").value;
    const akhir = document.getElementById("filterTglAkhir").value;
    if (!awal || !akhir) { alert("Isi tanggal awal dan akhir terlebih dahulu."); return; }
    if (awal > akhir) { alert("Tanggal awal tidak boleh lebih dari tanggal akhir."); return; }

    const fmt = (s) => {
      const [y, m, d] = s.split("-");
      return `${d}/${m}/${y}`;
    };
    this.activeFilter = {
      start: new Date(awal),
      end: new Date(akhir + "T23:59:59"),
      label: `${fmt(awal)} – ${fmt(akhir)}`,
    };
    this.render();
    this.showBadge(this.activeFilter);
  },

  resetFilter() {
    this.activeFilter = null;
    document.getElementById("filterPeriode").value = "";
    document.getElementById("customDateRange").classList.remove("visible");
    document.getElementById("filterTglAwal").value = "";
    document.getElementById("filterTglAkhir").value = "";
    this.hideBadge();
    this.render();
  },

  showBadge({ label }) {
    const badge = document.getElementById("filterBadge");
    if (!badge) return;
    // Hitung dulu setelah render
    const count = this._lastFilteredCount || 0;
    badge.innerHTML = `🔎 Filter aktif: <strong>${label}</strong> &mdash; <span id="badgeCount">${count}</span> transaksi ditemukan`;
    badge.classList.add("visible");
  },

  hideBadge() {
    document.getElementById("filterBadge")?.classList.remove("visible");
  },

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  render() {
    const q = (document.getElementById("searchTransaksi").value || "").toLowerCase();

    let filtered = this.data.filter((t) =>
      (t.kode_satker || "").toLowerCase().includes(q) ||
      (t.satuan_kerja || "").toLowerCase().includes(q) ||
      (t.pejabat_pengadaan || "").toLowerCase().includes(q) ||
      (t.nomor_invoice || "").toLowerCase().includes(q) ||
      (t.kppn || "").toLowerCase().includes(q)
    );

    // Terapkan filter tanggal jika aktif
    if (this.activeFilter) {
      const { start, end } = this.activeFilter;
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);

      filtered = filtered.filter((t) => {
        if (!t.tanggal_pembelian) return false;
        const tgl = new Date(t.tanggal_pembelian);
        return tgl >= start && tgl <= endOfDay;
      });

      // Update badge count setelah filter
      this._lastFilteredCount = filtered.length;
      const countEl = document.getElementById("badgeCount");
      if (countEl) countEl.textContent = filtered.length;
    }

    const tbody = document.getElementById("transaksiTableBody");
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="18" class="loading">${this.activeFilter ? "Tidak ada transaksi pada periode ini." : "Tidak ada data"}</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((t, i) => `<tr>
      <td>${i + 1}</td><td>${t.tanggal_pembelian || "-"}</td><td>${t.kppn || "-"}</td><td>${t.satuan_kerja || "-"}</td>
      <td>${t.pejabat_pengadaan || "-"}</td><td>${t.produk || "-"}</td><td>Rp ${(t.total_nominal || 0).toLocaleString("id-ID")}</td>
      <td>${t.nomor_rekening || "-"}</td><td>${t.nomor_invoice || "-"}</td><td>${t.metode_bayar || "-"}</td>
      <td><span class="badge ${t.status_transaksi === "Berhasil" ? "badge-success" : t.status_transaksi === "Pending" ? "badge-warning" : "badge-danger"}">${t.status_transaksi || "Pending"}</span></td>
      <td>${t.tanggal_deadline || "-"}</td><td>${t.tanggal_jatuh_tempo || "-"}</td><td>${t.tanggal_checkout || "-"}</td>
      <td>${t.tanggal_kirim || "-"}</td><td>${t.tanggal_terima || "-"}</td><td>${t.tanggal_bayar || "-"}</td>
      <td>
        <button class="btn-icon btn-edit" onclick="transaksiPage.edit(${t.no})">✏️</button>
        <button class="btn-icon btn-delete" onclick="transaksiPage.remove(${t.no})">🗑️</button>
      </td>
    </tr>`).join("");
  },

  // ─── MODAL & CRUD (tidak berubah) ────────────────────────────────────────────

  openModal(data = null) {
    this.currentEdit = data;
    document.getElementById("transaksiModalTitle").textContent = data ? "Edit Data Transaksi" : "Tambah Data Transaksi";
    document.getElementById("tglPembelian").value = data?.tanggal_pembelian || "";
    document.getElementById("kppn").value = data?.kppn || "KPPN PEKALONGAN";
    document.getElementById("kodeSatker").value = data?.kode_satker || "";
    document.getElementById("satker").value = data?.satuan_kerja || "";
    document.getElementById("pejabat").value = data?.pejabat_pengadaan || "";
    document.getElementById("produk").value = data?.produk || "";
    document.getElementById("totalNominal").value = data?.total_nominal || "";
    document.getElementById("noRekening").value = data?.nomor_rekening || "";
    document.getElementById("noInvoice").value = data?.nomor_invoice || "";
    document.getElementById("metodeBayar").value = data?.metode_bayar || "VA";
    document.getElementById("statusTransaksi").value = data?.status_transaksi || "Pending";
    document.getElementById("tglDeadline").value = data?.tanggal_deadline || "";
    document.getElementById("tglJatuhTempo").value = data?.tanggal_jatuh_tempo || "";
    document.getElementById("tglCheckout").value = data?.tanggal_checkout || "";
    document.getElementById("tglKirim").value = data?.tanggal_kirim || "";
    document.getElementById("tglTerima").value = data?.tanggal_terima || "";
    document.getElementById("tglBayar").value = data?.tanggal_bayar || "";
    this.setupAutocomplete();
    document.getElementById("transaksiModal").classList.add("active");
  },

  closeModal() { document.getElementById("transaksiModal").classList.remove("active"); this.currentEdit = null; },

  edit(no) {
    const d = this.data.find((t) => t.no === no);
    if (d) this.openModal(d);
  },

  setupAutocomplete() {
    const dropdown = document.getElementById("kodeSatkerDropdown");
    const satkerInput = document.getElementById("satker");
    const old = document.getElementById("kodeSatker");
    const newInput = old.cloneNode(true);
    old.parentNode.replaceChild(newInput, old);
    const ksi = document.getElementById("kodeSatker");

    const showDropdown = (items) => {
      if (!items.length) { dropdown.innerHTML = '<div style="padding:12px;color:#64748b;text-align:center">Tidak ada data</div>'; dropdown.classList.add("active"); return; }
      dropdown.innerHTML = items.map((d) => `<div class="autocomplete-item" data-kode="${d.kode_satker}" data-nama="${d.nama_satker}"><div class="code">${d.kode_satker}</div><div class="name">${d.nama_satker}</div></div>`).join("");
      dropdown.classList.add("active");
      dropdown.querySelectorAll(".autocomplete-item").forEach((item) => {
        item.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); ksi.value = item.dataset.kode; satkerInput.value = item.dataset.nama; dropdown.classList.remove("active"); });
      });
    };

    ksi.addEventListener("input", (e) => {
      const v = e.target.value.toLowerCase();
      if (!v) { dropdown.classList.remove("active"); satkerInput.value = ""; return; }
      showDropdown(this.satkerData.filter((d) => d.kode_satker.toLowerCase().includes(v) || d.nama_satker.toLowerCase().includes(v)));
    });
    ksi.addEventListener("focus", () => { if (!ksi.value) showDropdown(this.satkerData); });
    document.addEventListener("click", (e) => { if (!ksi.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove("active"); });
    ksi.addEventListener("blur", () => setTimeout(() => {
      const s = this.satkerData.find((d) => d.kode_satker === ksi.value);
      if (s) satkerInput.value = s.nama_satker;
      else if (ksi.value && !satkerInput.value) { alert("Kode Satker tidak ditemukan!"); ksi.value = ""; }
    }, 300));
  },

  async save(e) {
    e.preventDefault();
    const payload = {
      no: this.currentEdit?.no,
      tanggal_pembelian: document.getElementById("tglPembelian").value,
      kppn: document.getElementById("kppn").value,
      kode_satker: document.getElementById("kodeSatker").value,
      satuan_kerja: document.getElementById("satker").value,
      pejabat_pengadaan: document.getElementById("pejabat").value,
      produk: document.getElementById("produk").value,
      total_nominal: parseFloat(document.getElementById("totalNominal").value) || 0,
      nomor_rekening: document.getElementById("noRekening").value || null,
      nomor_invoice: document.getElementById("noInvoice").value,
      metode_bayar: document.getElementById("metodeBayar").value,
      status_transaksi: document.getElementById("statusTransaksi").value,
      tanggal_deadline: document.getElementById("tglDeadline").value || null,
      tanggal_jatuh_tempo: document.getElementById("tglJatuhTempo").value || null,
      tanggal_checkout: document.getElementById("tglCheckout").value || null,
      tanggal_kirim: document.getElementById("tglKirim").value || null,
      tanggal_terima: document.getElementById("tglTerima").value || null,
      tanggal_bayar: document.getElementById("tglBayar").value || null,
    };
    try {
      if (this.currentEdit) await api.put("transaksi", payload);
      else await api.post("transaksi", payload);
      await this.load();
      this.closeModal();
      alert("Data transaksi berhasil disimpan!");
    } catch (err) { alert("Gagal: " + err.message); }
  },

  async remove(no) {
    if (!confirm("Hapus transaksi ini?")) return;
    try {
      await api.delete("transaksi", { no });
      await this.load();
      alert("Data berhasil dihapus!");
    } catch (err) { alert("Gagal: " + err.message); }
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

  pd(v) {
    if (!v) return null;
    if (typeof v === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      const d = new Date(v);
      if (!isNaN(d)) return d.toISOString().split("T")[0];
    }
    if (typeof v === "number") return new Date((v - 25569) * 86400 * 1000).toISOString().split("T")[0];
    return null;
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
      const maps = { tanggal_pembelian: ["tanggal_pembelian", "tgl_pembelian"], kppn: ["kppn"], kode_satker: ["kode_satker", "kode"], satuan_kerja: ["satuan_kerja", "satker"], pejabat_pengadaan: ["pejabat_pengadaan", "pejabat"], produk: ["produk"], total_nominal: ["total_nominal", "nominal"], nomor_rekening: ["nomor_rekening", "no_rekening"], nomor_invoice: ["nomor_invoice", "no_invoice"], metode_bayar: ["metode_bayar", "metode"], status_transaksi: ["status_transaksi", "status"], tanggal_deadline: ["tanggal_deadline", "deadline"], tanggal_jatuh_tempo: ["tanggal_jatuh_tempo", "jatuh_tempo"], tanggal_checkout: ["tanggal_checkout", "checkout"], tanggal_kirim: ["tanggal_kirim"], tanggal_terima: ["tanggal_terima"], tanggal_bayar: ["tanggal_bayar"] };
      this.importData = raw.slice(1).filter((r) => r.some((c) => c !== null && c !== undefined && c !== "")).map((row) => {
        const obj = {};
        Object.keys(maps).forEach((k) => { for (const ph of maps[k]) { if (hmap[norm(ph)] !== undefined) { obj[k] = row[hmap[norm(ph)]]; break; } } });
        return obj;
      });
      const cols = Object.keys(this.importData[0] || {});
      let html = "<thead><tr>" + cols.map((h) => `<th style="background:#2563eb;color:white;padding:8px;font-size:11px">${h}</th>`).join("") + "</tr></thead><tbody>";
      this.importData.slice(0, 5).forEach((row) => {
        html += "<tr>" + cols.map((h) => {
          let v = row[h] ?? "-";
          if (typeof v === "number" && v > 40000 && v < 50000) v = new Date((v - 25569) * 86400 * 1000).toISOString().split("T")[0];
          return `<td style="border:1px solid #e2e8f0;padding:8px;font-size:11px">${v}</td>`;
        }).join("") + "</tr>";
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
        .filter((r) => r.tanggal_pembelian && r.kode_satker && r.satuan_kerja)
        .map((r) => ({
          tanggal_pembelian: this.pd(r.tanggal_pembelian),
          kppn: r.kppn ? String(r.kppn).trim() : "KPPN PEKALONGAN",
          kode_satker: String(r.kode_satker).trim(),
          satuan_kerja: String(r.satuan_kerja).trim(),
          pejabat_pengadaan: r.pejabat_pengadaan ? String(r.pejabat_pengadaan).trim() : null,
          produk: r.produk ? String(r.produk).trim() : null,
          total_nominal: parseFloat(String(r.total_nominal || 0).replace(/[^\d.-]/g, "")) || 0,
          nomor_rekening: r.nomor_rekening ? String(r.nomor_rekening).trim() : null,
          nomor_invoice: r.nomor_invoice ? String(r.nomor_invoice).trim() : null,
          metode_bayar: r.metode_bayar ? String(r.metode_bayar).trim() : "VA",
          status_transaksi: r.status_transaksi ? String(r.status_transaksi).trim() : "Pending",
          tanggal_deadline: this.pd(r.tanggal_deadline),
          tanggal_jatuh_tempo: this.pd(r.tanggal_jatuh_tempo),
          tanggal_checkout: this.pd(r.tanggal_checkout),
          tanggal_kirim: this.pd(r.tanggal_kirim),
          tanggal_terima: this.pd(r.tanggal_terima),
          tanggal_bayar: this.pd(r.tanggal_bayar),
        }));
      if (!rows.length) throw new Error("Tidak ada baris valid (kolom wajib kurang)");
      await api.post("transaksi", rows);
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
