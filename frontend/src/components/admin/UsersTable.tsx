import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import type { SortState } from "@/components/ui/tableSort";
import { BRAND } from "@/constants/colors";
import { ROLES, type Role } from "@/constants/enums";
import { useMeta } from "@/meta/useMeta";
import type { AdminUser } from "@/types/api";
import { formatDate, formatNumber } from "@/utils/format";

export interface UsersTableProps {
  rows: readonly AdminUser[];
  isLoading?: boolean;
  sort: SortState;
  onSortChange: (next: SortState) => void;
  emptyState?: ReactNode;
  /** Id of the signed-in administrator (the API refuses self-changes; the row says so). */
  currentUserId?: string;
  onOpen: (user: AdminUser) => void;
  onToggleActive: (user: AdminUser) => void;
  onChangeRole: (user: AdminUser, role: Role) => void;
  pendingId?: string | null;
}

export function RoleBadge({ role, size = "sm" }: { role: Role; size?: "sm" | "md" }) {
  const meta = useMeta();
  return (
    <Badge color={role === "admin" ? BRAND.accent : BRAND.secondary} size={size}>
      {meta.label("role", role)}
    </Badge>
  );
}

/** Users with inline role select and active switch; every change is confirmed by the page. */
export function UsersTable({
  rows,
  isLoading = false,
  sort,
  onSortChange,
  emptyState,
  currentUserId,
  onOpen,
  onToggleActive,
  onChangeRole,
  pendingId = null,
}: UsersTableProps) {
  const meta = useMeta();

  const nameCell = (user: AdminUser) => (
    <div className="flex items-center gap-3">
      <Avatar name={user.name} size="sm" />
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onOpen(user)}
          className="block max-w-[14rem] truncate text-left font-medium text-text hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          {user.name}
          {user.id === currentUserId && <span className="ml-1.5 text-xs text-muted">(you)</span>}
        </button>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>
    </div>
  );

  const roleCell = (user: AdminUser) => (
    <div className="flex items-center gap-2">
      <RoleBadge role={user.role} />
      <Select
        selectSize="sm"
        className="w-36"
        aria-label={`Role of ${user.name}`}
        value={user.role}
        disabled={pendingId === user.id}
        onChange={(event) => {
          const next = event.target.value as Role;
          if (next !== user.role) onChangeRole(user, next);
        }}
        options={ROLES.map((role) => ({ value: role, label: meta.label("role", role) }))}
      />
    </div>
  );

  const activeCell = (user: AdminUser) => (
    <Switch
      size="sm"
      checked={user.isActive}
      disabled={pendingId === user.id}
      onChange={() => onToggleActive(user)}
      label={user.isActive ? "Active" : "Deactivated"}
    />
  );

  const columns: DataTableColumn<AdminUser>[] = [
    { key: "name", header: "User", sortable: true, render: nameCell },
    { key: "role", header: "Role", render: roleCell },
    { key: "active", header: "Account", render: activeCell },
    {
      key: "incidents",
      header: "Incidents",
      align: "right",
      render: (user) => <span className="tabular">{formatNumber(user.incidentCount)}</span>,
    },
    {
      key: "createdAt",
      header: "Joined",
      sortable: true,
      render: (user) => (
        <time dateTime={user.createdAt} className="whitespace-nowrap text-muted">
          {formatDate(user.createdAt)}
        </time>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(user) => user.id}
      sort={sort}
      onSortChange={onSortChange}
      isLoading={isLoading}
      loadingRows={8}
      emptyState={emptyState}
      caption="Users"
      dense
      renderCard={(user) => (
        <Card padding="sm" className="space-y-3">
          {nameCell(user)}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {roleCell(user)}
            {activeCell(user)}
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="tabular">{formatNumber(user.incidentCount)} incidents</span>
            <time dateTime={user.createdAt}>Joined {formatDate(user.createdAt)}</time>
          </div>
        </Card>
      )}
    />
  );
}
