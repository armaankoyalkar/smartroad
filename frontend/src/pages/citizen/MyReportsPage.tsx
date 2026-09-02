import { CirclePlus, Inbox, SearchX } from "lucide-react";
import { useMyIncidents } from "@/api/queries";
import { IncidentTable } from "@/components/incidents/IncidentTable";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { MyReportsFilters } from "@/features/citizen/reports/MyReportsFilters";
import { MY_REPORTS_LIMIT, useMyReportsParams } from "@/features/citizen/reports/useMyReportsParams";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatNumber } from "@/utils/format";

/** The caller's own reports (GET /api/incidents/mine) with URL-backed filters, sort and pagination. */
export default function MyReportsPage() {
  useDocumentTitle("My reports");
  const state = useMyReportsParams();
  const query = useMyIncidents(state.params);
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  const emptyState =
    state.activeFilterCount > 0 ? (
      <EmptyState
        icon={SearchX}
        title="No reports match these filters"
        description="Try another status or category, or clear the filters."
        action={
          <Button variant="outline" onClick={state.reset}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={Inbox}
        title="You have not reported anything yet"
        description="Reports you file appear here with their status, priority and verification state."
        action={
          <LinkButton to="/app/report" leftIcon={<CirclePlus className="h-4 w-4" aria-hidden="true" />}>
            Report an incident
          </LinkButton>
        }
      />
    );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Citizen area"
        title="My reports"
        description={
          meta && meta.total > 0
            ? `${formatNumber(meta.total)} report${meta.total === 1 ? "" : "s"} filed with this account.`
            : "Every incident you have reported, newest first."
        }
        actions={
          <LinkButton to="/app/report" leftIcon={<CirclePlus className="h-4 w-4" aria-hidden="true" />}>
            Report an incident
          </LinkButton>
        }
      />

      <Card padding="sm">
        <MyReportsFilters
          status={state.status}
          category={state.category}
          onStatusChange={state.setStatus}
          onCategoryChange={state.setCategory}
          onReset={state.reset}
          activeFilterCount={state.activeFilterCount}
        />
      </Card>

      <Card padding="none" className="overflow-hidden">
        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <IncidentTable
            rows={rows}
            hrefFor={(incident) => `/app/reports/${incident.id}`}
            isLoading={query.isPending || query.isFetching}
            sort={state.sort}
            onSortChange={state.setSort}
            emptyState={emptyState}
            caption="My reports"
            className="p-3 md:p-0"
          />
        )}
      </Card>

      {meta && (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={meta.limit || MY_REPORTS_LIMIT}
          onPageChange={state.setPage}
          itemLabel="reports"
        />
      )}
    </div>
  );
}
