/**
 * Runtime configuration read from Vite environment variables (see .env.example).
 * Every value has a development default so the app boots without a .env file.
 */
const env = import.meta.env;

function read(key: keyof ImportMetaEnv, fallback: string): string {
  const value = env[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export const config = {
  appName: "SmartRoad",
  tagline: "Making roads smarter. Making travel safer.",
  /** Origin of the Express API, without a trailing slash. */
  apiUrl: read("VITE_API_URL", "http://localhost:5000").replace(/\/+$/, ""),
  tileUrl: read("VITE_TILE_URL", "https://tile.openstreetmap.org/{z}/{x}/{y}.png"),
  tileAttribution: read("VITE_TILE_ATTRIBUTION", "&copy; OpenStreetMap contributors"),
  geocodeUrl: read("VITE_GEOCODE_URL", "https://nominatim.openstreetmap.org/reverse"),
  /** localStorage key that holds the JWT (the only place the token is stored). */
  tokenStorageKey: "smartroad.token",
  /** Fallback map view used until GET /api/meta/enums answers (Hyderabad, docs/api.md section 4). */
  defaultMap: { center: { latitude: 17.385, longitude: 78.4867 }, zoom: 12 },
  /** Fallback upload limits until GET /api/meta/enums answers (docs/api.md section 4). */
  defaultUpload: { maxBytes: 5 * 1024 * 1024, mimeTypes: ["image/jpeg", "image/png", "image/webp"] },
  isDev: env.DEV,
} as const;

/** Turn an API-relative path such as `/uploads/x.jpg` into an absolute URL. */
export function apiAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${config.apiUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}
