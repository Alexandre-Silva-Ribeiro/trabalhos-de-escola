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
const authProviderRaw = (process.env.AUTH_PROVIDER || "firebase").toLowerCase();
const authProvider = authProviderRaw === "supabase" ? "supabase" : "firebase";
const preferencesProviderRaw = (process.env.PREFERENCES_PROVIDER || "supabase").toLowerCase();
const preferencesProvider =
  preferencesProviderRaw === "sequelize" || preferencesProviderRaw === "supabase"
    ? preferencesProviderRaw
    : "supabase";

export const config = {
  port,
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  encryptionSecret: required("ENCRYPTION_SECRET", "dev-encryption-secret"),
  authProvider,
  preferencesProvider,
  supabase: {
    url: process.env.SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    preferencesTable: process.env.SUPABASE_PREFERENCES_TABLE || "user_preferences"
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: process.env.FIREBASE_PRIVATE_KEY || ""
  },
  database: {
    url: process.env.DATABASE_URL || "",
    ssl: process.env.DATABASE_SSL === "true",
    syncOnStart: process.env.DB_SYNC_ON_START === "true",
    preferencesTable: process.env.SEQUELIZE_PREFERENCES_TABLE || "user_preferences_local"
  }
};
