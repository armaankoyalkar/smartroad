/**
 * Shared date range for the analytics page: presets (30 days, 90 days, 6 months, 12 months, all)
 * or a custom from/to, kept in the URL (`range`, `from`, `to`, `includeSeed`).
 */
import { format, subDays, subMonths } from "date-fns";
import type { AnalyticsParams } from "@/types/api";

export const RANGE_PRESETS = [
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "6m", label: "6 months", months: 6 },
  { key: "12m", label: "12 months", months: 12 },
  { key: "all", label: "All time" },
] as const;

export type RangePresetKey = (typeof RANGE_PRESETS)[number]["key"];
export type RangeKey = RangePresetKey | "custom";

export interface AnalyticsRange {
  preset: RangeKey;
  /** Effective `YYYY-MM-DD` bounds ("" when unbounded). */
  from: string;
  to: string;
  includeSeed: boolean;
}

export const DEFAULT_RANGE_PRESET: RangePresetKey = "90d";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isRangePreset(value: unknown): value is RangePresetKey {
  return typeof value === "string" && RANGE_PRESETS.some((p) => p.key === value);
}

/** Bounds of a preset relative to `today` (all time -> empty strings). */
export function presetDates(preset: RangePresetKey, today = new Date()): { from: string; to: string } {
  const spec = RANGE_PRESETS.find((p) => p.key === preset);
  if (!spec || spec.key === "all") return { from: "", to: "" };
  const to = format(today, "yyyy-MM-dd");
  const start = "days" in spec ? subDays(today, spec.days - 1) : subMonths(today, spec.months);
  return { from: format(start, "yyyy-MM-dd"), to };
}

/** Read the range from the URL. `range=custom` uses `from`/`to`; anything else is a preset. */
export function parseAnalyticsRange(params: URLSearchParams, today = new Date()): AnalyticsRange {
  const includeSeed = params.get("includeSeed") !== "false";
  const raw = params.get("range");
  const from = DATE_RE.test(params.get("from") ?? "") ? (params.get("from") as string) : "";
  const to = DATE_RE.test(params.get("to") ?? "") ? (params.get("to") as string) : "";
  if (raw === "custom" || (!raw && (from || to))) {
    return { preset: "custom", from, to, includeSeed };
  }
  const preset = isRangePreset(raw) ? raw : DEFAULT_RANGE_PRESET;
  return { preset, ...presetDates(preset, today), includeSeed };
}

/** Values for useQueryParams().setMany(). */
export function serializeAnalyticsRange(range: AnalyticsRange): Record<string, string | undefined> {
  const custom = range.preset === "custom";
  return {
    range: range.preset === DEFAULT_RANGE_PRESET ? undefined : range.preset,
    from: custom ? range.from || undefined : undefined,
    to: custom ? range.to || undefined : undefined,
    includeSeed: range.includeSeed ? undefined : "false",
  };
}

/** Query parameters shared by summary, breakdown and timeline. */
export function rangeToParams(range: AnalyticsRange): AnalyticsParams {
  return {
    from: range.from || undefined,
    to: range.to || undefined,
    includeSeed: range.includeSeed ? undefined : false,
  };
}

/** Human description of the range for captions and file names. */
export function describeRange(range: AnalyticsRange): string {
  if (range.preset !== "custom") {
    const spec = RANGE_PRESETS.find((p) => p.key === range.preset);
    return spec ? (spec.key === "all" ? "All time" : `Last ${spec.label}`) : "";
  }
  if (range.from && range.to) return `${range.from} to ${range.to}`;
  if (range.from) return `From ${range.from}`;
  if (range.to) return `Until ${range.to}`;
  return "All time";
}
