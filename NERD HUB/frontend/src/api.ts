import type { AuthPayload, VaultData, VaultPayload } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT";
  token?: string;
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }

  return payload;
}

export const api = {
  register(input: { username: string; displayName?: string; password: string }) {
    return request<AuthPayload>("/api/auth/register", {
      method: "POST",
      body: input
    });
  },
  login(input: { username: string; password: string }) {
    return request<AuthPayload>("/api/auth/login", {
      method: "POST",
      body: input
    });
  },
  changePassword(token: string, input: { currentPassword: string; nextPassword: string }) {
    return request<{ ok: boolean }>("/api/auth/change-password", {
      method: "POST",
      token,
      body: input
    });
  },
  getVault(token: string) {
    return request<VaultPayload>("/api/vault", {
      token
    });
  },
  saveVault(token: string, vault: VaultData) {
    return request<{ ok: boolean; updatedAt: string }>("/api/vault", {
      method: "PUT",
      token,
      body: { vault }
    });
  }
};
