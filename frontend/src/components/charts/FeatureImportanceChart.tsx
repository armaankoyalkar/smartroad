import type { ReactNode } from "react";
import { BRAND } from "@/constants/colors";
import { featureLabel } from "@/features/admin/riskFeatures";
import type { FeatureImportance, FeatureSpec } from "@/types/api";
import { formatMetric } from "@/utils/format";
import { BarChartBasic } from "./BarChartBasic";
import { ChartCard } from "./ChartCard";
import { ChartDataTable } from "./ChartDataTable";
import type { ChartDatum } from "./chartTypes";

export interface FeatureImportanceChartProps {
  items: readonly FeatureImportance[] | undefined;
  /** Feature specs from model-info, used for readable labels. */
  specs?: readonly FeatureSpec[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  title?: ReactNode;
  height?: number | string;
  className?: string;
}

/** Permutation (or model) importance per feature, largest first, with the values as a table. */
export function FeatureImportanceChart({
  items,
  specs,
  isLoading = false,
  error,
  onRetry,
  title = "Feature importance",
  height = 300,
  className,
}: FeatureImportanceChartProps) {
  const sorted = [...(items ?? [])].sort((a, b) => b.importance - a.importance);
  const data: ChartDatum[] = sorted.map((item) => ({
    key: item.feature,
    label: featureLabel(item.feature, specs),
    value: item.importance,
    color: BRAND.accent,
  }));
  const method = sorted[0]?.method;
  const isEmpty = data.length === 0 || data.every((d) => d.value === 0);

  return (
    <ChartCard
      title={title}
      description={
        method
          ? `Method: ${method}. Higher values mean the model relies more on the feature.`
          : "Higher values mean the model relies more on the feature."
      }
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={isEmpty}
      emptyTitle="No importance values"
      emptyDescription="The training run did not record feature importance."
      height={height}
      summary={
        <ChartDataTable
          data={data}
          caption="Feature importance (table)"
          valueLabel="Importance"
          showShare={false}
          showTotal={false}
          valueFormatter={(v) => formatMetric(v, 4)}
        />
      }
      className={className}
    >
      <BarChartBasic
        data={data}
        orientation="horizontal"
        valueLabel="Importance"
        showValues
        valueFormatter={(v) => formatMetric(v, 3)}
        labelWidth={140}
        maxLabelLength={22}
      />
    </ChartCard>
  );
}
