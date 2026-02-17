import type { User } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "./supabase";
import type {
  AuthPayload,
  RegisterPayload,
  ThemeMode,
  UserPreferencesPayload,
  UserSummary,
  VaultData,
  VaultPayload
} from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT";
  token?: string;
  body?: unknown;
}

function ensureSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  }
}

function normalizeAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Credenciais invalidas. Confira e-mail e senha.";
  }
  if (lower.includes("email not confirmed")) {
    return "E-mail ainda nao confirmado. Verifique sua caixa de entrada.";
  }
  if (lower.includes("user already registered")) {
    return "Esse e-mail ja esta cadastrado.";
  }
  return message;
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

function toUserSummary(user: User): UserSummary {
  const metadata = user.user_metadata || {};
  const email = user.email || "";
  const emailName = email.includes("@") ? email.slice(0, email.indexOf("@")) : "user";
  const usernameFromMeta = String(metadata.username || "").trim().toLowerCase();
  const username =
    usernameFromMeta && /^[a-z0-9_]{3,30}$/.test(usernameFromMeta)
      ? usernameFromMeta
      : emailName.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 30) || "user";
  const displayNameFromMeta = String(metadata.display_name || metadata.full_name || "").trim();

  return {
    id: user.id,
    username,
    email,
    emailVerified: Boolean(user.email_confirmed_at),
    displayName: displayNameFromMeta || username,
    createdAt: user.created_at || new Date().toISOString(),
    updatedAt: user.updated_at || user.created_at || new Date().toISOString()
  };
}

async function loadVaultPayload(token: string): Promise<VaultPayload> {
  return request<VaultPayload>("/api/vault", { token });
}

export const api = {
  async register(input: {
    username: string;
    email: string;
    displayName?: string;
    password: string;
  }): Promise<RegisterPayload> {
    ensureSupabaseConfigured();

    const username = input.username.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();
    const displayName = (input.displayName || "").trim();

    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          username,
          display_name: displayName || username
        },
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined
      }
    });

    if (error) {
      throw new Error(normalizeAuthError(error.message));
    }

    const needsVerification = !data.session;
    return {
      ok: true,
      needsVerification,
      email,
      message: needsVerification
        ? "Conta criada. Verifique seu e-mail e clique no link para ativar."
        : "Conta criada com sucesso."
    };
  },

  async login(input: { email: string; password: string }): Promise<AuthPayload> {
    ensureSupabaseConfigured();

    const email = input.email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: input.password
    });

    if (error) {
      throw new Error(normalizeAuthError(error.message));
    }

    if (!data.session || !data.user) {
      throw new Error("Falha ao iniciar sessao.");
    }

    const token = data.session.access_token;
    const user = toUserSummary(data.user);
    const vaultPayload = await loadVaultPayload(token);
    return {
      token,
      user,
      vault: vaultPayload.vault,
      themePreference: vaultPayload.themePreference === "light" ? "light" : "dark"
    };
  },

  async restoreSession(): Promise<AuthPayload | null> {
    ensureSupabaseConfigured();

    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      return null;
    }

    const token = data.session.access_token;
    const user = toUserSummary(data.session.user);

    try {
      const vaultPayload = await loadVaultPayload(token);
      return {
        token,
        user,
        vault: vaultPayload.vault,
        themePreference: vaultPayload.themePreference === "light" ? "light" : "dark"
      };
    } catch {
      await supabase.auth.signOut();
      return null;
    }
  },

  async resendVerification(input: { email: string }): Promise<{ ok: boolean; message: string }> {
    ensureSupabaseConfigured();
    const email = input.email.trim().toLowerCase();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined
      }
    });

    if (error) {
      throw new Error(normalizeAuthError(error.message));
    }

    return {
      ok: true,
      message: "Link de verificacao reenviado."
    };
  },

  async changePassword(token: string, input: { currentPassword: string; nextPassword: string }): Promise<{ ok: boolean }> {
    ensureSupabaseConfigured();

    if (!input.currentPassword || !input.nextPassword || input.nextPassword.length < 8) {
      throw new Error("Senha invalida.");
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) {
      throw new Error("Sessao invalida.");
    }

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: input.currentPassword
    });

    if (reauthError) {
      throw new Error("Senha atual incorreta.");
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: input.nextPassword
    });

    if (updateError) {
      throw new Error(normalizeAuthError(updateError.message));
    }

    return { ok: true };
  },

  async logout(): Promise<void> {
    if (!isSupabaseConfigured) {
      return;
    }
    await supabase.auth.signOut();
  },

  getThemePreference(token: string) {
    return request<UserPreferencesPayload>("/api/user/preferences", { token });
  },

  updateThemePreference(token: string, themePreference: ThemeMode) {
    return request<{ ok: boolean; themePreference: ThemeMode; updatedAt: string }>("/api/user/preferences", {
      method: "PUT",
      token,
      body: { themePreference }
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
