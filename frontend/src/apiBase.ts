const DEFAULT_PROD_API_BASE = "https://trabalhos-de-escola-backend.vercel.app";

const configuredBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "";

const rawBase = configuredBase || DEFAULT_PROD_API_BASE;
const normalizedBase = rawBase.replace(/\/+$/, "");

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
}
