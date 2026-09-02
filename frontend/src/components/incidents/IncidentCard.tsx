import { ChevronRight, Image as ImageIcon, MapPin } from "lucide-react";
import { CardLink } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/ui/SemanticBadges";
import type { Incident } from "@/types/api";
import { cn } from "@/utils/cn";
import { formatDate, formatRelative, truncate } from "@/utils/format";
import { IncidentBadges } from "./IncidentBadges";

export interface IncidentCardProps {
  incident: Incident;
  href: string;
  showReporter?: boolean;
  className?: string;
}

/** Card row for phone layouts and compact lists; the whole card links to the details page. */
export function IncidentCard({ incident, href, showReporter = false, className }: IncidentCardProps) {
  return (
    <CardLink to={href} padding="sm" className={cn("group", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-text">{incident.title}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={incident.category} size="sm" />
            <IncidentBadges incident={incident} size="sm" />
          </div>
          <p className="text-xs text-muted">
            <time dateTime={incident.createdAt}>{formatDate(incident.createdAt)}</time> ·{" "}
            {formatRelative(incident.createdAt)}
            {showReporter && incident.reportedBy?.name && <> · {incident.reportedBy.name}</>}
          </p>
          {incident.address && (
            <p className="flex items-center gap-1 text-xs text-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{truncate(incident.address, 70)}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 text-muted">
          <ChevronRight
            className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
          {incident.image && (
            <span className="inline-flex items-center gap-1 text-[11px]">
              <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" /> Photo
            </span>
          )}
        </div>
      </div>
    </CardLink>
  );
}
