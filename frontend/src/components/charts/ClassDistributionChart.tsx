import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BRAND } from "@/constants/colors";
import { RISK_LEVELS, type RiskLevel } from "@/constants/enums";
import { useMeta } from "@/meta/useMeta";
import type { ClassDistribution } from "@/types/api";
import { formatNumber, formatPercent } from "@/utils/format";
import { ChartCard } from "./ChartCard";
import { share } from "./chartHelpers";
import { chartTheme, formatCountTick } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";

export interface ClassDistributionChartProps {
  distribution: { train: ClassDistribution; test: ClassDistribution } | undefined;
  classes?: readonly RiskLevel[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  title?: ReactNode;
  height?: number | string;
  className?: string;
}

const TRAIN_COLOR = BRAND.accent;
const TEST_COLOR = BRAND.secondary;

/** Records per risk level in the training and test splits, side by side, with a table. */
export function ClassDistributionChart({
  distribution,
  classes = RISK_LEVELS,
  isLoading = false,
  error,
  onRetry,
  title = "Class distribution",
  height = 260,
  className,
}: ClassDistributionChartProps) {
  const meta = useMeta();
  const rows = classes.map((level) => ({
    key: level,
    label: meta.label("riskLevel", level),
    train: distribution?.train[level] ?? 0,
    test: distribution?.test[level] ?? 0,
  }));
  const trainTotal = rows.reduce((sum, r) => sum + r.train, 0);
  const testTotal = rows.reduce((sum, r) => sum + r.test, 0);
  const isEmpty = trainTotal + testTotal === 0;

  const table = (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-64 text-xs">
        <caption className="sr-only">Class distribution per split (table)</caption>
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-faint">
            <th scope="col" className="py-1 pr-3 font-semibold">
              Level
            </th>
            <th scope="col" className="py-1 pr-3 text-right font-semibold">
              Train
            </th>
            <th scope="col" className="py-1 text-right font-semibold">
              Test
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-navy-600/60">
              <th scope="row" className="py-1 pr-3 text-left font-normal text-muted">
                {row.label}
              </th>
              <td className="tabular py-1 pr-3 text-right text-text">
                {formatNumber(row.train)}{" "}
                <span className="text-faint">({formatPercent(share(row.train, trainTotal), 0)})</span>
              </td>
              <td className="tabular py-1 text-right text-text">
                {formatNumber(row.test)}{" "}
                <span className="text-faint">({formatPercent(share(row.test, testTotal), 0)})</span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-navy-600">
            <th scope="row" className="py-1 pr-3 text-left font-semibold text-text">
              Total
            </th>
            <td className="tabular py-1 pr-3 text-right font-semibold text-text">
              {formatNumber(trainTotal)}
            </td>
            <td className="tabular py-1 text-right font-semibold text-text">{formatNumber(testTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <ChartCard
      title={title}
      description="Records per risk level in the training and held-out test splits."
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={isEmpty}
      emptyTitle="No class counts"
      emptyDescription="The training run did not record the class distribution."
      height={height}
      summary={table}
      className={className}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }} barCategoryGap="25%">
          <CartesianGrid {...chartTheme.grid} vertical={false} />
          <XAxis dataKey="label" {...chartTheme.axis} />
          <YAxis width={44} allowDecimals={false} tickFormatter={formatCountTick} {...chartTheme.axis} />
          <Tooltip cursor={chartTheme.tooltip.cursor} content={<ChartTooltip />} />
          <Legend wrapperStyle={{ color: chartTheme.legend.color, fontSize: chartTheme.legend.fontSize }} />
          <Bar
            dataKey="train"
            name="Train"
            fill={TRAIN_COLOR}
            radius={chartTheme.barRadius}
            isAnimationActive
            animationDuration={chartTheme.animationDuration}
          />
          <Bar
            dataKey="test"
            name="Test"
            fill={TEST_COLOR}
            radius={chartTheme.barRadius}
            isAnimationActive
            animationDuration={chartTheme.animationDuration}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
