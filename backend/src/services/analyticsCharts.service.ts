import { CATEGORY_KEYS, getCategory } from "../config/categories.js";
import { LABELS, PRIORITIES, RISK_LEVELS, SEVERITIES, STATUSES } from "../config/enums.js";
import { env } from "../config/env.js";
import { NO_RISK_ESTIMATE, UNASSIGNED } from "../lib/incidentFilters.js";
import { defaultRange, enumeratePeriods, formatPeriod, type Granularity } from "../lib/time.js";
import { Incident } from "../models/Incident.js";
import { type BreakdownField } from "../validation/analytics.schema.js";
import { rangeFilter, type RangeOptions } from "./analytics.service.js";

/**
 * Chart data for the admin analytics (docs/api.md section 7): counts by one
 * field, and counts over time with zero-filled gaps.
 */

// --- GET /api/analytics/breakdown ------------------------------------------

export interface BreakdownRow {
  key: string;
  label: string;
  count: number;
  color?: string;
}

/**
 * Colours for the non-category breakdowns. Category colours come from
 * config/categories.ts; these are served with the rows so a chart and its
 * legend are drawn from the same values.
 */
export const BREAKDOWN_PALETTE: Readonly<
  Record<Exclude<BreakdownField, "category">, Readonly<Record<string, string>>>
> = Object.freeze({
  status: Object.freeze({
    SUBMITTED: "#6B7280",
    UNDER_REVIEW: "#2563EB",
    VERIFIED: "#0D9488",
    IN_PROGRESS: "#F59E0B",
    RESOLVED: "#16A34A",
    REJECTED: "#DC2626",
  }),
  severity: Object.freeze({ LOW: "#16A34A", MEDIUM: "#F59E0B", HIGH: "#DC2626" }),
  priority: Object.freeze({
    LOW: "#16A34A",
    MEDIUM: "#F59E0B",
    HIGH: "#EA580C",
    CRITICAL: "#DC2626",
    [UNASSIGNED]: "#6B7280",
  }),
  riskLevel: Object.freeze({
    LOW: "#16A34A",
    MEDIUM: "#F59E0B",
    HIGH: "#DC2626",
    [NO_RISK_ESTIMATE]: "#6B7280",
  }),
});

/** Every key a breakdown can contain, in the stable enum order used to break count ties. */
export function breakdownKeys(by: BreakdownField): readonly string[] {
  switch (by) {
    case "category":
      return CATEGORY_KEYS;
    case "status":
      return STATUSES;
    case "severity":
      return SEVERITIES;
    case "priority":
      return [...PRIORITIES, UNASSIGNED];
    case "riskLevel":
      return [...RISK_LEVELS, NO_RISK_ESTIMATE];
  }
}

export function breakdownLabel(by: BreakdownField, key: string): string {
  if (by === "category") return getCategory(key)?.label ?? key;
  if (key === UNASSIGNED) return "Unassigned";
  if (key === NO_RISK_ESTIMATE) return "No estimate";
  const labels = LABELS[by] as Readonly<Record<string, string>>;
  return labels[key] ?? key;
}

export function breakdownColor(by: BreakdownField, key: string): string | undefined {
  return by === "category" ? getCategory(key)?.color : BREAKDOWN_PALETTE[by][key];
}

/**
 * Rows for every known key (zero-filled) plus any unknown value found in the
 * data, sorted by count descending; ties keep the enum order so charts do
 * not reshuffle between reloads.
 */
export function buildBreakdownRows(by: BreakdownField, counts: ReadonlyMap<string, number>): BreakdownRow[] {
  const known = breakdownKeys(by);
  const order = new Map(known.map((key, index) => [key, index]));
  const extra = [...counts.keys()].filter((key) => !order.has(key)).sort();
  const rows = [...known, ...extra].map((key) => {
    const row: BreakdownRow = { key, label: breakdownLabel(by, key), count: counts.get(key) ?? 0 };
    const color = breakdownColor(by, key);
    if (color) row.color = color;
    return row;
  });
  const rank = (key: string) => order.get(key) ?? Number.MAX_SAFE_INTEGER;
  return rows.sort((a, b) => b.count - a.count || rank(a.key) - rank(b.key) || a.key.localeCompare(b.key));
}

