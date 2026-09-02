import { lazy, Suspense, useState } from "react";
import { ClipboardList } from "lucide-react";
import { useBreakdown, useSummary, useTimeline } from "@/api/queries";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { NeedsAttentionList } from "@/components/admin/NeedsAttentionList";
import { RiskOverviewCard } from "@/components/admin/RiskOverviewCard";
import {
  CategoryBarChart,
  PriorityBarChart,
  StatusDonut,
  TimelineLineChart,
} from "@/components/charts/domain";
import { LinkButton } from "@/components/ui/Button";
import { ChipToggleGroup } from "@/components/ui/ChipToggleGroup";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Granularity } from "@/types/api";

const DashboardMap = lazy(() => import("@/components/admin/DashboardMap"));

/** Timeline ranges match the API defaults per granularity (docs/api.md section 7). */
const RANGES: { value: Granularity; label: string }[] = [
  { value: "day", label: "30 days" },
  { value: "week", label: "26 weeks" },
  { value: "month", label: "12 months" },
];

export default function AdminDashboardPage() {
  useDocumentTitle("Dashboard");
  const summary = useSummary();
  const byCategory = useBreakdown("category");
  const byStatus = useBreakdown("status");
  const byPriority = useBreakdown("priority");
  const [granularity, setGranularity] = useState<Granularity>("day");
  const timeline = useTimeline({ granularity });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Dashboard"
        description="Counts, charts and a compact map of reported incidents. Every figure is read from the database."
        actions={
          <LinkButton
            to="/admin/incidents"
            leftIcon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
          >
            Manage incidents
          </LinkButton>
        }
      />

      <DashboardStats
        summary={summary.data?.data}
        isLoading={summary.isLoading}
        error={summary.error}
        onRetry={() => void summary.refetch()}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <CategoryBarChart
          rows={byCategory.data}
          isLoading={byCategory.isLoading}
          error={byCategory.error}
          onRetry={() => void byCategory.refetch()}
          height={300}
        />
        <StatusDonut
          rows={byStatus.data}
          isLoading={byStatus.isLoading}
          error={byStatus.error}
          onRetry={() => void byStatus.refetch()}
          height={300}
        />
        <PriorityBarChart
          rows={byPriority.data}
          isLoading={byPriority.isLoading}
          error={byPriority.error}
          onRetry={() => void byPriority.refetch()}
          height={300}
        />
      </div>

      <TimelineLineChart
        points={timeline.data?.data}
        granularity={timeline.data?.meta.granularity ?? granularity}
        isLoading={timeline.isLoading}
        error={timeline.error}
        onRetry={() => void timeline.refetch()}
        description={
          timeline.data ? `Reports per ${granularity}, ${timeline.data.meta.timezone}.` : undefined
        }
        actions={
          <ChipToggleGroup
            label="Timeline range"
            size="sm"
            exclusive
            options={RANGES}
            value={[granularity]}
            onChange={(next) => setGranularity(next[0] ?? granularity)}
          />
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Suspense fallback={<Skeleton className="h-[26rem] w-full rounded-card" />}>
            <DashboardMap />
          </Suspense>
        </div>
        <div className="space-y-4">
          <RiskOverviewCard />
          <NeedsAttentionList />
        </div>
      </div>
    </div>
  );
}
