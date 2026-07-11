function calculateSheetProses(satkerData, transaksiData) {
  const g = {};
  satkerData.forEach((s) => {
    g[s.kode_satker] = { kodeSatker: s.kode_satker, namaSatker: s.nama_satker, totalData: 0, jumlahTransaksi: 0, vaTerbayar: 0 };
  });
  transaksiData.forEach((t) => {
    if (g[t.kode_satker]) {
      g[t.kode_satker].totalData++;
      if (t.nomor_invoice && t.tanggal_bayar) g[t.kode_satker].jumlahTransaksi++;
      if (t.metode_bayar === "VA" && t.tanggal_bayar) g[t.kode_satker].vaTerbayar++;
    }
  });
  return Object.values(g).map((x) => ({
    kodeSatker: x.kodeSatker,
    namaSatker: x.namaSatker,
    status: x.vaTerbayar > 0 ? "SUDAH" : "BELUM",
    prosesTransaksi: x.totalData,
    transaksi: x.jumlahTransaksi,
    vaTerbayar: x.vaTerbayar,
  }));
}

function calculateRekapDigipay(satkerData, transaksiData) {
  const g = {};
  satkerData.forEach((s) => {
    g[s.kode_satker] = { kodeSatker: s.kode_satker, namaSatker: s.nama_satker, upRM: s.nominal || 0, prosesTransaksi: 0, vaTerbayar: 0, transaksiKuitansi: 0, totalNominalTrx: 0 };
  });
  transaksiData.forEach((t) => {
    if (g[t.kode_satker]) {
      g[t.kode_satker].prosesTransaksi++;
      g[t.kode_satker].totalNominalTrx += t.total_nominal || 0;
      if (t.nomor_invoice && t.tanggal_bayar) g[t.kode_satker].transaksiKuitansi++;
      if (t.metode_bayar === "VA" && t.tanggal_bayar) g[t.kode_satker].vaTerbayar++;
    }
  });
  return Object.values(g).map((x, i) => ({
    no: i + 1,
    kodeSatker: x.kodeSatker,
    namaSatker: x.namaSatker,
    upRM: x.upRM,
    prosesTransaksi: x.prosesTransaksi,
    vaTerbayar: x.vaTerbayar,
    transaksiKuitansi: x.transaksiKuitansi,
    totalNominalTrx: x.totalNominalTrx,
    status: x.vaTerbayar > 0 ? "SUDAH" : "BELUM",
    keterangan: x.vaTerbayar > 0 ? "" : "Belum menggunakan Digipay",
  }));
}

function drawKopSurat(doc, pageWidth, leftMargin, rightMargin) {
  let yPos = 15;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("KEMENTERIAN KEUANGAN REPUBLIK INDONESIA", pageWidth / 2, yPos, { align: "center" });
  yPos += 5;
  doc.setFontSize(11);
  doc.text("DIREKTORAT JENDERAL PERBENDAHARAAN", pageWidth / 2, yPos, { align: "center" });
  yPos += 4.5;
  doc.text("KANTOR WILAYAH DIREKTORAT JENDERAL PERBENDAHARAAN PROVINSI", pageWidth / 2, yPos, { align: "center" });
  yPos += 4;
  doc.text("JAWA TENGAH", pageWidth / 2, yPos, { align: "center" });
  yPos += 4;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("KANTOR PELAYANAN PERBENDAHARAAN NEGARA TIPE A1 PEKALONGAN", pageWidth / 2, yPos, { align: "center" });
  yPos += 3.5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("JALAN BAHAGIA NO. 44, PEKALONGAN 51117   TELEPON (0285) 421476   FAKSIMILE (0285) 421479", pageWidth / 2, yPos, { align: "center" });
  yPos += 3.5;
  doc.text("LAMAN www.djpb.kemenkeu.go.id/kppn/pekalongan", pageWidth / 2, yPos, { align: "center" });
  yPos += 4;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.line(leftMargin, yPos, rightMargin, yPos);
  yPos += 1.5;
  doc.setLineWidth(0.3);
  doc.line(leftMargin, yPos, rightMargin, yPos);
  return yPos + 8;
}

function fmtRupiah(v) {
  return "Rp " + (v || 0).toLocaleString("id-ID");
}
