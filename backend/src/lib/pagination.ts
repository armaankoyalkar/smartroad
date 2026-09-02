import { type PipelineStage } from "mongoose";
import { PRIORITIES, PRIORITY_RANK, SEVERITIES, SEVERITY_RANK } from "../config/enums.js";
import { AppError } from "./errors.js";

/**
 * Pagination and sorting helpers shared by every list endpoint
 * (docs/api.md section 1).
 */

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

function toInt(value: unknown): number | null {
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number.parseInt(value, 10);
  return null;
}

/**
 * Read page and limit from a (raw or validated) query object. Out-of-range
 * values are clamped rather than rejected: page >= 1, 1 <= limit <= maxLimit.
 */
export function parsePagination(
  query: { page?: unknown; limit?: unknown } | undefined,
  { defaultLimit = DEFAULT_PAGE_LIMIT, maxLimit = MAX_PAGE_LIMIT }: PaginationOptions = {},
): Pagination {
  const page = Math.max(1, toInt(query?.page) ?? 1);
  const limit = Math.min(maxLimit, Math.max(1, toInt(query?.limit) ?? defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(page: number, limit: number, total: number): PageMeta {
  return { page, limit, total, totalPages: limit > 0 ? Math.ceil(total / limit) : 0 };
}

export type SortDirection = 1 | -1;

export interface SortSpec {
  field: string;
  direction: SortDirection;
}

/** Fields whose values sort in rank order rather than alphabetically. */
export const RANK_FIELDS: Readonly<Record<"priority" | "severity", Readonly<Record<string, number>>>> = Object.freeze({
  priority: PRIORITY_RANK,
  severity: SEVERITY_RANK,
});

export type RankField = keyof typeof RANK_FIELDS;

export function isRankField(field: string): field is RankField {
  return Object.prototype.hasOwnProperty.call(RANK_FIELDS, field);
}

/**
 * Parse "-createdAt" / "createdAt" into a SortSpec. Returns null when the
 * field is not in `allowedFields` so validation schemas can add an issue.
 */
export function tryParseSort(sort: unknown, allowedFields: readonly string[], fallback: string): SortSpec | null {
  const raw = typeof sort === "string" && sort.trim() ? sort.trim() : fallback;
  const direction: SortDirection = raw.startsWith("-") ? -1 : 1;
  const field = raw.replace(/^[-+]/, "");
  if (!allowedFields.includes(field)) return null;
  return { field, direction };
}

/** Same as tryParseSort but throws VALIDATION_ERROR for a disallowed field. */
export function parseSort(sort: unknown, allowedFields: readonly string[], fallback: string): SortSpec {
  const spec = tryParseSort(sort, allowedFields, fallback);
  if (!spec) {
    throw AppError.validation([{ field: "sort", message: `Sort field must be one of ${allowedFields.join(", ")}` }]);
  }
  return spec;
}

/** Sort object for Query.sort() when the field is not a rank field. `_id` breaks ties so pages are stable. */
export function toMongoSort(spec: SortSpec): Record<string, SortDirection> {
  if (isRankField(spec.field)) {
    throw new Error(`${spec.field} sorts in rank order; use sortStages() with an aggregation pipeline`);
  }
  return spec.field === "_id" ? { _id: spec.direction } : { [spec.field]: spec.direction, _id: -1 };
}

/** True when the sort needs the aggregation pipeline from sortStages(). */
export function needsAggregation(spec: SortSpec): boolean {
  return isRankField(spec.field);
}

/**
 * Aggregation expression that maps a rank field to its number (0 when the
 * value is null or unknown), for $addFields / $sort.
 */
export function rankExpression(field: RankField): Record<string, unknown> {
  const ranks = RANK_FIELDS[field];
  return {
    $switch: {
      branches: Object.entries(ranks).map(([value, rank]) => ({ case: { $eq: [`$${field}`, value] }, then: rank })),
      default: 0,
    },
  };
}

/**
 * Pipeline stages implementing a SortSpec, including rank-order sorting for
 * priority and severity. Unassigned priority (null) always sorts last, in
 * both directions, as docs/api.md section 1 requires. Append $skip and $limit
 * after these stages; the temporary fields are removed by the final $unset.
 */
export function sortStages(spec: SortSpec, tieBreaker: Record<string, SortDirection> = { createdAt: -1 }): PipelineStage[] {
  if (!isRankField(spec.field)) {
    return [{ $sort: { ...toMongoSort(spec), ...tieBreaker } }];
  }
  const known = spec.field === "priority" ? [...PRIORITIES] : [...SEVERITIES];
  return [
    {
      $addFields: {
        __rank: rankExpression(spec.field),
        __rankMissing: { $cond: [{ $in: [`$${spec.field}`, known] }, 0, 1] },
      },
    },
    { $sort: { __rankMissing: 1, __rank: spec.direction, ...tieBreaker, _id: -1 } },
    { $unset: ["__rank", "__rankMissing"] },
  ];
}
