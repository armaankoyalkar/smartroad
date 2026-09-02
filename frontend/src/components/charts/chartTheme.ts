/**
 * Recharts theme for the dark identity: muted grid and axes, glass tooltip, tabular numbers.
 * Everything visual about charts is defined here once; the wrappers only pass it through.
 */
import type { CSSProperties } from "react";
import { BRAND, CHART_SERIES_COLORS, NEUTRAL_COLOR } from "@/constants/colors";

export const CHART_FONT_FAMILY = "Inter, ui-sans-serif, system-ui, sans-serif";

export const chartTheme = {
  /** Grid lines: barely visible on navy. */
  grid: { stroke: "rgba(148, 163, 184, 0.14)", strokeDasharray: "3 3" },
  axis: {
    stroke: BRAND.border,
    tick: { fill: BRAND.muted, fontSize: 12, fontFamily: CHART_FONT_FAMILY },
    tickLine: false,
    axisLine: { stroke: BRAND.border },
  },
  tooltip: {
    contentStyle: {
      backgroundColor: "rgba(17, 26, 46, 0.96)",
      border: `1px solid ${BRAND.border}`,
      borderRadius: 10,
      boxShadow: "0 20px 50px -20px rgba(0,0,0,0.8)",
      color: BRAND.text,
      fontSize: 12,
      fontFamily: CHART_FONT_FAMILY,
      padding: "8px 10px",
    } satisfies CSSProperties,
    labelStyle: { color: BRAND.muted, marginBottom: 4 } satisfies CSSProperties,
    itemStyle: { color: BRAND.text, padding: 0 } satisfies CSSProperties,
    cursor: { fill: "rgba(255, 255, 255, 0.04)" },
    lineCursor: { stroke: "rgba(103, 232, 249, 0.35)", strokeWidth: 1 },
  },
  legend: { color: BRAND.muted, fontSize: 12 },
  accent: BRAND.accent,
  secondary: BRAND.secondary,
  neutral: NEUTRAL_COLOR,
  series: CHART_SERIES_COLORS,
  /** Corner radius of bars. */
  barRadius: 4,
  /** Animation kept short; charts are informational, not decorative. */
  animationDuration: 500,
} as const;

/** Colour for the n-th series when the data carries no semantic colour of its own. */
export function seriesColor(index: number): string {
  return chartTheme.series[index % chartTheme.series.length];
}

/** Whole-number tick formatter (counts never have decimals). */
export function formatCountTick(value: number): string {
  return Number.isInteger(value) ? String(value) : "";
}
