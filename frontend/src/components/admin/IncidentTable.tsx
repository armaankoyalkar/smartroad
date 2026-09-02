import type { ReactNode } from "react";
import { Link } from "react-router";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import {
  CategoryBadge,
  PriorityBadge,
  RiskBadge,
  SeverityBadge,
  SourceBadge,
  StatusBadge,
  VerificationBadge,
} from "@/components/ui/SemanticBadges";
import type { SortState } from "@/components/ui/tableSort";
import type { IncidentStatus, Priority } from "@/constants/enums";
import type { Incident } from "@/types/api";
import { EM_DASH, formatDate, formatDateTime, truncate } from "@/utils/format";
import { IncidentRowActions } from "./IncidentRowActions";

export interface IncidentTableProps {
  rows: readonly Incident[];
  isLoading?: boolean;
  sort: SortState;
  onSortChange: (next: SortState) => void;
  emptyState?: ReactNode;
  onStatus: (incident: Incident, status: IncidentStatus) => void;
  onPriority: (incident: Incident, priority: Priority | null) => void;
  /** Id of the row whose quick action is in flight. */
  pendingId?: string | null;
}

function TitleCell({ incident }: { incident: Incident }) {
  return (
    <div className="min-w-0 max-w-xs">
      <Link
        to={`/admin/incidents/${incident.id}`}
        className="block truncate font-medium text-text hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
      >
        {incident.title}
      </Link>
      <p className="mt-0.5 truncate text-xs text-muted">
        {incident.address ? truncate(incident.address, 60) : EM_DASH}
      </p>
      {incident.source === "seed" && <SourceBadge source="seed" size="sm" className="mt-1" />}
    </div>
  );
}

function RiskCell({ incident }: { incident: Incident }) {
  const estimate = incident.riskEstimate;
  if (!estimate) return <span className="text-xs text-muted">not estimated</span>;
  return <RiskBadge level={estimate.level} size="sm" />;
}

/** Sortable incident table (date, severity, priority, status) that collapses to cards on phones. */
export function IncidentTable({
  rows,
  isLoading = false,
  sort,
  onSortChange,
  emptyState,
  onStatus,
  onPriority,
  pendingId = null,
}: IncidentTableProps) {
  const actions = (incident: Incident, compact: boolean) => (
    <IncidentRowActions
      incident={incident}
      compact={compact}
      busy={pendingId === incident.id}
      onStatus={(status) => onStatus(incident, status)}
      onPriority={(priority) => onPriority(incident, priority)}
    />
  );

  const columns: DataTableColumn<Incident>[] = [
    { key: "title", header: "Incident", render: (row) => <TitleCell incident={row} /> },
    {
      key: "category",
      header: "Category",
      render: (row) => <CategoryBadge category={row.category} size="sm" />,
    },
    {
      key: "severity",
      header: "Severity",
      sortable: true,
      render: (row) => <SeverityBadge severity={row.severity} size="sm" />,
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      render: (row) => <PriorityBadge priority={row.priority} size="sm" />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: "verification",
      header: "Verification",
      render: (row) => <VerificationBadge verification={row.verification} size="sm" />,
    },
    { key: "risk", header: "Risk", render: (row) => <RiskCell incident={row} /> },
    {
      key: "reporter",
      header: "Reporter",
      render: (row) => <span className="text-muted">{row.reportedBy?.name ?? EM_DASH}</span>,
    },
    {
      key: "createdAt",
      header: "Reported",
      sortable: true,
      render: (row) => (
        <time
          dateTime={row.createdAt}
          title={formatDateTime(row.createdAt)}
          className="whitespace-nowrap text-muted"
        >
          {formatDate(row.createdAt)}
        </time>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      hideHeader: true,
      align: "right",
      render: (row) => actions(row, true),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      sort={sort}
      onSortChange={onSortChange}
      isLoading={isLoading}
      loadingRows={8}
      emptyState={emptyState}
      caption="Incidents"
      dense
      renderCard={(incident) => (
        <Card padding="sm" className="space-y-3">
          <TitleCell incident={incident} />
          <div className="flex flex-wrap gap-1.5">
            <CategoryBadge category={incident.category} size="sm" />
            <SeverityBadge severity={incident.severity} size="sm" />
            <PriorityBadge priority={incident.priority} size="sm" />
            <StatusBadge status={incident.status} size="sm" />
            <VerificationBadge verification={incident.verification} size="sm" />
            <RiskCell incident={incident} />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-muted">
            <span>{incident.reportedBy?.name ?? EM_DASH}</span>
            <time dateTime={incident.createdAt}>{formatDate(incident.createdAt)}</time>
          </div>
          {actions(incident, false)}
        </Card>
      )}
    />
  );
}
