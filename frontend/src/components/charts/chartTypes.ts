import type { Breakdown } from "@/types/api";

/** One bar or slice. `color` is optional: category breakdowns carry the API colour, others fall back to the palette. */
export interface ChartDatum {
  key: string;
  label: string;
  value: number;
  color?: string;
}

/** GET /api/analytics/breakdown rows -> chart data (keeps the API order, which is count descending). */
export function breakdownToChartData(
  rows: Breakdown | undefined,
  colorFor?: (key: string) => string | undefined,
): ChartDatum[] {
  if (!rows) return [];
  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.count,
    color: row.color ?? colorFor?.(row.key),
  }));
}

/** `{ LOW: 3, MEDIUM: 5 }` -> chart data, with labels and colours supplied by the caller. */
export function recordToChartData(
  counts: Record<string, number> | undefined,
  labelFor: (key: string) => string,
  colorFor?: (key: string) => string | undefined,
  order?: readonly string[],
): ChartDatum[] {
  if (!counts) return [];
  const keys = order ? order.filter((k) => k in counts) : Object.keys(counts);
  return keys.map((key) => ({ key, label: labelFor(key), value: counts[key] ?? 0, color: colorFor?.(key) }));
}

export function sumChartData(data: readonly ChartDatum[]): number {
  return data.reduce((total, d) => total + d.value, 0);
}
