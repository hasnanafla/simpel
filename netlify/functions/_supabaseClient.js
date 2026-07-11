const { createClient } = require("@supabase/supabase-js");

// SUPABASE_URL and SUPABASE_KEY are set as Netlify Environment Variables
// (Site settings -> Environment variables). They are NEVER exposed to the browser
// because this file only runs inside the Netlify Function (server-side).
function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_KEY belum diset di Netlify Environment Variables");
  }
  return createClient(url, key);
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

module.exports = { getClient, json };
