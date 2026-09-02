import type { ReactNode } from "react";
import { useMeta } from "@/meta/useMeta";
import type { Breakdown, BreakdownBy } from "@/types/api";
import { BarChartBasic } from "./BarChartBasic";
import { ChartCard } from "./ChartCard";
import { ChartDataTable } from "./ChartDataTable";
import { BREAKDOWN_TITLES, breakdownColorFor, isChartDataEmpty } from "./chartHelpers";
import { breakdownToChartData, type ChartDatum } from "./chartTypes";
import { DonutChart } from "./DonutChart";

export type BreakdownChartKind = "bars" | "columns" | "donut";

export interface BreakdownChartProps {
  /** Rows from GET /api/analytics/breakdown?by=... */
  rows: Breakdown | undefined;
  by: BreakdownBy;
  kind?: BreakdownChartKind;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  height?: number | string;
  /** Show the numbers as a table under the chart (default true). */
  showTable?: boolean;
  onSelect?: (datum: ChartDatum) => void;
  className?: string;
}

/**
 * One breakdown facet as a chart with the same numbers as a table underneath. Category colours
 * come from the API row (`color`) or MetaContext; the other facets use the semantic colours.
 */
export function BreakdownChart({
  rows,
  by,
  kind = "bars",
  isLoading = false,
  error,
  onRetry,
  title,
  description,
  actions,
  footer,
  height = 280,
  showTable = true,
  onSelect,
  className,
}: BreakdownChartProps) {
  const meta = useMeta();
  const data = breakdownToChartData(rows, breakdownColorFor(by, meta));
  const heading = title ?? BREAKDOWN_TITLES[by];
  const caption = typeof heading === "string" ? heading : BREAKDOWN_TITLES[by];

  let chart: ReactNode;
  if (kind === "donut") chart = <DonutChart data={data} onSliceClick={onSelect} />;
  else if (kind === "columns") chart = <BarChartBasic data={data} showValues onBarClick={onSelect} />;
  else chart = <BarChartBasic data={data} orientation="horizontal" showValues onBarClick={onSelect} />;

  return (
    <ChartCard
      title={heading}
      description={description}
      actions={actions}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={isChartDataEmpty(data)}
      emptyDescription="No incidents match the current range and filters."
      height={height}
      summary={showTable ? <ChartDataTable data={data} caption={`${caption} (table)`} /> : undefined}
      footer={footer}
      className={className}
    >
      {chart}
    </ChartCard>
  );
}
