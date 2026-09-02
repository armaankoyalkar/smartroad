import { useEffect, useMemo, useRef, useState } from "react";
import { SearchX } from "lucide-react";
import { useAdminIncidents } from "@/api/queries";
import { IncidentFilterBar } from "@/components/admin/IncidentFilterBar";
import { IncidentTable } from "@/components/admin/IncidentTable";
import { StatusNoteDialog } from "@/components/admin/StatusNoteDialog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { sortToParam, type SortState } from "@/components/ui/tableSort";
import {
  countActiveIncidentFilters,
  DEFAULT_INCIDENT_SORT,
  EMPTY_INCIDENT_FILTERS,
  INCIDENT_PAGE_LIMIT,
  incidentListParams,
  parseIncidentFilters,
  parseIncidentSort,
  parsePage,
  serializeIncidentFilters,
  type IncidentFilterValues,
} from "@/features/admin/incidentListParams";
import { useIncidentQuickActions } from "@/features/admin/useIncidentQuickActions";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useQueryParams } from "@/hooks/useQueryParams";
import type { Incident } from "@/types/api";
import { pluralize } from "@/utils/format";

export default function IncidentManagementPage() {
  useDocumentTitle("Incidents");
  const qp = useQueryParams();
  const filters = useMemo(() => parseIncidentFilters(qp.searchParams), [qp.searchParams]);
  const sort = parseIncidentSort(qp.searchParams);
  const page = parsePage(qp.searchParams);
  const params = useMemo(() => incidentListParams(filters, sort, page), [filters, sort, page]);
  const query = useAdminIncidents(params);
  const actions = useIncidentQuickActions();
  const searchRef = useRef<HTMLInputElement>(null);

  // The search box is committed to the URL after a pause; an outside URL change (back button,
  // a link with ?q=) is copied back into the box without clobbering what is being typed.
  const [search, setSearch] = useState(filters.q);
  const [seenQ, setSeenQ] = useState(filters.q);
  if (filters.q !== seenQ) {
    setSeenQ(filters.q);
    if (filters.q !== search.trim()) setSearch(filters.q);
  }
  const commitSearch = useDebouncedCallback((text: string) => qp.setOne("q", text.trim() || undefined), 350);

  // The admin layout's search shortcut lands here with ?focus=q.
  useEffect(() => {
    if (qp.get("focus") === "q") {
      searchRef.current?.focus();
      qp.setOne("focus", undefined, { resetPage: false });
    }
  }, [qp]);

  const [rejecting, setRejecting] = useState<Incident | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const setFilters = (next: IncidentFilterValues) => qp.setMany(serializeIncidentFilters(next));
  const setSort = (next: SortState) =>
    qp.setOne(
      "sort",
      sortToParam(next) === sortToParam(DEFAULT_INCIDENT_SORT) ? undefined : sortToParam(next),
    );
  const setPage = (next: number) => qp.setOne("page", next > 1 ? next : undefined, { resetPage: false });

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;
  const active = countActiveIncidentFilters(filters) + (filters.q ? 1 : 0);

  const onStatus = (incident: Incident, status: Incident["status"]) => {
    if (status === "REJECTED") {
      setRejectError(null);
      setRejecting(incident);
      return;
    }
    void actions.applyStatus(incident, status);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Incidents"
        description={
          meta
            ? `${pluralize(meta.total, "incident")} match the current filters.`
            : "Search, filter, sort and update every reported incident."
        }
      />

      <IncidentFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        search={search}
        onSearchChange={(text) => {
          setSearch(text);
          commitSearch(text);
        }}
        searchInputRef={searchRef}
        defaultOpen={countActiveIncidentFilters(filters) > 0}
      />

      <Card padding="none">
        {query.error ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <IncidentTable
            rows={rows}
            isLoading={query.isLoading || (query.isFetching && query.isPlaceholderData)}
            sort={sort}
            onSortChange={setSort}
            pendingId={actions.pendingId}
            onStatus={onStatus}
            onPriority={(incident, priority) => void actions.applyPriority(incident, priority)}
            emptyState={
              <EmptyState
                icon={SearchX}
                title={active > 0 ? "No incidents match these filters" : "No incidents reported yet"}
                description={
                  active > 0
                    ? "Try widening the date range or clearing a facet."
                    : "Reports appear here as soon as citizens submit them."
                }
                action={
                  active > 0 ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearch("");
                        setFilters(EMPTY_INCIDENT_FILTERS);
                      }}
                    >
                      Reset filters
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        )}
        {meta && meta.total > 0 && (
          <div className="border-t border-navy-600 px-4 py-3">
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit || INCIDENT_PAGE_LIMIT}
              onPageChange={setPage}
              itemLabel="incidents"
            />
          </div>
        )}
      </Card>

      <StatusNoteDialog
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        title="Reject this incident?"
        description={rejecting?.title}
        confirmLabel="Reject"
        tone="danger"
        requireNote
        noteLabel="Reason for rejection"
        loading={actions.pendingId !== null}
        error={rejectError}
        onConfirm={async (note) => {
          if (!rejecting) return;
          const ok = await actions.applyStatus(rejecting, "REJECTED", note);
          if (ok) setRejecting(null);
          else setRejectError("The rejection was not applied. See the notification for the reason.");
        }}
      />
    </div>
  );
}
