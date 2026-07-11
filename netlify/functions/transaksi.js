const { getClient, json } = require("./_supabaseClient");

function cleanRow(r) {
  return {
    tanggal_pembelian: r.tanggal_pembelian || null,
    kppn: r.kppn ? String(r.kppn).trim() : "KPPN PEKALONGAN",
    kode_satker: r.kode_satker ? String(r.kode_satker).trim() : null,
    satuan_kerja: r.satuan_kerja ? String(r.satuan_kerja).trim() : null,
    pejabat_pengadaan: r.pejabat_pengadaan ? String(r.pejabat_pengadaan).trim() : null,
    produk: r.produk ? String(r.produk).trim() : null,
    total_nominal: parseFloat(r.total_nominal) || 0,
    nomor_rekening: r.nomor_rekening ? String(r.nomor_rekening).trim() : null,
    nomor_invoice: r.nomor_invoice ? String(r.nomor_invoice).trim() : null,
    metode_bayar: r.metode_bayar || "VA",
    status_transaksi: r.status_transaksi || "Pending",
    tanggal_deadline: r.tanggal_deadline || null,
    tanggal_jatuh_tempo: r.tanggal_jatuh_tempo || null,
    tanggal_checkout: r.tanggal_checkout || null,
    tanggal_kirim: r.tanggal_kirim || null,
    tanggal_terima: r.tanggal_terima || null,
    tanggal_bayar: r.tanggal_bayar || null,
  };
}

exports.handler = async (event) => {
  const supabase = getClient();

  try {
    if (event.httpMethod === "GET") {
      let all = [];
      let pageIdx = 0;
      while (true) {
        const { data, error } = await supabase
          .from("tbl_transaksi")
          .select("*")
          .order("no")
          .range(pageIdx * 1000, (pageIdx + 1) * 1000 - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < 1000) break;
        pageIdx++;
      }
      return json(200, { data: all });
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const rows = Array.isArray(body) ? body : [body];
      const clean = rows.map(cleanRow);
      for (const r of clean) {
        if (!r.tanggal_pembelian || !r.kode_satker || !r.satuan_kerja) {
          return json(400, { error: "tanggal_pembelian, kode_satker, satuan_kerja wajib diisi" });
        }
      }
      const { data, error } = await supabase.from("tbl_transaksi").insert(clean).select();
      if (error) throw error;
      return json(200, { data });
    }

    if (event.httpMethod === "PUT") {
      const body = JSON.parse(event.body || "{}");
      if (!body.no) return json(400, { error: "no wajib diisi" });
      const upd = cleanRow(body);
      const { data, error } = await supabase
        .from("tbl_transaksi")
        .update(upd)
        .eq("no", body.no)
        .select();
      if (error) throw error;
      return json(200, { data });
    }

    if (event.httpMethod === "DELETE") {
      const no = event.queryStringParameters && event.queryStringParameters.no;
      if (!no) return json(400, { error: "no wajib diisi" });
      const { error } = await supabase.from("tbl_transaksi").delete().eq("no", no);
      if (error) throw error;
      return json(200, { success: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
