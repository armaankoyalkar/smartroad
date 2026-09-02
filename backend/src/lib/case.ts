/**
 * Key-case conversion for ML service responses (docs/api.md section 10: the
 * ML service speaks snake_case, the API speaks camelCase).
 *
 * Only keys that are entirely lower-case snake_case are converted
 * (`model_version` -> `modelVersion`). Enum-like keys such as `LOW`,
 * `ROAD_DAMAGE` or `MON` are left alone, because they are values that happen
 * to be used as object keys (probabilities, class counts) and must reach the
 * frontend unchanged.
 */

const SNAKE_KEY = /^[a-z0-9]+(?:_[a-z0-9]+)+$/;

export function snakeToCamel(key: string): string {
  if (!SNAKE_KEY.test(key)) return key;
  return key.replace(/_([a-z0-9])/g, (_match, ch: string) => ch.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

/**
 * Deep-convert the keys of plain objects (recursively, through arrays) from
 * snake_case to camelCase. Dates, buffers, class instances and primitives
 * are returned as they are. The generic parameter is a convenience for the
 * caller; nothing is validated here.
 */
export function camelizeKeys<T = unknown>(value: unknown): T {
  return convert(value) as T;
}

function convert(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(convert);
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    out[snakeToCamel(key)] = convert(inner);
  }
  return out;
}
