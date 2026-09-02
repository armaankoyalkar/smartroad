import { CircleCheck, CircleX, ClipboardList, Clock, Wrench } from "lucide-react";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatCard } from "@/components/ui/StatCard";
import type { MyStats } from "@/types/api";
import { formatNumber } from "@/utils/format";

export interface DashboardStatsProps {
  stats: MyStats | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

/** The five citizen counts from GET /api/analytics/mine (FR-D1). Every figure is fetched, never assumed. */
export function DashboardStats({ stats, isLoading, error, onRetry }: DashboardStatsProps) {
  if (error && !stats) {
    return <ErrorState compact error={error} onRetry={onRetry} />;
  }
  const value = (key: keyof MyStats) => (stats ? formatNumber(stats[key]) : "");
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      <StatCard
        label="Total reports"
        value={value("total")}
        icon={ClipboardList}
        tone="accent"
        isLoading={isLoading}
        to="/app/reports"
        className="col-span-2 lg:col-span-1"
      />
      <StatCard
        label="Pending"
        value={value("pending")}
        caption="Submitted and under review"
        icon={Clock}
        tone="warning"
        isLoading={isLoading}
        to="/app/reports?status=SUBMITTED"
      />
      <StatCard
        label="Verified and in progress"
        value={value("active")}
        caption="Confirmed by an administrator"
        icon={Wrench}
        tone="info"
        isLoading={isLoading}
        to="/app/reports?status=VERIFIED"
      />
      <StatCard
        label="Resolved"
        value={value("resolved")}
        icon={CircleCheck}
        tone="success"
        isLoading={isLoading}
        to="/app/reports?status=RESOLVED"
      />
      <StatCard
        label="Rejected"
        value={value("rejected")}
        caption="The reason is in each report's history"
        icon={CircleX}
        tone="danger"
        isLoading={isLoading}
        to="/app/reports?status=REJECTED"
      />
    </div>
  );
}
