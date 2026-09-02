import { z } from "zod";
import { GRANULARITIES } from "../lib/time.js";
import { isoDate, optionalBooleanish, refineDateRange } from "./common.schema.js";

/**
 * Query schemas for /api/analytics (docs/api.md section 7). The admin
 * endpoints share `from`, `to` (on createdAt) and `includeSeed` (default
 * true); breakdown adds `by`, timeline adds `granularity`.
 */

export const BREAKDOWN_FIELDS = Object.freeze([
  "category",
  "status",
  "priority",
  "severity",
  "riskLevel",
] as const);
export type BreakdownField = (typeof BREAKDOWN_FIELDS)[number];

const analyticsRangeFields = {
  from: isoDate.optional(),
  to: isoDate.optional(),
  includeSeed: optionalBooleanish.default(true),
};

/** GET /api/analytics/summary */
export const analyticsRangeQuery = z.object(analyticsRangeFields).superRefine(refineDateRange);
export type AnalyticsRangeQuery = z.output<typeof analyticsRangeQuery>;

/** GET /api/analytics/breakdown?by=... (`by` is required). */
export const breakdownQuery = z
  .object({ ...analyticsRangeFields, by: z.enum(BREAKDOWN_FIELDS) })
  .superRefine(refineDateRange);
export type BreakdownQuery = z.output<typeof breakdownQuery>;

/** GET /api/analytics/timeline?granularity=day|week|month */
export const timelineQuery = z
  .object({ ...analyticsRangeFields, granularity: z.enum(GRANULARITIES).default("day") })
  .superRefine(refineDateRange);
export type TimelineQuery = z.output<typeof timelineQuery>;
