const chartInstances = {};
function destroyChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

const dashboardPage = {
  satkerData: [],
  transaksiData: [],
  sheetProsesData: [],
  rekapDigipayData: [],

  async init() {
    try {
      const [satkerRes, transaksiRes] = await Promise.all([api.get("satker"), api.get("transaksi")]);
      this.satkerData = satkerRes.data || [];
      this.transaksiData = transaksiRes.data || [];
      this.sheetProsesData = calculateSheetProses(this.satkerData, this.transaksiData);
      this.rekapDigipayData = calculateRekapDigipay(this.satkerData, this.transaksiData);
      this.updateStats();
      this.renderCharts();
    } catch (err) {
      console.error("Gagal memuat dashboard:", err);
      document.getElementById("rankingTableBody").innerHTML =
        `<tr><td colspan="7" class="error">Gagal memuat data: ${err.message}</td></tr>`;
    }
  },

  updateStats() {
    const total = this.satkerData.length;
    const sudah = this.sheetProsesData.filter((s) => s.status === "SUDAH").length;
    const belum = total - sudah;
    const totalVA = this.transaksiData.filter((t) => t.metode_bayar === "VA" && t.tanggal_bayar).length;
    const trxBerhasil = this.transaksiData.filter((t) => t.status_transaksi === "Diterima Satker (semuanya)").length;
    const trxPending = this.transaksiData.filter((t) => t.status_transaksi === "Dikembalikan PPK").length;
    const deadlineCount = this.transaksiData.filter((t) => t.status_transaksi === "Transaksi dibatalkan (expired)").length;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sevenDays = new Date(today); sevenDays.setDate(sevenDays.getDate() + 7);
    const deadlineItems = this.transaksiData.filter((t) => {
      if (!t.tanggal_deadline || t.tanggal_bayar) return false;
      const d = new Date(t.tanggal_deadline);
      return d >= today && d <= sevenDays;
    });

    document.getElementById("totalSatker").textContent = total;
    document.getElementById("sudahImplement").textContent = sudah;
    document.getElementById("belumImplement").textContent = belum;
    document.getElementById("totalTransaksi").textContent = this.transaksiData.length;
    document.getElementById("totalVA").textContent = totalVA;
    document.getElementById("trxBerhasil").textContent = trxBerhasil;
    document.getElementById("trxPending").textContent = trxPending;
    document.getElementById("deadlineCount").textContent = deadlineCount;
    document.getElementById("pctSudah").textContent = total ? Math.round((sudah / total) * 100) + "% dari total satker" : "0%";
    document.getElementById("pctBelum").textContent = total ? Math.round((belum / total) * 100) + "% dari total satker" : "0%";

    const pct = total ? Math.round((sudah / total) * 100) : 0;
    document.getElementById("progressBar").style.width = pct + "%";
    document.getElementById("progressLabel").textContent = sudah + " / " + total;
    document.getElementById("progressPct").textContent = pct + "%";

    const alertSection = document.getElementById("alertSection");
    if (deadlineItems.length > 0) {
      alertSection.style.display = "block";
      document.getElementById("alertList").innerHTML = deadlineItems.slice(0, 5).map((t) => {
        const daysLeft = Math.ceil((new Date(t.tanggal_deadline) - today) / 86400000);
        return `<div class="alert-item"><span class="satker-name">${t.satuan_kerja || t.kode_satker} — Invoice: ${t.nomor_invoice || "-"}</span><span class="deadline">⏰ ${daysLeft} hari lagi (${t.tanggal_deadline})</span></div>`;
      }).join("");
    } else {
      alertSection.style.display = "none";
    }

    const ranked = [...this.sheetProsesData].sort((a, b) => b.vaTerbayar - a.vaTerbayar).slice(0, 10);
    document.getElementById("rankingTableBody").innerHTML = ranked.length
      ? ranked.map((r, i) => {
          const rankClass = i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : "";
          const rankIcon = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";
          return `<tr><td><span class="rank-badge ${rankClass}">${rankIcon || i + 1}</span></td><td>${r.kodeSatker}</td><td>${r.namaSatker}</td><td>${r.prosesTransaksi}</td><td><strong style="color:#2563eb">${r.vaTerbayar}</strong></td><td>${r.transaksi}</td><td><span class="badge ${r.status === "SUDAH" ? "badge-success" : "badge-danger"}">${r.status}</span></td></tr>`;
        }).join("")
      : '<tr><td colspan="7" class="loading">Tidak ada data</td></tr>';
  },

  renderCharts() {
    const topData = [...this.sheetProsesData].sort((a, b) => b.vaTerbayar - a.vaTerbayar).slice(0, 10);
    destroyChart("chartTopSatker");
    if (document.getElementById("chartTopSatker")) {
      chartInstances["chartTopSatker"] = new Chart(document.getElementById("chartTopSatker"), {
        type: "bar",
        data: {
          labels: topData.map((d) => (d.namaSatker.length > 28 ? d.namaSatker.slice(0, 28) + "…" : d.namaSatker)),
          datasets: [
            { label: "VA Terbayar", data: topData.map((d) => d.vaTerbayar), backgroundColor: topData.map((_, i) => (i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7f32" : "#3b82f6")), borderRadius: 6 },
            { label: "Proses Transaksi", data: topData.map((d) => d.prosesTransaksi), backgroundColor: "#e0e7ff", borderRadius: 6 },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 11 }, maxRotation: 30, autoSkip: false }, grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "#f1f5f9" } } } },
      });
    }

    const sudah = this.sheetProsesData.filter((s) => s.status === "SUDAH").length;
    const belum = this.sheetProsesData.filter((s) => s.status === "BELUM").length;
    destroyChart("chartStatus");
    if (document.getElementById("chartStatus")) {
      chartInstances["chartStatus"] = new Chart(document.getElementById("chartStatus"), {
        type: "doughnut",
        data: { labels: ["Sudah (" + sudah + ")", "Belum (" + belum + ")"], datasets: [{ data: [sudah, belum], backgroundColor: ["#10b981", "#ef4444"], borderWidth: 3, borderColor: "#fff", hoverBorderWidth: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: "65%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => " " + ctx.label + ": " + ctx.raw + " satker" } } } },
      });
    }

    const metodeCounts = {};
    this.transaksiData.forEach((t) => { const m = t.metode_bayar || "Lainnya"; metodeCounts[m] = (metodeCounts[m] || 0) + 1; });
    destroyChart("chartMetode");
    if (document.getElementById("chartMetode")) {
      chartInstances["chartMetode"] = new Chart(document.getElementById("chartMetode"), {
        type: "pie",
        data: { labels: Object.keys(metodeCounts), datasets: [{ data: Object.values(metodeCounts), backgroundColor: ["#2563eb", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"], borderWidth: 3, borderColor: "#fff" }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => " " + ctx.label + ": " + ctx.raw + " transaksi" } } } },
      });
    }

    const trendMap = {};
    this.transaksiData.forEach((t) => { if (!t.tanggal_pembelian) return; const key = t.tanggal_pembelian.slice(0, 7); trendMap[key] = (trendMap[key] || 0) + 1; });
    const sortedKeys = Object.keys(trendMap).sort();
    const labelBulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const trendLabels = sortedKeys.map((k) => { const [y, m] = k.split("-"); return labelBulan[parseInt(m) - 1] + " " + y.slice(2); });
    destroyChart("chartTren");
    if (document.getElementById("chartTren")) {
      chartInstances["chartTren"] = new Chart(document.getElementById("chartTren"), {
        type: "line",
        data: { labels: trendLabels, datasets: [{ label: "Jumlah Transaksi", data: sortedKeys.map((k) => trendMap[k]), borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.08)", fill: true, tension: 0.4, pointBackgroundColor: "#2563eb", pointRadius: 5, pointHoverRadius: 7 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "#f1f5f9" } } } },
      });
    }

    const top10 = [...this.rekapDigipayData].sort((a, b) => b.totalNominalTrx - a.totalNominalTrx).slice(0, 10);
    destroyChart("chartRealisasi");
    if (document.getElementById("chartRealisasi")) {
      chartInstances["chartRealisasi"] = new Chart(document.getElementById("chartRealisasi"), {
        type: "bar",
        data: {
          labels: top10.map((d) => (d.namaSatker.length > 22 ? d.namaSatker.slice(0, 22) + "…" : d.namaSatker)),
          datasets: [
            { label: "UP/RM (Nominal)", data: top10.map((d) => d.upRM), backgroundColor: "#e0e7ff", borderRadius: 4 },
            { label: "Realisasi Transaksi", data: top10.map((d) => d.totalNominalTrx), backgroundColor: "#2563eb", borderRadius: 4 },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 10 }, maxRotation: 30, autoSkip: false }, grid: { display: false } }, y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { callback: (v) => "Rp" + (v >= 1e6 ? (v / 1e6).toFixed(0) + "jt" : v.toLocaleString("id-ID")) } } } },
      });
    }
  },
};
