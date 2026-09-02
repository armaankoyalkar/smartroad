import { useBreakdown } from "@/api/queries";
import { BreakdownChart, type BreakdownChartKind } from "@/components/charts/BreakdownChart";
import { BREAKDOWN_FACETS, BREAKDOWN_TITLES } from "@/components/charts/chartHelpers";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import type { AnalyticsParams, BreakdownBy } from "@/types/api";
import { ExportCsvButton } from "./ExportCsvButton";

const KIND: Record<BreakdownBy, BreakdownChartKind> = {
  category: "bars",
  status: "donut",
  priority: "columns",
  severity: "columns",
  riskLevel: "donut",
};

const TAB_LABEL: Record<BreakdownBy, string> = {
  category: "Category",
  status: "Status",
  priority: "Priority",
  severity: "Severity",
  riskLevel: "Risk level",
};

export interface BreakdownSectionProps {
  by: BreakdownBy;
  onChange: (by: BreakdownBy) => void;
  params: AnalyticsParams;
  /** Text describing the range, appended to the export file name. */
  rangeLabel: string;
}

const TABS_ID = "analytics-breakdown";

/** Tabs over the five breakdown facets; each shows a chart, the same numbers as a table, and a CSV export. */
export function BreakdownSection({ by, onChange, params, rangeLabel }: BreakdownSectionProps) {
  const query = useBreakdown(by, params);
  const rows = query.data ?? [];
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <section aria-labelledby={`${TABS_ID}-heading`} className="space-y-3">
      <h2 id={`${TABS_ID}-heading`} className="sr-only">
        Breakdowns
      </h2>
      <Tabs
        id={TABS_ID}
        aria-label="Breakdown facet"
        items={BREAKDOWN_FACETS.map((facet) => ({ value: facet, label: TAB_LABEL[facet] }))}
        value={by}
        onChange={onChange}
        variant="pills"
        size="sm"
      />
      <TabPanel tabsId={TABS_ID} value={by} activeValue={by}>
        <BreakdownChart
          rows={query.data}
          by={by}
          kind={KIND[by]}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          height={300}
          actions={
            <ExportCsvButton
              filename={`${BREAKDOWN_TITLES[by]} ${rangeLabel}`}
              headers={["Key", "Label", "Count", "Share"]}
              rows={rows.map((r) => [
                r.key,
                r.label,
                r.count,
                total > 0 ? `${((r.count / total) * 100).toFixed(1)}%` : "",
              ])}
              disabled={query.isLoading || !!query.error}
            />
          }
        />
      </TabPanel>
    </section>
  );
}
