import { useId, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTheme, formatCountTick, seriesColor } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";

export interface LineSeries {
  /** Property of each data row holding the value. */
  key: string;
  label: string;
  color?: string;
}

export interface LineChartBasicProps<T extends object> {
  data: readonly T[];
  /** Property of each row used for the x axis (for example "period"). */
  xKey: Extract<keyof T, string>;
  series: readonly LineSeries[];
  /** Axis and tooltip label for x values (for example formatPeriod). */
  xFormatter?: (value: string) => string;
  yFormatter?: (value: number) => string;
  valueFormatter?: (value: number, seriesKey: string) => ReactNode;
  /** Fill the area under each line with a soft gradient. */
  area?: boolean;
  showDots?: boolean;
  allowDecimals?: boolean;
}

/** One or more series over an ordered x axis (timelines). */
export function LineChartBasic<T extends object>({
  data,
  xKey,
  series,
  xFormatter = (v) => v,
  yFormatter = formatCountTick,
  valueFormatter,
  area = false,
  showDots = false,
  allowDecimals = false,
}: LineChartBasicProps<T>) {
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const colorOf = (s: LineSeries, i: number) => s.color ?? seriesColor(i);
  const Chart = area ? AreaChart : LineChart;
  const margin = { top: 8, right: 12, bottom: 4, left: 0 };
  // Recharts types its data as plain records; the public prop stays typed by the caller's row type.
  const rows = data as unknown as Record<string, unknown>[];
  const xDataKey: string = xKey;

  const axes = (
    <>
      <CartesianGrid {...chartTheme.grid} vertical={false} />
      <XAxis
        dataKey={xDataKey}
        tickFormatter={(v: unknown) => xFormatter(String(v))}
        interval="preserveStartEnd"
        minTickGap={28}
        {...chartTheme.axis}
      />
      <YAxis width={40} allowDecimals={allowDecimals} tickFormatter={yFormatter} {...chartTheme.axis} />
      <Tooltip
        cursor={chartTheme.tooltip.lineCursor}
        content={
          <ChartTooltip
            labelFormatter={(label) => xFormatter(String(label))}
            valueFormatter={
              valueFormatter ? (v, entry) => valueFormatter(v, String(entry.dataKey ?? "")) : undefined
            }
          />
        }
      />
    </>
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Chart data={rows} margin={margin}>
        {area && (
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`${gradientId}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colorOf(s, i)} stopOpacity={0.35} />
                <stop offset="95%" stopColor={colorOf(s, i)} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
        )}
        {axes}
        {series.map((s, i) =>
          area ? (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colorOf(s, i)}
              strokeWidth={2}
              fill={`url(#${gradientId}-${s.key})`}
              dot={showDots ? { r: 3, strokeWidth: 0, fill: colorOf(s, i) } : false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive
              animationDuration={chartTheme.animationDuration}
            />
          ) : (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colorOf(s, i)}
              strokeWidth={2}
              dot={showDots ? { r: 3, strokeWidth: 0, fill: colorOf(s, i) } : false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive
              animationDuration={chartTheme.animationDuration}
            />
          ),
        )}
      </Chart>
    </ResponsiveContainer>
  );
}
