/**
 * Query-string helpers. Arrays become comma-separated values (docs/api.md section 1),
 * empty strings / null / undefined are dropped, booleans become "true" / "false".
 */
export type ParamValue = string | number | boolean | readonly (string | number)[] | null | undefined;

export function toSearchParams(params: Record<string, ParamValue> | undefined): URLSearchParams {
  const search = new URLSearchParams();
  if (!params) return search;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(","));
      continue;
    }
    search.set(key, String(value));
  }
  return search;
}

/** Same as toSearchParams but returns a plain object, handy for query keys. */
export function cleanParams<T extends Record<string, ParamValue>>(params: T | undefined): Partial<T> {
  const out: Partial<T> = {};
  if (!params) return out;
  for (const key of Object.keys(params) as (keyof T)[]) {
    const value = params[key];
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}
