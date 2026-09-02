import { z } from "zod";
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, tryParseSort, type SortSpec } from "../lib/pagination.js";

/**
 * Building blocks shared by the resource schemas (docs/api.md section 1).
 * Everything here parses query-string or path values, so inputs are strings
 * (or arrays of strings when a key is repeated) and outputs are typed.
 */

export const OBJECT_ID = /^[a-f\d]{24}$/i;

export const objectId = z.string().regex(OBJECT_ID, "Must be a valid id");

/** `{ id }` route parameter. Malformed ids are a 400 (docs/api.md section 1). */
export const objectIdParam = z.object({ id: objectId });

function splitCsv(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  const items = Array.isArray(value) ? value : [value];
  const out: string[] = [];
  for (const item of items) {
    if (typeof item !== "string") return value; // let the enum schema report the bad type
    for (const part of item.split(",")) {
      const trimmed = part.trim();
      if (trimmed && !out.includes(trimmed)) out.push(trimmed);
    }
  }
  return out.length ? out : undefined;
}

/**
 * Comma-separated (or repeated) enum values: `?status=SUBMITTED,VERIFIED`
 * becomes `["SUBMITTED", "VERIFIED"]`; each value is checked against `values`.
 * Absent or empty input parses to undefined.
 */
export function csvEnum<const T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess(splitCsv, z.array(z.enum(values)).min(1).optional());
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

/** ISO 8601 date or date-time (`2026-09-01` or `2026-09-01T00:00:00Z`) parsed to a Date. */
export const isoDate = z
  .string()
  .regex(ISO_DATE, "Expected an ISO 8601 date such as 2026-09-01 or 2026-09-01T00:00:00Z")
  .transform((value, ctx) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid date" });
      return z.NEVER;
    }
    return date;
  });

/** `from` / `to` query fields on createdAt. Spread into a z.object() shape. */
export const dateRangeFields = { from: isoDate.optional(), to: isoDate.optional() };

/** Adds an issue on `to` when the range is inverted. Use with `.superRefine(refineDateRange)`. */
export function refineDateRange(value: { from?: Date; to?: Date }, ctx: z.RefinementCtx): void {
  if (value.from && value.to && value.from.getTime() > value.to.getTime()) {
    ctx.addIssue({ code: "custom", path: ["to"], message: "Must not be before from" });
  }
}

/** `page` (default 1) and `limit` (default 20, max 100). */
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});

/** `sort=-createdAt` restricted to `allowed`, parsed into a SortSpec (fallback when absent). */
export function sortQuery(allowed: readonly string[], fallback: string) {
  return z
    .string()
    .optional()
    .transform((value, ctx): SortSpec => {
      const spec = tryParseSort(value, allowed, fallback);
      if (!spec) {
        ctx.addIssue({ code: "custom", message: `Sort field must be one of ${allowed.join(", ")}` });
        return z.NEVER;
      }
      return spec;
    });
}

/** "true" / "1" / "false" / "0" (and real booleans) to boolean. */
export const booleanish = z.preprocess((value) => {
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1") return true;
    if (v === "false" || v === "0") return false;
  }
  return value;
}, z.boolean());

export const optionalBooleanish = z.preprocess((value) => (value === "" ? undefined : value), booleanish.optional());
