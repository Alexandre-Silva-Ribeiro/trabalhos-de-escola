import { requireUserPreferenceModel } from "./db/sequelize.js";

function normalizeTheme(value) {
  return value === "light" ? "light" : "dark";
}

export async function getThemePreferenceForUserFromSequelize(userId) {
  const UserPreference = requireUserPreferenceModel();
  const record = await UserPreference.findByPk(userId);
  if (!record) {
    return null;
  }

  return {
    userId,
    themePreference: normalizeTheme(record.themePreference),
    updatedAt: record.get("updated_at") || new Date().toISOString()
  };
}

export async function upsertThemePreferenceForUserFromSequelize(userId, themePreference) {
  const UserPreference = requireUserPreferenceModel();
  const nextTheme = normalizeTheme(themePreference);
  const now = new Date().toISOString();

  const [record] = await UserPreference.upsert(
    {
      userId,
      themePreference: nextTheme,
      updated_at: now
    },
    { returning: true }
  );

  return {
    userId,
    themePreference: normalizeTheme(record.themePreference),
    updatedAt: record.get("updated_at") || now
  };
}

