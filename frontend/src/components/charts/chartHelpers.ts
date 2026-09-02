/**
 * Pure helpers for the domain charts: colour sources per breakdown facet, emptiness checks
 * and timeline rows. Category colours always come from MetaContext (the API); the other
 * facets use the semantic colours from constants/colors.ts.
 */
import {
  NEUTRAL_COLOR,
  PRIORITY_COLORS,
  RISK_COLORS,
  SEVERITY_COLORS,
  STATUS_COLORS,
} from "@/constants/colors";
import type { MetaContextValue } from "@/meta/context";
import type { Breakdown, BreakdownBy, Granularity, Timeline } from "@/types/api";
import { formatPeriod } from "@/utils/format";
import { sumChartData, type ChartDatum } from "./chartTypes";

/** The five facets of GET /api/analytics/breakdown, in display order. */
export const BREAKDOWN_FACETS: readonly BreakdownBy[] = [
  "category",
  "status",
  "priority",
  "severity",
  "riskLevel",
];

export const BREAKDOWN_TITLES: Record<BreakdownBy, string> = {
  category: "Incidents by category",
  status: "Status distribution",
  priority: "Priority distribution",
  severity: "Severity distribution",
  riskLevel: "Risk level distribution",
};

/** Colour for one key of a breakdown facet. */
export function breakdownColorFor(
  by: BreakdownBy,
  meta: Pick<MetaContextValue, "categoryColor">,
): (key: string) => string {
  switch (by) {
    case "category":
      return (key) => meta.categoryColor(key);
    case "status":
      return (key) => STATUS_COLORS[key as keyof typeof STATUS_COLORS] ?? NEUTRAL_COLOR;
    case "priority":
      return (key) => PRIORITY_COLORS[key as keyof typeof PRIORITY_COLORS] ?? NEUTRAL_COLOR;
    case "severity":
      return (key) => SEVERITY_COLORS[key as keyof typeof SEVERITY_COLORS] ?? NEUTRAL_COLOR;
    case "riskLevel":
      return (key) => RISK_COLORS[key as keyof typeof RISK_COLORS] ?? NEUTRAL_COLOR;
  }
}

/** A breakdown with no rows, or only zero counts, has nothing to draw. */
export function isChartDataEmpty(data: readonly ChartDatum[]): boolean {
  return data.length === 0 || sumChartData(data) === 0;
}

export function isBreakdownEmpty(rows: Breakdown | undefined): boolean {
  return !rows || rows.length === 0 || rows.every((r) => r.count === 0);
}

export interface TimelineRow {
  period: string;
  label: string;
  count: number;
}

/** Timeline points with a display label for the axis and the fallback table. */
export function timelineRows(points: Timeline | undefined, granularity: Granularity): TimelineRow[] {
  if (!points) return [];
  return points.map((p) => ({
    period: p.period,
    label: formatPeriod(p.period, granularity),
    count: p.count,
  }));
}

export function isTimelineEmpty(points: Timeline | undefined): boolean {
  return !points || points.length === 0 || points.every((p) => p.count === 0);
}

/** Percentage share (0..1) of a value in a total, guarded against division by zero. */
export function share(value: number, total: number): number {
  return total > 0 ? value / total : 0;
}

/** Highest value in a matrix, used to scale a heatmap. */
export function matrixMax(matrix: readonly (readonly number[])[]): number {
  let max = 0;
  for (const row of matrix) for (const cell of row) if (cell > max) max = cell;
  return max;
}
