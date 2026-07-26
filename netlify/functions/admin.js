const { getClient, json } = require("./_supabaseClient");

exports.handler = async (event) => {
  const supabase = getClient();

  try {
    if (event.httpMethod === "GET") {
      const { data, error } = await supabase
        .from("admin")
        .select("id_admin, username, created_at")
        .order("id_admin");
      if (error) throw error;
      return json(200, { data });
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const username = (body.username || "").trim();
      const password = body.password || "";
      if (username.length < 3) return json(400, { error: "Username minimal 3 karakter" });
      if (password.length < 6) return json(400, { error: "Password minimal 6 karakter" });

      const { data: existing } = await supabase
        .from("admin")
        .select("id_admin")
        .eq("username", username)
        .maybeSingle();
      if (existing) return json(409, { error: `Username "${username}" sudah digunakan` });

      const { data, error } = await supabase
        .from("admin")
        .insert([{ username, password }])
        .select("id_admin, username, created_at");
      if (error) throw error;
      return json(200, { data });
    }

    if (event.httpMethod === "PUT") {
      const body = JSON.parse(event.body || "{}");
      if (!body.id_admin) return json(400, { error: "id_admin wajib diisi" });
      const username = (body.username || "").trim();
      if (username.length < 3) return json(400, { error: "Username minimal 3 karakter" });

      const upd = { username };
      if (body.password) {
        if (body.password.length < 6) return json(400, { error: "Password minimal 6 karakter" });
        upd.password = body.password;
      }

      const { data, error } = await supabase
        .from("admin")
        .update(upd)
        .eq("id_admin", body.id_admin)
        .select("id_admin, username, created_at");
      if (error) throw error;
      return json(200, { data });
    }

    if (event.httpMethod === "DELETE") {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id) return json(400, { error: "id wajib diisi" });
      const { error } = await supabase.from("admin").delete().eq("id_admin", id);
      if (error) throw error;
      return json(200, { success: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
