import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../data");
const storeFile = path.join(dataDir, "store.json");

const initialStore = {
  vaults: []
};

let writeQueue = Promise.resolve();

async function ensureStoreFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(storeFile);
  } catch {
    await fs.writeFile(storeFile, JSON.stringify(initialStore, null, 2), "utf8");
  }
}

function normalizeStoreShape(rawStore) {
  if (rawStore && Array.isArray(rawStore.vaults)) {
    return { vaults: rawStore.vaults };
  }

  if (rawStore && Array.isArray(rawStore.users)) {
    const migratedVaults = rawStore.users
      .filter((item) => item && typeof item.id === "string" && typeof item.vault === "string")
      .map((item) => ({
        userId: item.id,
        vault: item.vault,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      }));

    return {
      vaults: migratedVaults
    };
  }

  return { ...initialStore };
}

async function readStore() {
  await ensureStoreFile();
  const raw = await fs.readFile(storeFile, "utf8");
  const normalizedRaw = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const parsed = JSON.parse(normalizedRaw);
  return normalizeStoreShape(parsed);
}

async function writeStore(store) {
  await ensureStoreFile();
  const tempFile = `${storeFile}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tempFile, storeFile);
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

export async function findVaultRecordByUserId(userId) {
  const store = await readStore();
  return store.vaults.find((entry) => entry.userId === userId) || null;
}

export async function upsertVaultRecord(userId, encryptedVault) {
  return mutateStore(async (store) => {
    const now = new Date().toISOString();
    const existing = store.vaults.find((entry) => entry.userId === userId);
    if (existing) {
      existing.vault = encryptedVault;
      existing.updatedAt = now;
      return existing;
    }

    const next = {
      userId,
      vault: encryptedVault,
      createdAt: now,
      updatedAt: now
    };
    store.vaults.push(next);
    return next;
  });
}

export async function deleteVaultRecordByUserId(userId) {
  return mutateStore(async (store) => {
    const index = store.vaults.findIndex((entry) => entry.userId === userId);
    if (index < 0) {
      return null;
    }
    const [removed] = store.vaults.splice(index, 1);
    return removed;
  });
}
