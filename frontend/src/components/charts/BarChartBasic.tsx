import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber, truncate } from "@/utils/format";
import { chartTheme, formatCountTick, seriesColor } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";
import type { ChartDatum } from "./chartTypes";

export interface BarChartBasicProps {
  data: readonly ChartDatum[];
  /** "vertical": bars grow upwards (default); "horizontal": bars grow to the right, labels on the left. */
  orientation?: "vertical" | "horizontal";
  /** Series name shown in the tooltip (default "Count"). */
  valueLabel?: string;
  /** Fallback bar colour when a datum has none (default: palette by index). */
  color?: string;
  /** Print the value at the end of each bar. */
  showValues?: boolean;
  valueFormatter?: (value: number) => string;
  onBarClick?: (datum: ChartDatum) => void;
  /** Width reserved for category labels in the horizontal orientation (default 120). */
  labelWidth?: number;
  /** Category labels longer than this are truncated on the axis (full text stays in the tooltip). */
  maxLabelLength?: number;
}

/** Single-series bar chart with per-bar colours (category colours from the API, semantic colours for the rest). */
export function BarChartBasic({
  data,
  orientation = "vertical",
  valueLabel = "Count",
  color,
  showValues = false,
  valueFormatter = (v) => formatNumber(v),
  onBarClick,
  labelWidth = 120,
  maxLabelLength = 18,
}: BarChartBasicProps) {
  const horizontal = orientation === "horizontal";
  const tick = (value: unknown) => truncate(String(value), maxLabelLength);
  const fillFor = (datum: ChartDatum, index: number) => datum.color ?? color ?? seriesColor(index);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data as ChartDatum[]}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: showValues ? 16 : 8, right: showValues && horizontal ? 40 : 12, bottom: 4, left: 0 }}
        barCategoryGap="22%"
      >
        <CartesianGrid {...chartTheme.grid} vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" allowDecimals={false} tickFormatter={formatCountTick} {...chartTheme.axis} />
            <YAxis
              type="category"
              dataKey="label"
              width={labelWidth}
              tickFormatter={tick}
              {...chartTheme.axis}
            />
          </>
        ) : (
          <>
            <XAxis type="category" dataKey="label" interval={0} tickFormatter={tick} {...chartTheme.axis} />
            <YAxis
              type="number"
              allowDecimals={false}
              width={40}
              tickFormatter={formatCountTick}
              {...chartTheme.axis}
            />
          </>
        )}
        <Tooltip
          cursor={chartTheme.tooltip.cursor}
          content={<ChartTooltip valueFormatter={(v) => valueFormatter(v)} />}
        />
        <Bar
          dataKey="value"
          name={valueLabel}
          radius={chartTheme.barRadius}
          isAnimationActive
          animationDuration={chartTheme.animationDuration}
          onClick={onBarClick ? (_entry, index) => onBarClick(data[index]) : undefined}
          cursor={onBarClick ? "pointer" : undefined}
        >
          {data.map((datum, index) => (
            <Cell key={datum.key} fill={fillFor(datum, index)} />
          ))}
          {showValues && (
            <LabelList
              dataKey="value"
              position={horizontal ? "right" : "top"}
              formatter={(value: unknown) =>
                typeof value === "number" ? valueFormatter(value) : String(value ?? "")
              }
              style={{ fill: "#94A3B8", fontSize: 11 }}
            />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
