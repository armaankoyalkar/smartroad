import type { ReactNode } from "react";
import { formatNumber } from "@/utils/format";
import { chartTheme } from "./chartTheme";

/** A Recharts tooltip payload entry, typed loosely because every chart type shapes it differently. */
export interface ChartTooltipEntry {
  name?: unknown;
  value?: unknown;
  color?: string;
  fill?: string;
  dataKey?: unknown;
  payload?: unknown;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<ChartTooltipEntry>;
  label?: unknown;
  valueFormatter?: (value: number, entry: ChartTooltipEntry) => ReactNode;
  labelFormatter?: (label: unknown, payload: ReadonlyArray<ChartTooltipEntry>) => ReactNode;
  /** Hide the label line (donut slices carry their own name). */
  hideLabel?: boolean;
}

function entryColor(entry: ChartTooltipEntry): string | undefined {
  if (entry.color) return entry.color;
  if (entry.fill) return entry.fill;
  const payload = entry.payload as { fill?: string; color?: string } | undefined;
  return payload?.color ?? payload?.fill;
}

/** Themed tooltip body. Pass as `<Tooltip content={<ChartTooltip />} />`; Recharts injects the data props. */
export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
  hideLabel = false,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const heading = hideLabel ? null : labelFormatter ? labelFormatter(label, payload) : (label as ReactNode);
  return (
    <div style={chartTheme.tooltip.contentStyle} role="presentation">
      {heading !== null && heading !== undefined && heading !== "" && (
        <p style={chartTheme.tooltip.labelStyle}>{heading}</p>
      )}
      <ul className="space-y-0.5">
        {payload.map((entry, index) => {
          const value = typeof entry.value === "number" ? entry.value : Number(entry.value);
          const shown = Number.isFinite(value)
            ? valueFormatter
              ? valueFormatter(value, entry)
              : formatNumber(value)
            : String(entry.value ?? "");
          return (
            <li key={index} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entryColor(entry) ?? chartTheme.accent }}
              />
              <span className="flex-1 text-muted">{String(entry.name ?? "")}</span>
              <span className="tabular font-medium text-text">{shown}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
