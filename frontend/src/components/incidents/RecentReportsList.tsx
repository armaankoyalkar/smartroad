import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { CategoryBadge, SourceBadge, StatusBadge, VerificationBadge } from "@/components/ui/SemanticBadges";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Incident } from "@/types/api";
import { cn } from "@/utils/cn";
import { formatRelative } from "@/utils/format";

export interface RecentReportsListProps {
  incidents: readonly Incident[];
  hrefFor: (incident: Incident) => string;
  isLoading?: boolean;
  /** Rendered when there is nothing to list (and not loading). */
  emptyState?: ReactNode;
  className?: string;
}

/** Compact list of the newest reports (dashboard): title, category, status, verification, relative date. */
export function RecentReportsList({
  incidents,
  hrefFor,
  isLoading = false,
  emptyState,
  className,
}: RecentReportsListProps) {
  if (isLoading && incidents.length === 0) {
    return (
      <div role="status" aria-label="Loading recent reports" className={cn("space-y-2", className)}>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (incidents.length === 0) return <>{emptyState ?? null}</>;

  return (
    <ul className={cn("divide-y divide-navy-600/60", className)} aria-busy={isLoading || undefined}>
      {incidents.map((incident) => (
        <li key={incident.id}>
          <Link
            to={hrefFor(incident)}
            className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors duration-150 hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="truncate text-sm font-medium text-text">{incident.title}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <CategoryBadge category={incident.category} size="sm" />
                <StatusBadge status={incident.status} size="sm" />
                <VerificationBadge verification={incident.verification} size="sm" />
                {incident.source === "seed" && <SourceBadge source={incident.source} size="sm" />}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-muted">
              <time dateTime={incident.createdAt}>{formatRelative(incident.createdAt)}</time>
              <ChevronRight
                className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
