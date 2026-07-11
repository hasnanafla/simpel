const { getClient, json } = require("./_supabaseClient");

exports.handler = async (event) => {
  const supabase = getClient();

  try {
    if (event.httpMethod === "GET") {
      const { data, error } = await supabase.from("tbl_satker").select("*").order("id_satker");
      if (error) throw error;
      return json(200, { data });
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const rows = Array.isArray(body) ? body : [body];

      // Bulk-safe upsert on kode_satker (covers single add + excel import)
      const clean = rows.map((r) => ({
        kode_satker: String(r.kode_satker || "").trim(),
        nama_satker: String(r.nama_satker || "").trim(),
        nominal: parseFloat(r.nominal) || 0,
        nomor_wa: r.nomor_wa ? String(r.nomor_wa).trim() : null,
      }));

      for (const r of clean) {
        if (!r.kode_satker || !r.nama_satker) {
          return json(400, { error: "kode_satker dan nama_satker wajib diisi" });
        }
      }

      const { data, error } = await supabase
        .from("tbl_satker")
        .upsert(clean, { onConflict: "kode_satker" })
        .select();
      if (error) throw error;
      return json(200, { data });
    }

    if (event.httpMethod === "PUT") {
      const body = JSON.parse(event.body || "{}");
      if (!body.kode_satker) return json(400, { error: "kode_satker wajib diisi" });
      const upd = {
        nama_satker: body.nama_satker,
        nominal: parseFloat(body.nominal) || 0,
        nomor_wa: body.nomor_wa || null,
      };
      const { data, error } = await supabase
        .from("tbl_satker")
        .update(upd)
        .eq("kode_satker", body.kode_satker)
        .select();
      if (error) throw error;
      return json(200, { data });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
