import {
  CircleCheck,
  CircleX,
  ClipboardList,
  Database,
  Hourglass,
  ShieldCheck,
  Siren,
  Wrench,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatCard, type StatTone } from "@/components/ui/StatCard";
import type { AnalyticsSummary } from "@/types/api";
import { formatNumber } from "@/utils/format";

export interface DashboardStatsProps {
  summary: AnalyticsSummary | undefined;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}

const OPEN = "SUBMITTED,UNDER_REVIEW,VERIFIED,IN_PROGRESS";

const CARDS: {
  key: keyof AnalyticsSummary;
  label: string;
  caption?: string;
  tone: StatTone;
  icon: typeof ClipboardList;
  to: string;
}[] = [
  { key: "total", label: "Total incidents", tone: "accent", icon: ClipboardList, to: "/admin/incidents" },
  {
    key: "pendingVerification",
    label: "Pending verification",
    caption: "Submitted and under review",
    tone: "warning",
    icon: Hourglass,
    to: "/admin/incidents?status=SUBMITTED,UNDER_REVIEW",
  },
  {
    key: "verified",
    label: "Verified",
    tone: "info",
    icon: ShieldCheck,
    to: "/admin/incidents?status=VERIFIED",
  },
  {
    key: "active",
    label: "Active",
    caption: "includes verified",
    tone: "info",
    icon: Wrench,
    to: "/admin/incidents?status=VERIFIED,IN_PROGRESS",
  },
  {
    key: "resolved",
    label: "Resolved",
    tone: "success",
    icon: CircleCheck,
    to: "/admin/incidents?status=RESOLVED",
  },
  {
    key: "rejected",
    label: "Rejected",
    tone: "danger",
    icon: CircleX,
    to: "/admin/incidents?status=REJECTED",
  },
  {
    key: "highPriorityOpen",
    label: "High-priority open",
    caption: "High or critical, not resolved or rejected",
    tone: "danger",
    icon: Siren,
    to: `/admin/incidents?priority=HIGH,CRITICAL&status=${OPEN}`,
  },
];

/** The seven summary figures (GET /api/analytics/summary) plus the demo-data note. */
export function DashboardStats({ summary, isLoading = false, error, onRetry }: DashboardStatsProps) {
  if (error) {
    return <ErrorState compact error={error} onRetry={onRetry} />;
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {CARDS.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            caption={card.caption}
            icon={card.icon}
            tone={card.tone}
            to={card.to}
            isLoading={isLoading || !summary}
            value={summary ? formatNumber(summary[card.key] as number) : ""}
          />
        ))}
      </div>
      {summary && summary.seedCount > 0 && (
        <Alert tone="neutral" icon={Database}>
          Demo data included: {formatNumber(summary.seedCount)} records marked as seed data are part of these
          figures.
        </Alert>
      )}
    </div>
  );
}
