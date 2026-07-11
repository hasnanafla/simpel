const api = {
  async _handle(res) {
    let body = null;
    try { body = await res.json(); } catch (e) { /* no body */ }
    if (!res.ok) {
      const msg = (body && (body.error || body.message)) || `Request gagal (${res.status})`;
      throw new Error(msg);
    }
    return body;
  },

  async get(fn, params) {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await fetch(`${API_BASE}/${fn}${qs}`);
    return this._handle(res);
  },

  async post(fn, data) {
    const res = await fetch(`${API_BASE}/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return this._handle(res);
  },

  async put(fn, data) {
    const res = await fetch(`${API_BASE}/${fn}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return this._handle(res);
  },

  async delete(fn, params) {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await fetch(`${API_BASE}/${fn}${qs}`, { method: "DELETE" });
    return this._handle(res);
  },
};
