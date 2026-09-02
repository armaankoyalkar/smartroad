import { useMemo } from "react";
import { useSummary, useTimeline } from "@/api/queries";
import { BreakdownSection } from "@/components/admin/BreakdownSection";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { RangePicker } from "@/components/admin/RangePicker";
import { TimelineLineChart } from "@/components/charts/TimelineLineChart";
import { BREAKDOWN_FACETS, timelineRows } from "@/components/charts/chartHelpers";
import { ChipToggleGroup } from "@/components/ui/ChipToggleGroup";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  describeRange,
  parseAnalyticsRange,
  rangeToParams,
  serializeAnalyticsRange,
  type AnalyticsRange,
} from "@/features/admin/analyticsRange";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useQueryParams } from "@/hooks/useQueryParams";
import type { BreakdownBy, Granularity } from "@/types/api";

const GRANULARITIES: readonly Granularity[] = ["day", "week", "month"];
const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export default function AnalyticsPage() {
  useDocumentTitle("Analytics");
  const qp = useQueryParams();
  const range = useMemo(() => parseAnalyticsRange(qp.searchParams), [qp.searchParams]);
  const by = qp.getEnum<BreakdownBy>("by", BREAKDOWN_FACETS, "category");
  const granularity = qp.getEnum<Granularity>("granularity", GRANULARITIES, "day");
  const params = useMemo(() => rangeToParams(range), [range]);
  const rangeLabel = describeRange(range);

  const summary = useSummary(params);
  const timeline = useTimeline({ ...params, granularity });
  const timelineTable = timelineRows(timeline.data?.data, timeline.data?.meta.granularity ?? granularity);

  const setRange = (next: AnalyticsRange) => qp.setMany(serializeAnalyticsRange(next), { resetPage: false });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description={`Counts by facet and over time for ${rangeLabel.toLowerCase()}. Every number is read from the database.`}
      />

      <RangePicker value={range} onChange={setRange} />

      <DashboardStats
        summary={summary.data?.data}
        isLoading={summary.isLoading}
        error={summary.error}
        onRetry={() => void summary.refetch()}
      />

      <BreakdownSection
        by={by}
        onChange={(next) => qp.setOne("by", next === "category" ? undefined : next, { resetPage: false })}
        params={params}
        rangeLabel={rangeLabel}
      />

      <TimelineLineChart
        points={timeline.data?.data}
        granularity={timeline.data?.meta.granularity ?? granularity}
        isLoading={timeline.isLoading}
        error={timeline.error}
        onRetry={() => void timeline.refetch()}
        description={
          timeline.data
            ? `Reports per ${granularity} from ${timeline.data.meta.from} to ${timeline.data.meta.to} (${timeline.data.meta.timezone}).`
            : undefined
        }
        height={300}
        actions={
          <>
            <ChipToggleGroup
              label="Granularity"
              size="sm"
              exclusive
              options={GRANULARITY_OPTIONS}
              value={[granularity]}
              onChange={(next) =>
                qp.setOne("granularity", (next[0] ?? granularity) === "day" ? undefined : next[0], {
                  resetPage: false,
                })
              }
            />
            <ExportCsvButton
              filename={`Incidents over time ${rangeLabel}`}
              headers={["Period", "Label", "Count"]}
              rows={timelineTable.map((r) => [r.period, r.label, r.count])}
              disabled={timeline.isLoading || !!timeline.error}
            />
          </>
        }
      />
    </div>
  );
}
