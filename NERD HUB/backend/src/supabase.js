import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

export const isSupabaseConfigured = Boolean(config.supabase.url && config.supabase.serviceRoleKey);

export const supabaseAdmin = isSupabaseConfigured
  ? createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;
