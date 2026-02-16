import express from "express";
import cors from "cors";
import { z } from "zod";

import { config } from "./config.js";
import { authMiddleware, createToken, hashPassword, verifyPassword } from "./auth.js";
import {
  createUser,
  findUserById,
  findUserByUsername,
  normalizeUsername,
  updateUserPassword,
  updateUserVault
} from "./store.js";
import { decryptJson, encryptJson } from "./crypto.js";
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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "nerd-hub-backend", at: new Date().toISOString() });
});

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  displayName: z.string().min(1).max(60).optional(),
  password: z.string().min(8).max(120)
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);
    const username = normalizeUsername(body.username);

    if (!/^[a-z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: "Username must use letters, numbers, underscore" });
    }

    const existing = await findUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const passwordHash = await hashPassword(body.password);
    const vault = createDefaultVault();
    const encryptedVault = encryptJson(vault, config.encryptionSecret);

    const user = await createUser({
      username,
      displayName: body.displayName || username,
      passwordHash,
      vault: encryptedVault
    });

    const token = createToken(user);

    return res.status(201).json({
      token,
      user,
      vault
    });
  } catch (error) {
    return res.status(400).json({ error: "Invalid request" });
  }
});

const loginSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(8).max(120)
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await findUserByUsername(body.username);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const matches = await verifyPassword(body.password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const vault = decryptJson(user.vault, config.encryptionSecret);
    const token = createToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      vault
    });
  } catch {
    return res.status(400).json({ error: "Invalid request" });
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(120),
  nextPassword: z.string().min(8).max(120)
});

app.post("/api/auth/change-password", authMiddleware, async (req, res) => {
  try {
    const body = changePasswordSchema.parse(req.body);
    const user = await findUserById(req.auth.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const matches = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ error: "Current password invalid" });
    }

    const nextHash = await hashPassword(body.nextPassword);
    await updateUserPassword(user.id, nextHash);

    return res.json({ ok: true });
  } catch {
    return res.status(400).json({ error: "Invalid request" });
  }
});

app.get("/api/vault", authMiddleware, async (req, res) => {
  try {
    const user = await findUserById(req.auth.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const vault = decryptJson(user.vault, config.encryptionSecret);
    return res.json({ vault, updatedAt: user.updatedAt });
  } catch {
    return res.status(500).json({ error: "Failed to load vault" });
  }
});

const saveVaultSchema = z.object({
  vault: z.unknown()
});

app.put("/api/vault", authMiddleware, async (req, res) => {
  try {
    const body = saveVaultSchema.parse(req.body);
    const sanitizedVault = sanitizeVaultInput(body.vault);
    const encrypted = encryptJson(sanitizedVault, config.encryptionSecret);

    const user = await updateUserVault(req.auth.userId, encrypted);

    return res.json({ ok: true, updatedAt: user.updatedAt });
  } catch (error) {
    const message = String(error?.message || "");
    if (message.startsWith("invalid_vault")) {
      return res.status(400).json({ error: message });
    }

    return res.status(400).json({ error: "Invalid request" });
  }
});

app.use((error, _req, res, _next) => {
  if (String(error?.message || "").includes("CORS")) {
    return res.status(403).json({ error: "CORS blocked" });
  }

  return res.status(500).json({ error: "Unhandled server error" });
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`NERD HUB backend running at http://localhost:${config.port}`);
});
