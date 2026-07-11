const { getClient, json } = require("./_supabaseClient");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { success: false, message: "Method not allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { success: false, message: "Body tidak valid" });
  }

  const { username, password } = body;
  if (!username || !password) {
    return json(400, { success: false, message: "Username dan password harus diisi" });
  }

  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("admin")
      .select("id_admin, username, password")
      .eq("username", username)
      .single();

    if (error || !data || data.password !== password) {
      return json(401, { success: false, message: "Username atau password salah" });
    }

    return json(200, { success: true, username: data.username });
  } catch (err) {
    return json(500, { success: false, message: err.message });
  }
};
