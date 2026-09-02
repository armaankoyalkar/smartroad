import type { ReactNode } from "react";
import { BRAND } from "@/constants/colors";
import type { Granularity, Timeline } from "@/types/api";
import { formatNumber } from "@/utils/format";
import { ChartCard } from "./ChartCard";
import { isTimelineEmpty, timelineRows } from "./chartHelpers";
import { LineChartBasic } from "./LineChartBasic";

export interface TimelineLineChartProps {
  points: Timeline | undefined;
  granularity: Granularity;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  /** Range or granularity controls rendered in the card header. */
  actions?: ReactNode;
  footer?: ReactNode;
  height?: number | string;
  /** Show the numbers in a collapsible table under the chart (default true). */
  showTable?: boolean;
  className?: string;
}

const GRANULARITY_LABEL: Record<Granularity, string> = { day: "day", week: "week", month: "month" };

/** Incidents reported per day, week or month (GET /api/analytics/timeline), as an area line. */
export function TimelineLineChart({
  points,
  granularity,
  isLoading = false,
  error,
  onRetry,
  title = "Incidents over time",
  description,
  actions,
  footer,
  height = 280,
  showTable = true,
  className,
}: TimelineLineChartProps) {
  const rows = timelineRows(points, granularity);
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  const table = showTable ? (
    <details className="group">
      <summary className="cursor-pointer select-none text-xs text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400">
        Show the numbers per {GRANULARITY_LABEL[granularity]} ({formatNumber(total)} in total)
      </summary>
      <div className="scrollbar-thin mt-2 max-h-64 overflow-auto">
        <table className="w-full text-xs">
          <caption className="sr-only">Incidents per {GRANULARITY_LABEL[granularity]}</caption>
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-faint">
              <th scope="col" className="py-1 pr-3 font-semibold">
                Period
              </th>
              <th scope="col" className="py-1 text-right font-semibold">
                Incidents
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.period} className="border-t border-navy-600/60">
                <th scope="row" className="py-1 pr-3 text-left font-normal text-muted">
                  {row.label}
                </th>
                <td className="tabular py-1 text-right text-text">{formatNumber(row.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  ) : undefined;

  return (
    <ChartCard
      title={title}
      description={description}
      actions={actions}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={isTimelineEmpty(points)}
      emptyDescription="No incidents were reported in this period."
      height={height}
      summary={table}
      footer={footer}
      className={className}
    >
      <LineChartBasic
        data={rows}
        xKey="label"
        series={[{ key: "count", label: "Incidents", color: BRAND.accent }]}
        area
        showDots={rows.length <= 40}
      />
    </ChartCard>
  );
}
