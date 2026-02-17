import dotenv from "dotenv";

dotenv.config();

function required(name, fallback = "") {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

const port = Number(process.env.PORT || 4000);

export const config = {
  port,
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  encryptionSecret: required("ENCRYPTION_SECRET", "dev-encryption-secret"),
  supabase: {
    url: required("SUPABASE_URL", ""),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY", ""),
    preferencesTable: process.env.SUPABASE_PREFERENCES_TABLE || "user_preferences"
  }
};