const GROUP_EXPRESSIONS: Readonly<Record<BreakdownField, string>> = Object.freeze({
  category: "$category",
  status: "$status",
  priority: "$priority",
  severity: "$severity",
  riskLevel: "$riskEstimate.level",
});

/** The key reported for a null/missing value (docs/api.md section 7). */
const NULL_KEYS: Readonly<Partial<Record<BreakdownField, string>>> = Object.freeze({
  priority: UNASSIGNED,
  riskLevel: NO_RISK_ESTIMATE,
});

export async function computeBreakdown(by: BreakdownField, options: RangeOptions): Promise<BreakdownRow[]> {
  const rows = await Incident.aggregate<{ _id: unknown; count: number }>([
    { $match: rangeFilter(options) },
    { $group: { _id: GROUP_EXPRESSIONS[by], count: { $sum: 1 } } },
  ]);
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row._id == null ? NULL_KEYS[by] : String(row._id);
    if (key === undefined) continue; // a null value in a field that cannot be null: nothing to report
    counts.set(key, (counts.get(key) ?? 0) + row.count);
  }
  return buildBreakdownRows(by, counts);
}

// --- GET /api/analytics/timeline -------------------------------------------

export interface TimelinePoint {
  period: string;
  count: number;
}

export interface TimelineOptions extends RangeOptions {
  granularity: Granularity;
}

export interface TimelineResult {
  data: TimelinePoint[];
  meta: { granularity: Granularity; timezone: string; from: string; to: string; includeSeed: boolean };
}

/**
 * The reporting window: the given bounds, or the documented default span
 * (30 days, 26 weeks, 12 months) ending now / anchored on the one bound given.
 */
export function resolveTimelineRange(
  granularity: Granularity,
  from: Date | undefined,
  to: Date | undefined,
  now: Date = new Date(),
): { from: Date; to: Date } {
  if (from && to) return { from, to };
  const span = defaultRange(granularity, now);
  const spanMs = span.to.getTime() - span.from.getTime();
  if (from) return { from, to: now.getTime() > from.getTime() ? now : new Date(from.getTime() + spanMs) };
  if (to) return { from: new Date(to.getTime() - spanMs), to };
  return span;
}

/** One point per period between the bounds, zero where nothing was reported. */
export function fillTimeline(
  buckets: ReadonlyMap<string, number>,
  from: Date,
  to: Date,
  granularity: Granularity,
  timeZone: string = env.ANALYTICS_TIMEZONE,
): TimelinePoint[] {
  return enumeratePeriods(from, to, granularity, timeZone).map((period) => ({
    period,
    count: buckets.get(period) ?? 0,
  }));
}

export async function computeTimeline(
  options: TimelineOptions,
  now: Date = new Date(),
): Promise<TimelineResult> {
  const timeZone = env.ANALYTICS_TIMEZONE;
  const { granularity, includeSeed } = options;
  const range = resolveTimelineRange(granularity, options.from, options.to, now);
  // $dateTrunc buckets in the configured zone; weeks start on Monday (docs/api.md section 7).
  const truncate = {
    date: "$createdAt",
    unit: granularity,
    timezone: timeZone,
    ...(granularity === "week" ? { startOfWeek: "monday" } : {}),
  };
  const rows = await Incident.aggregate<{ _id: Date | null; count: number }>([
    { $match: rangeFilter({ ...range, includeSeed }) },
    { $group: { _id: { $dateTrunc: truncate }, count: { $sum: 1 } } },
  ]);
  const buckets = new Map<string, number>();
  for (const row of rows) {
    if (!(row._id instanceof Date)) continue;
    const key = formatPeriod(row._id, granularity, timeZone);
    buckets.set(key, (buckets.get(key) ?? 0) + row.count);
  }
  return {
    data: fillTimeline(buckets, range.from, range.to, granularity, timeZone),
    meta: {
      granularity,
      timezone: timeZone,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      includeSeed,
    },
  };
}
