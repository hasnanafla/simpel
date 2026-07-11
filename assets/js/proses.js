const prosesPage = {
  data: [],

  async init() {
    this.setupEventListeners();
    await this.load();
  },

  async load() {
    try {
      const [satkerRes, transRes] = await Promise.all([api.get("satker"), api.get("transaksi")]);
      this.data = calculateSheetProses(satkerRes.data || [], transRes.data || []);
      this.render();
    } catch (err) {
      document.getElementById("prosesTableBody").innerHTML = `<tr><td colspan="6" class="error">Gagal memuat data: ${err.message}</td></tr>`;
    }
  },

  setupEventListeners() {
    document.getElementById("searchProses").addEventListener("input", () => this.render());
    document.getElementById("statusFilter").addEventListener("change", () => this.render());
    document.getElementById("btnPrint").addEventListener("click", () => this.printPDF());
    document.getElementById("btnExport").addEventListener("click", () => this.exportExcel());
  },

  getFiltered() {
    const q = (document.getElementById("searchProses").value || "").toLowerCase();
    const sf = document.getElementById("statusFilter").value;
    return this.data.filter((p) => ((p.kodeSatker || "").toLowerCase().includes(q) || (p.namaSatker || "").toLowerCase().includes(q)) && (!sf || p.status === sf));
  },

  render() {
    const filtered = this.getFiltered();
    const tbody = document.getElementById("prosesTableBody");
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="6" class="loading">Tidak ada data</td></tr>'; return; }
    tbody.innerHTML = filtered.map((p) => `<tr><td>${p.kodeSatker}</td><td>${p.namaSatker}</td><td><span class="badge ${p.status === "SUDAH" ? "badge-success" : "badge-danger"}">${p.status}</span></td><td>${p.prosesTransaksi}</td><td>${p.transaksi}</td><td>${p.vaTerbayar}</td></tr>`).join("");
  },

  printPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("landscape");
    const pageWidth = doc.internal.pageSize.getWidth();
    const leftMargin = 14;
    const rightMargin = pageWidth - 14;
    let yPos = drawKopSurat(doc, pageWidth, leftMargin, rightMargin);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("LAPORAN MONITORING IMPLEMENTASI DIGIPAY", pageWidth / 2, yPos, { align: "center" });
    yPos += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 7;

    const data = this.data;
    doc.setFontSize(9);
    doc.text(`Total Satker: ${data.length}   |   Sudah Implementasi: ${data.filter((d) => d.status === "SUDAH").length}   |   Belum: ${data.filter((d) => d.status === "BELUM").length}`, leftMargin, yPos);
    yPos += 5;

    doc.autoTable({
      startY: yPos,
      head: [["No", "Kode Satker", "Nama Satker", "Status", "Proses Transaksi", "Transaksi Berhasil", "VA Terbayar"]],
      body: data.map((x, i) => [i + 1, x.kodeSatker, x.namaSatker, x.status, x.prosesTransaksi, x.transaksi, x.vaTerbayar]),
      theme: "grid",
      headStyles: { fillColor: [30, 64, 175], fontSize: 9, fontStyle: "bold", halign: "center" },
      bodyStyles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 0: { halign: "center", cellWidth: 12 }, 1: { halign: "center", cellWidth: 28 }, 2: { cellWidth: 95 }, 3: { halign: "center", cellWidth: 25 }, 4: { halign: "center", cellWidth: 30 }, 5: { halign: "center", cellWidth: 30 }, 6: { halign: "center", cellWidth: 28 } },
      didDrawCell: (d) => {
        if (d.column.index === 3 && d.section === "body") {
          const isSudah = d.cell.raw === "SUDAH";
          doc.setFillColor(isSudah ? 16 : 239, isSudah ? 185 : 68, isSudah ? 129 : 68);
          doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.text(d.cell.raw, d.cell.x + d.cell.width / 2, d.cell.y + d.cell.height / 2, { align: "center", baseline: "middle" });
          doc.setTextColor(0, 0, 0);
        }
      },
    });

    doc.save(`Laporan-Proses-${new Date().toISOString().split("T")[0]}.pdf`);
  },

  exportExcel() {
    const data = this.data;
    const ws = XLSX.utils.json_to_sheet(data.map((x, i) => ({ No: i + 1, "Kode Satker": x.kodeSatker, "Nama Satker": x.namaSatker, Status: x.status, "Proses Transaksi": x.prosesTransaksi, Transaksi: x.transaksi, "VA Terbayar": x.vaTerbayar })));
    ws["!cols"] = [{ wch: 5 }, { wch: 15 }, { wch: 40 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Proses Transaksi");
    XLSX.writeFile(wb, `Laporan-Proses-${new Date().toISOString().split("T")[0]}.xlsx`);
  },
};
