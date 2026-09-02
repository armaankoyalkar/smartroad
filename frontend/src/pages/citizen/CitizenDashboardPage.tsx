import { CirclePlus, Inbox } from "lucide-react";
import { useMyIncidents, useMyStats } from "@/api/queries";
import { useAuth } from "@/auth/useAuth";
import { RecentReportsList } from "@/components/incidents/RecentReportsList";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardStats } from "@/features/citizen/dashboard/DashboardStats";
import { QuickLinks } from "@/features/citizen/dashboard/QuickLinks";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const RECENT_LIMIT = 5;

/** Citizen dashboard: own counts, the five newest reports and the primary "Report an incident" action. */
export default function CitizenDashboardPage() {
  useDocumentTitle("Dashboard");
  const { user } = useAuth();
  const stats = useMyStats();
  const recent = useMyIncidents({ limit: RECENT_LIMIT, sort: "-createdAt" });
  const recentRows = recent.data?.data ?? [];
  const firstName = user?.name.trim().split(/\s+/)[0] ?? "there";
  const isNewUser = stats.data?.total === 0 && recent.isSuccess && recentRows.length === 0;

  const reportButton = (
    <LinkButton to="/app/report" size="lg" leftIcon={<CirclePlus className="h-5 w-5" aria-hidden="true" />}>
      Report an incident
    </LinkButton>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Citizen dashboard"
        title={`Hello, ${firstName}`}
        description="Report road incidents with a location and a photo, then follow each report while administrators verify and resolve it."
        actions={reportButton}
      />

      <DashboardStats
        stats={stats.data}
        isLoading={stats.isPending}
        error={stats.error}
        onRetry={() => void stats.refetch()}
      />

      <Card>
        <CardHeader
          title="Recent reports"
          description={`Your ${RECENT_LIMIT} newest reports.`}
          actions={
            recentRows.length > 0 && (
              <LinkButton to="/app/reports" variant="outline" size="sm">
                View all
              </LinkButton>
            )
          }
        />
        {recent.isError ? (
          <ErrorState error={recent.error} onRetry={() => void recent.refetch()} />
        ) : (
          <RecentReportsList
            incidents={recentRows}
            hrefFor={(incident) => `/app/reports/${incident.id}`}
            isLoading={recent.isPending}
            emptyState={
              <EmptyState
                icon={Inbox}
                title={isNewUser ? "You have not reported anything yet" : "No reports to show"}
                description="When you report an incident it appears here with its status, and you can follow it until it is resolved."
                action={reportButton}
              />
            }
          />
        )}
      </Card>

      <QuickLinks />
    </div>
  );
}
