

const filterPeriode = {
  state: {
    dari: null, // format 'YYYY-MM-DD'
    sampai: null,
    activePreset: 'semua',
  },

  init() {
    document.querySelectorAll('.btn-period').forEach((btn) => {
      btn.addEventListener('click', () => this.handlePresetClick(btn));
    });

    document
      .getElementById('btnTerapkanFilterPeriode')
      .addEventListener('click', () => this.handleCustomRangeApply());

    document
      .getElementById('btnResetFilterPeriode')
      .addEventListener('click', () => this.reset());

    this.updateInfo();
  },

  handlePresetClick(btn) {
    const preset = btn.dataset.period;
    const range = this.computeRangeForPreset(preset);

    this.state.dari = range.dari;
    this.state.sampai = range.sampai;
    this.state.activePreset = preset;

    // Sinkronkan input custom range dengan preset yang dipilih,
    // supaya user bisa lihat/edit lebih lanjut kalau mau
    document.getElementById('filterTglDari').value = range.dari || '';
    document.getElementById('filterTglSampai').value = range.sampai || '';

    this.setActiveButton(preset);
    this.updateInfo();
    this.applyFilter();
  },

  handleCustomRangeApply() {
    const dari = document.getElementById('filterTglDari').value;
    const sampai = document.getElementById('filterTglSampai').value;

    if (!dari || !sampai) {
      alert('Isi kedua tanggal (dari dan sampai) sebelum menerapkan filter.');
      return;
    }

    if (dari > sampai) {
      alert('Tanggal "Dari" tidak boleh lebih besar dari tanggal "Sampai".');
      return;
    }

    this.state.dari = dari;
    this.state.sampai = sampai;
    this.state.activePreset = 'custom';

    this.setActiveButton(null); // tidak ada preset tombol yang aktif
    this.updateInfo();
    this.applyFilter();
  },

  reset() {
    this.state.dari = null;
    this.state.sampai = null;
    this.state.activePreset = 'semua';

    document.getElementById('filterTglDari').value = '';
    document.getElementById('filterTglSampai').value = '';

    this.setActiveButton('semua');
    this.updateInfo();
    this.applyFilter();
  },

  setActiveButton(preset) {
    document.querySelectorAll('.btn-period').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.period === preset);
    });
  },

  updateInfo() {
    const infoEl = document.getElementById('filterPeriodeInfo');
    if (!this.state.dari || !this.state.sampai) {
      infoEl.textContent = 'Menampilkan semua data (tanpa filter periode).';
      return;
    }
    infoEl.textContent = `Menampilkan data dari ${this.formatTanggalIndo(this.state.dari)} sampai ${this.formatTanggalIndo(this.state.sampai)}`;
  },

  formatTanggalIndo(isoDate) {
    const bulanIndo = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
    ];
    const [y, m, d] = isoDate.split('-');
    return `${parseInt(d, 10)} ${bulanIndo[parseInt(m, 10) - 1]} ${y}`;
  },

  // Hitung rentang tanggal (dari, sampai) berdasarkan nama preset.
  // Semua tanggal dikembalikan dalam format 'YYYY-MM-DD' agar cocok
  // dengan <input type="date"> dan mudah dikirim ke server.
  computeRangeForPreset(preset) {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'semua') {
      return { dari: null, sampai: null };
    }

    if (preset === 'hari-ini') {
      return { dari: toISO(today), sampai: toISO(today) };
    }

    if (preset === 'minggu-ini') {
      const day = today.getDay(); // 0 = Minggu
      const diffToMonday = day === 0 ? 6 : day - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { dari: toISO(monday), sampai: toISO(sunday) };
    }

    if (preset === 'bulan-ini') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { dari: toISO(first), sampai: toISO(last) };
    }

    if (preset.startsWith('triwulan-')) {
      const quarter = parseInt(preset.split('-')[1], 10); // 1-4
      const startMonth = (quarter - 1) * 3; // 0, 3, 6, 9
      const first = new Date(today.getFullYear(), startMonth, 1);
      const last = new Date(today.getFullYear(), startMonth + 3, 0);
      return { dari: toISO(first), sampai: toISO(last) };
    }

    if (preset === 'tahun-ini') {
      const first = new Date(today.getFullYear(), 0, 1);
      const last = new Date(today.getFullYear(), 11, 31);
      return { dari: toISO(first), sampai: toISO(last) };
    }

    return { dari: null, sampai: null };
  },

  // Dipanggil setiap kali filter berubah. Ini titik hubung ke pemuatan data.
  applyFilter() {
    // =====================================================
    // INTEGRASI DENGAN transaksiPage — SESUAIKAN DENGAN KODE ASLI
    // =====================================================
    // Karena tabel sudah pakai server-side pagination, filter periode
    // sebaiknya dikirim sebagai parameter ke request yang sama (bukan
    // filter di sisi client), supaya jumlah data & halaman tetap akurat.
    //
    // Contoh jika transaksiPage sudah punya fungsi loadData(options):
    //
    //   if (window.transaksiPage && typeof transaksiPage.loadData === 'function') {
    //     transaksiPage.loadData({
    //       page: 1, // reset ke halaman 1 setiap kali filter berubah
    //       tglDari: this.state.dari,
    //       tglSampai: this.state.sampai,
    //     });
    //   }
    //
    // Ganti nama fungsi & parameter di atas sesuai yang ada di transaksi.js.
    // Kalau transaksi.js Anda memanggil endpoint Netlify Function untuk
    // ambil data, tambahkan tglDari & tglSampai sebagai query param di sana,
    // lalu di sisi server tambahkan filter:
    //
    //   let query = supabase.from('transaksi').select('*', { count: 'exact' });
    //   if (tglDari) query = query.gte('tanggal_pembelian', tglDari);
    //   if (tglSampai) query = query.lte('tanggal_pembelian', tglSampai);
    //
    console.log('Filter periode diterapkan:', this.state);

    if (window.transaksiPage && typeof transaksiPage.loadData === 'function') {
      transaksiPage.loadData({
        page: 1,
        tglDari: this.state.dari,
        tglSampai: this.state.sampai,
      });
    }
  },

  // Panggil ini dari transaksiPage saat butuh tahu filter aktif
  // (misalnya untuk fitur export PDF/Excel supaya ikut filter yang sama)
  getActiveFilter() {
    return {
      tglDari: this.state.dari,
      tglSampai: this.state.sampai,
    };
  },
};

document.addEventListener('DOMContentLoaded', () => {
  filterPeriode.init();
});
