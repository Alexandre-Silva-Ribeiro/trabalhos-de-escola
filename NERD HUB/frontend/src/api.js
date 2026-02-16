const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }

  return payload;
}

export const api = {
  register(data) {
    return request("/api/auth/register", { method: "POST", body: data });
  },
  login(data) {
    return request("/api/auth/login", { method: "POST", body: data });
  },
  changePassword(token, data) {
    return request("/api/auth/change-password", { method: "POST", token, body: data });
  },
  getVault(token) {
    return request("/api/vault", { token });
  },
  saveVault(token, vault) {
    return request("/api/vault", { method: "PUT", token, body: { vault } });
  }
};
