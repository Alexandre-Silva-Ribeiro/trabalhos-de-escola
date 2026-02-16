import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../data");
const storeFile = path.join(dataDir, "store.json");

const initialStore = {
  users: []
};

let writeQueue = Promise.resolve();

export function normalizeUsername(username) {
  return String(username || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

async function ensureStoreFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(storeFile);
  } catch {
    await fs.writeFile(storeFile, JSON.stringify(initialStore, null, 2), "utf8");
  }
}

async function readStore() {
  await ensureStoreFile();
  const raw = await fs.readFile(storeFile, "utf8");
  return JSON.parse(raw);
}

async function writeStore(store) {
  await ensureStoreFile();
  const tempFile = `${storeFile}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tempFile, storeFile);
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

async function mutateStore(mutator) {
  writeQueue = writeQueue.then(async () => {
    const store = await readStore();
    const result = await mutator(store);
    await writeStore(store);
    return result;
  });

  return writeQueue;
}

export async function findUserByUsername(username) {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return null;
  }

  const store = await readStore();
  const user = store.users.find((item) => item.username === normalized);
  return user || null;
}

export async function findUserById(id) {
  const store = await readStore();
  const user = store.users.find((item) => item.id === id);
  return user || null;
}

export async function createUser({ username, displayName, passwordHash, vault }) {
  return mutateStore(async (store) => {
    const normalized = normalizeUsername(username);
    if (!normalized) {
      throw new Error("invalid_username");
    }

    const exists = store.users.some((item) => item.username === normalized);
    if (exists) {
      throw new Error("username_exists");
    }

    const now = new Date().toISOString();
    const nextUser = {
      id: randomUUID(),
      username: normalized,
      displayName: String(displayName || normalized),
      passwordHash,
      vault,
      createdAt: now,
      updatedAt: now
    };

    store.users.push(nextUser);
    return publicUser(nextUser);
  });
}

export async function updateUserVault(userId, vault) {
  return mutateStore(async (store) => {
    const user = store.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error("user_not_found");
    }

    user.vault = vault;
    user.updatedAt = new Date().toISOString();

    return publicUser(user);
  });
}

export async function updateUserPassword(userId, passwordHash) {
  return mutateStore(async (store) => {
    const user = store.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error("user_not_found");
    }

    user.passwordHash = passwordHash;
    user.updatedAt = new Date().toISOString();
    return publicUser(user);
  });
}
