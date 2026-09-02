import { useMemo, useState } from "react";
import { UsersRound } from "lucide-react";
import { getErrorMessage, isApiError } from "@/api/client";
import { useUpdateUser } from "@/api/mutations";
import { useUsers } from "@/api/queries";
import { useAuth } from "@/auth/useAuth";
import { UserDetailDrawer } from "@/components/admin/UserDetailDrawer";
import { UsersFilters } from "@/components/admin/UsersFilters";
import { UsersTable } from "@/components/admin/UsersTable";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { sortToParam, type SortState } from "@/components/ui/tableSort";
import { useToast } from "@/components/ui/useToast";
import type { Role } from "@/constants/enums";
import { parsePage } from "@/features/admin/incidentListParams";
import {
  DEFAULT_USER_SORT,
  parseUserFilters,
  parseUserSort,
  serializeUserFilters,
  USER_PAGE_LIMIT,
  userListParams,
  type UserFilterValues,
} from "@/features/admin/userListParams";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useQueryParams } from "@/hooks/useQueryParams";
import { useMeta } from "@/meta/useMeta";
import type { AdminUser } from "@/types/api";
import { pluralize } from "@/utils/format";

type PendingChange = { kind: "active"; user: AdminUser } | { kind: "role"; user: AdminUser; role: Role };

export default function UsersPage() {
  useDocumentTitle("Users");
  const qp = useQueryParams();
  const meta = useMeta();
  const toast = useToast();
  const { user: me } = useAuth();
  const filters = useMemo(() => parseUserFilters(qp.searchParams), [qp.searchParams]);
  const sort = parseUserSort(qp.searchParams);
  const page = parsePage(qp.searchParams);
  const query = useUsers(userListParams(filters, sort, page));
  const update = useUpdateUser();

  const [search, setSearch] = useState(filters.q);
  const [seenQ, setSeenQ] = useState(filters.q);
  if (filters.q !== seenQ) {
    setSeenQ(filters.q);
    if (filters.q !== search.trim()) setSearch(filters.q);
  }
  const commitSearch = useDebouncedCallback((text: string) => qp.setOne("q", text.trim() || undefined), 350);

  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const setFilters = (next: UserFilterValues) => qp.setMany(serializeUserFilters(next));
  const setSort = (next: SortState) =>
    qp.setOne("sort", sortToParam(next) === sortToParam(DEFAULT_USER_SORT) ? undefined : sortToParam(next));
  const setPage = (next: number) => qp.setOne("page", next > 1 ? next : undefined, { resetPage: false });

  const closePending = () => {
    if (update.isPending) return;
    setPending(null);
    setPendingError(null);
  };

  const confirmPending = async () => {
    if (!pending) return;
    setPendingError(null);
    const input = pending.kind === "active" ? { isActive: !pending.user.isActive } : { role: pending.role };
    try {
      const saved = await update.mutateAsync({ id: pending.user.id, input });
      toast.success(
        pending.kind === "active"
          ? `${saved.name} ${saved.isActive ? "activated" : "deactivated"}`
          : `${saved.name} is now ${meta.label("role", saved.role).toLowerCase()}`,
      );
      setPending(null);
    } catch (error) {
      const fieldMessage = isApiError(error) ? error.fieldErrors().id : undefined;
      setPendingError(fieldMessage ?? getErrorMessage(error));
    }
  };

  const rows = query.data?.data ?? [];
  const pageMeta = query.data?.meta;
  const filtered = filters.q !== "" || filters.role !== "" || filters.isActive !== "";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description={
          pageMeta
            ? `${pluralize(pageMeta.total, "account")} match the current filters.`
            : "Accounts, roles and access."
        }
      />

      <UsersFilters
        filters={filters}
        onFiltersChange={setFilters}
        search={search}
        onSearchChange={(text) => {
          setSearch(text);
          commitSearch(text);
        }}
      />

      <Card padding="none">
        {query.error ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <UsersTable
            rows={rows}
            isLoading={query.isLoading || (query.isFetching && query.isPlaceholderData)}
            sort={sort}
            onSortChange={setSort}
            currentUserId={me?.id}
            pendingId={update.isPending && pending ? pending.user.id : null}
            onOpen={(user) => setOpenUserId(user.id)}
            onToggleActive={(user) => setPending({ kind: "active", user })}
            onChangeRole={(user, role) => setPending({ kind: "role", user, role })}
            emptyState={
              <EmptyState
                icon={UsersRound}
                title={filtered ? "No users match these filters" : "No users yet"}
                description={
                  filtered
                    ? "Try another search or clear the filters."
                    : "Accounts appear here once people register."
                }
              />
            }
          />
        )}
        {pageMeta && pageMeta.total > 0 && (
          <div className="border-t border-navy-600 px-4 py-3">
            <Pagination
              page={pageMeta.page}
              totalPages={pageMeta.totalPages}
              total={pageMeta.total}
              limit={pageMeta.limit || USER_PAGE_LIMIT}
              onPageChange={setPage}
              itemLabel="users"
            />
          </div>
        )}
      </Card>

      <UserDetailDrawer userId={openUserId} onClose={() => setOpenUserId(null)} />

      <ConfirmDialog
        open={pending !== null}
        onClose={closePending}
        onConfirm={confirmPending}
        title={
          pending?.kind === "active"
            ? pending.user.isActive
              ? `Deactivate ${pending.user.name}?`
              : `Activate ${pending.user.name}?`
            : pending
              ? `Change ${pending.user.name}'s role?`
              : ""
        }
        description={
          pending?.kind === "active"
            ? pending.user.isActive
              ? "The account keeps its reports but can no longer sign in. Deactivation takes effect immediately."
              : "The account can sign in again."
            : pending
              ? `The role becomes ${meta.label("role", pending.role)}. Administrators can manage every incident and user.`
              : undefined
        }
        confirmLabel={
          pending?.kind === "active" ? (pending.user.isActive ? "Deactivate" : "Activate") : "Change role"
        }
        tone={pending?.kind === "active" && pending.user.isActive ? "danger" : "primary"}
        loading={update.isPending}
        error={pendingError}
      />
    </div>
  );
}
