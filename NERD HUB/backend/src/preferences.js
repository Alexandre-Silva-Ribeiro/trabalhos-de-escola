import { config } from "./config.js";
import { supabaseAdmin } from "./supabase.js";

function normalizeTheme(value) {
  return value === "light" ? "light" : "dark";
}

function isMissingPreferencesTableError(error) {
  if (!error) {
    return false;
  }

  const message = String(error.message || "").toLowerCase();
  return error.code === "PGRST205" || message.includes("could not find the table");
}

function toPreferencesTableError(error) {
  if (isMissingPreferencesTableError(error)) {
    return new Error(`preferences_table_missing:${config.supabase.preferencesTable}`);
  }

  const detail = String(error?.message || "unknown_preferences_error");
  return new Error(`preferences_query_failed:${detail}`);
}

export async function getThemePreferenceForUser(userId) {
  const { data, error } = await supabaseAdmin
    .from(config.supabase.preferencesTable)
    .select("theme_preference, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw toPreferencesTableError(error);
  }

  if (!data) {
    return null;
  }

  return {
    userId,
    themePreference: normalizeTheme(data.theme_preference),
    updatedAt: data.updated_at || new Date().toISOString()
  };
}

export async function upsertThemePreferenceForUser(userId, themePreference) {
  const now = new Date().toISOString();
  const nextTheme = normalizeTheme(themePreference);
  const { data, error } = await supabaseAdmin
    .from(config.supabase.preferencesTable)
    .upsert(
      {
        user_id: userId,
        theme_preference: nextTheme,
        updated_at: now
      },
      {
        onConflict: "user_id"
      }
    )
    .select("theme_preference, updated_at")
    .single();

  if (error) {
    throw toPreferencesTableError(error);
  }

  return {
    userId,
    themePreference: normalizeTheme(data.theme_preference),
    updatedAt: data.updated_at || now
  };
}
