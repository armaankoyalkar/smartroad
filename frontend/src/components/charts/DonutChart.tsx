import type { ReactNode } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber, formatPercent } from "@/utils/format";
import { chartTheme, seriesColor } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";
import { sumChartData, type ChartDatum } from "./chartTypes";

export interface DonutChartProps {
  data: readonly ChartDatum[];
  /** Text in the middle of the ring (default: the total and "Total"). */
  centerValue?: ReactNode;
  centerLabel?: ReactNode;
  /** Legend list under the ring (real text, so colour is never the only carrier). Default true. */
  showLegend?: boolean;
  /** Show each slice's share next to its count in the legend and tooltip. Default true. */
  showPercent?: boolean;
  valueFormatter?: (value: number) => string;
  onSliceClick?: (datum: ChartDatum) => void;
  innerRadius?: number | string;
  outerRadius?: number | string;
}

/** Donut (ring) chart for status / severity / risk shares. */
export function DonutChart({
  data,
  centerValue,
  centerLabel = "Total",
  showLegend = true,
  showPercent = true,
  valueFormatter = (v) => formatNumber(v),
  onSliceClick,
  innerRadius = "62%",
  outerRadius = "88%",
}: DonutChartProps) {
  const total = sumChartData(data);
  const fillFor = (datum: ChartDatum, index: number) => datum.color ?? seriesColor(index);
  const share = (value: number) => (total > 0 ? formatPercent(value / total, 0) : "");

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data as ChartDatum[]}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive
              animationDuration={chartTheme.animationDuration}
              onClick={onSliceClick ? (_entry, index) => onSliceClick(data[index]) : undefined}
              cursor={onSliceClick ? "pointer" : undefined}
            >
              {data.map((datum, index) => (
                <Cell key={datum.key} fill={fillFor(datum, index)} />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltip
                  hideLabel
                  valueFormatter={(v) =>
                    showPercent ? `${valueFormatter(v)} (${share(v)})` : valueFormatter(v)
                  }
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
        >
          <span className="tabular text-2xl font-semibold text-text">
            {centerValue ?? formatNumber(total)}
          </span>
          <span className="text-xs text-muted">{centerLabel}</span>
        </div>
      </div>
      {showLegend && (
        <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
          {data.map((datum, index) => (
            <li key={datum.key} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: fillFor(datum, index) }}
              />
              <span className="text-muted">{datum.label}</span>
              <span className="tabular text-text">
                {valueFormatter(datum.value)}
                {showPercent && total > 0 && <span className="text-faint"> · {share(datum.value)}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
