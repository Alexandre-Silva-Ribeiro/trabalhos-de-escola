import cors from "cors";
import express from "express";
import { z } from "zod";

import { authMiddleware } from "./auth.js";
import { config } from "./config.js";
import { decryptJson, encryptJson } from "./crypto.js";
import { getThemePreferenceForUser, upsertThemePreferenceForUser } from "./preferences.js";
import { findVaultRecordByUserId, upsertVaultRecord } from "./store.js";
import { createDefaultVault, sanitizeVaultInput } from "./vault.js";

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === config.frontendOrigin) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS"));
    }
  })
);

app.use(express.json({ limit: "2mb" }));

function firstZodIssue(schemaResult) {
  if (schemaResult.success) {
    return null;
  }
  const issue = schemaResult.error.issues[0];
  const path = issue.path.length ? issue.path.join(".") : "body";
  return `${path}: ${issue.message}`;
}

function parseBody(schema, req, res) {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: firstZodIssue(parsed) || "Invalid request body" });
  }
  return parsed.data;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "nerd-hub-backend", at: new Date().toISOString() });
});

app.get("/api/vault", authMiddleware, async (req, res) => {
  try {
    const preference = await getThemePreferenceForUser(req.auth.userId);

    const record = await findVaultRecordByUserId(req.auth.userId);
    const themePreference =
      preference?.themePreference === "light"
        ? "light"
        : "dark";
    if (!record) {
      const vault = createDefaultVault();
      const encrypted = encryptJson(vault, config.encryptionSecret);
      const saved = await upsertVaultRecord(req.auth.userId, encrypted);
      if (!preference) {
        await upsertThemePreferenceForUser(req.auth.userId, themePreference);
      }
      return res.json({ vault, updatedAt: saved.updatedAt, themePreference });
    }

    const vault = decryptJson(record.vault, config.encryptionSecret);
    if (!preference) {
      await upsertThemePreferenceForUser(req.auth.userId, themePreference);
    }
    return res.json({ vault, updatedAt: record.updatedAt, themePreference });
  } catch (error) {
    const message = String(error?.message || "");
    if (message.startsWith("preferences_table_missing")) {
      return res
        .status(500)
        .json({ error: "Supabase preferences table missing. Run migration for user_preferences." });
    }
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ error: "Failed to load vault" });
  }
});

const saveVaultSchema = z.object({
  vault: z.unknown()
});

app.put("/api/vault", authMiddleware, async (req, res) => {
  const body = parseBody(saveVaultSchema, req, res);
  if (!body) {
    return;
  }

  try {
    const sanitizedVault = sanitizeVaultInput(body.vault);
    const encrypted = encryptJson(sanitizedVault, config.encryptionSecret);
    const record = await upsertVaultRecord(req.auth.userId, encrypted);
    return res.json({ ok: true, updatedAt: record.updatedAt });
  } catch (error) {
    const message = String(error?.message || "");
    if (message.startsWith("invalid_vault")) {
      return res.status(400).json({ error: message });
    }
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(400).json({ error: "Invalid vault payload" });
  }
});

app.get("/api/user/preferences", authMiddleware, async (req, res) => {
  try {
    const existing = await getThemePreferenceForUser(req.auth.userId);
    if (!existing) {
      const created = await upsertThemePreferenceForUser(req.auth.userId, "dark");
      return res.json({
        themePreference: created.themePreference,
        updatedAt: created.updatedAt
      });
    }

    return res.json({
      themePreference: existing.themePreference,
      updatedAt: existing.updatedAt
    });
  } catch (error) {
    const message = String(error?.message || "");
    if (message.startsWith("preferences_table_missing")) {
      return res
        .status(500)
        .json({ error: "Supabase preferences table missing. Run migration for user_preferences." });
    }
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ error: "Failed to load user preferences" });
  }
});

const savePreferencesSchema = z.object({
  themePreference: z.enum(["dark", "light"])
});

app.put("/api/user/preferences", authMiddleware, async (req, res) => {
  const body = parseBody(savePreferencesSchema, req, res);
  if (!body) {
    return;
  }

  try {
    const record = await upsertThemePreferenceForUser(req.auth.userId, body.themePreference);
    return res.json({
      ok: true,
      themePreference: record.themePreference,
      updatedAt: record.updatedAt
    });
  } catch (error) {
    const message = String(error?.message || "");
    if (message.startsWith("preferences_table_missing")) {
      return res
        .status(500)
        .json({ error: "Supabase preferences table missing. Run migration for user_preferences." });
    }
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ error: "Failed to update user preferences" });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  if (String(error?.message || "").includes("CORS")) {
    return res.status(403).json({ error: "CORS blocked" });
  }

  // eslint-disable-next-line no-console
  console.error(error);
  return res.status(500).json({ error: "Unhandled server error" });
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`NERD HUB backend running at http://localhost:${config.port}`);
});
