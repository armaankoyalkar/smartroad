import type { ReactNode } from "react";
import { Image as ImageIcon } from "lucide-react";
import { Link } from "react-router";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import {
  CategoryBadge,
  PriorityBadge,
  SeverityBadge,
  SourceBadge,
  StatusBadge,
  VerificationBadge,
} from "@/components/ui/SemanticBadges";
import type { SortState } from "@/components/ui/tableSort";
import type { Incident } from "@/types/api";
import { formatDate, formatRelative, truncate } from "@/utils/format";
import { IncidentCard } from "./IncidentCard";

export interface IncidentTableProps {
  rows: readonly Incident[];
  /** Details link for a row (citizen: /app/reports/:id, admin: /admin/incidents/:id). */
  hrefFor: (incident: Incident) => string;
  isLoading?: boolean;
  sort?: SortState | null;
  onSortChange?: (next: SortState) => void;
  emptyState?: ReactNode;
  /** Adds a reporter column (admin variant). */
  showReporter?: boolean;
  caption?: string;
  className?: string;
}

const LINK =
  "font-medium text-text underline-offset-2 hover:text-cyan-300 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";

/** Incident list: sortable table on md+ (server-side sort), cards below. */
export function IncidentTable({
  rows,
  hrefFor,
  isLoading = false,
  sort,
  onSortChange,
  emptyState,
  showReporter = false,
  caption = "Incidents",
  className,
}: IncidentTableProps) {
  const columns: DataTableColumn<Incident>[] = [
    {
      key: "title",
      header: "Report",
      render: (row) => (
        <div className="min-w-48 space-y-1">
          <Link to={hrefFor(row)} className={LINK}>
            {row.title}
          </Link>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {row.address && <span>{truncate(row.address, 60)}</span>}
            {row.image && (
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="h-3 w-3" aria-hidden="true" /> Photo
              </span>
            )}
            {row.source === "seed" && <SourceBadge source={row.source} size="sm" />}
          </div>
        </div>
      ),
    },
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
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={row.status} size="sm" />
          <VerificationBadge verification={row.verification} size="sm" />
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      render: (row) => <PriorityBadge priority={row.priority} size="sm" />,
    },
    ...(showReporter
      ? [
          {
            key: "reporter",
            header: "Reporter",
            render: (row: Incident) => (
              <span className="text-sm text-text">
                {row.reportedBy?.name ?? <span className="text-muted">—</span>}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "createdAt",
      header: "Reported",
      sortable: true,
      render: (row) => (
        <div className="whitespace-nowrap text-sm">
          <time dateTime={row.createdAt} className="text-text">
            {formatDate(row.createdAt)}
          </time>
          <span className="block text-xs text-muted">{formatRelative(row.createdAt)}</span>
        </div>
      ),
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
      emptyState={emptyState}
      caption={caption}
      renderCard={(row) => <IncidentCard incident={row} href={hrefFor(row)} showReporter={showReporter} />}
      className={className}
    />
  );
}
