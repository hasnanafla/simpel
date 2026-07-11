const rekapPage = {
  data: [],

  async init() {
    this.setupEventListeners();
    await this.load();
  },

  async load() {
    try {
      const [satkerRes, transRes] = await Promise.all([api.get("satker"), api.get("transaksi")]);
      this.data = calculateRekapDigipay(satkerRes.data || [], transRes.data || []);
      this.render();
    } catch (err) {
      document.getElementById("rekapTableBody").innerHTML = `<tr><td colspan="9" class="error">Gagal memuat data: ${err.message}</td></tr>`;
    }
  },

  setupEventListeners() {
    document.getElementById("searchRekap").addEventListener("input", () => this.render());
    document.getElementById("statusFilterRekap").addEventListener("change", () => this.render());
    document.getElementById("btnPrint").addEventListener("click", () => this.printPDF());
    document.getElementById("btnExport").addEventListener("click", () => this.exportExcel());
  },

  getFiltered() {
    const q = (document.getElementById("searchRekap").value || "").toLowerCase();
    const sf = document.getElementById("statusFilterRekap").value;
    return this.data.filter((r) => ((r.kodeSatker || "").toLowerCase().includes(q) || (r.namaSatker || "").toLowerCase().includes(q)) && (!sf || r.status === sf));
  },

  render() {
    const filtered = this.getFiltered();
    const tbody = document.getElementById("rekapTableBody");
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="9" class="loading">Tidak ada data</td></tr>'; return; }
    tbody.innerHTML = filtered.map((r) => `<tr><td>${r.no}</td><td>${r.kodeSatker}</td><td>${r.namaSatker}</td><td>Rp ${(r.upRM || 0).toLocaleString("id-ID")}</td><td>${r.prosesTransaksi}</td><td>${r.vaTerbayar}</td><td>${r.transaksiKuitansi}</td><td><span class="badge ${r.status === "SUDAH" ? "badge-success" : "badge-danger"}">${r.status}</span></td><td>${r.keterangan}</td></tr>`).join("");
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
    doc.text("REKAPITULASI MONITORING DIGIPAY", pageWidth / 2, yPos, { align: "center" });
    yPos += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 7;

    const data = this.data;
    doc.setFontSize(9);
    doc.text(`Total Satker: ${data.length}   |   Sudah: ${data.filter((d) => d.status === "SUDAH").length}   |   Belum: ${data.filter((d) => d.status === "BELUM").length}`, leftMargin, yPos);
    yPos += 5;

    doc.autoTable({
      startY: yPos,
      head: [["No", "Kode", "Nama Satker", "Nominal (UP/RM)", "Proses", "VA Terbayar", "Trx Kuitansi", "Status", "Keterangan"]],
      body: data.map((r) => [r.no, r.kodeSatker, r.namaSatker, `Rp ${(r.upRM || 0).toLocaleString("id-ID")}`, r.prosesTransaksi, r.vaTerbayar, r.transaksiKuitansi, r.status, r.keterangan || "-"]),
      theme: "grid",
      headStyles: { fillColor: [30, 64, 175], fontSize: 8, fontStyle: "bold", halign: "center" },
      bodyStyles: { fontSize: 7, cellPadding: 2 },
      columnStyles: { 0: { halign: "center", cellWidth: 10 }, 1: { halign: "center", cellWidth: 20 }, 2: { cellWidth: 58 }, 3: { halign: "right", cellWidth: 32 }, 4: { halign: "center", cellWidth: 16 }, 5: { halign: "center", cellWidth: 18 }, 6: { halign: "center", cellWidth: 20 }, 7: { halign: "center", cellWidth: 20 }, 8: { cellWidth: 50 } },
      didDrawCell: (d) => {
        if (d.column.index === 7 && d.section === "body") {
          const isSudah = d.cell.raw === "SUDAH";
          doc.setFillColor(isSudah ? 16 : 239, isSudah ? 185 : 68, isSudah ? 129 : 68);
          doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7);
          doc.text(d.cell.raw, d.cell.x + d.cell.width / 2, d.cell.y + d.cell.height / 2, { align: "center", baseline: "middle" });
          doc.setTextColor(0, 0, 0);
        }
      },
    });

    doc.save(`Laporan-Rekap-Digipay-${new Date().toISOString().split("T")[0]}.pdf`);
  },

  exportExcel() {
    const data = this.data;
    const ws = XLSX.utils.json_to_sheet(data.map((x) => ({ No: x.no, "Kode Satker": x.kodeSatker, "Nama Satker": x.namaSatker, Nominal: x.upRM || 0, "Proses Transaksi": x.prosesTransaksi, "VA Terbayar": x.vaTerbayar, "Transaksi VA": x.transaksiKuitansi, Status: x.status, Keterangan: x.keterangan || "-" })));
    ws["!cols"] = [{ wch: 5 }, { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 35 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Digipay");
    XLSX.writeFile(wb, `Laporan-Rekap-Digipay-${new Date().toISOString().split("T")[0]}.xlsx`);
  },
};
