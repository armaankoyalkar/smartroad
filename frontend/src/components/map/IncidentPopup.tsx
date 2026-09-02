import { ArrowRight, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router";
import {
  CategoryBadge,
  PriorityBadge,
  RiskBadge,
  SeverityBadge,
  SourceBadge,
  StatusBadge,
} from "@/components/ui/SemanticBadges";
import type { MapFeature } from "@/types/api";
import { formatDateTime, formatRelative, truncate } from "@/utils/format";

export interface IncidentPopupProps {
  feature: MapFeature;
  /** Link to the details page; omitted for anonymous visitors (details need an account). */
  detailsHref?: string | null;
}

/** Popup body for one incident marker: title, badges, date, address and an optional details link. */
export function IncidentPopup({ feature, detailsHref }: IncidentPopupProps) {
  const p = feature.properties;
  return (
    <div className="w-60 space-y-2 text-text">
      <p className="text-sm font-semibold leading-snug">{p.title}</p>
      <div className="flex flex-wrap gap-1">
        <CategoryBadge category={p.category} size="sm" />
        <SeverityBadge severity={p.severity} size="sm" />
        <StatusBadge status={p.status} size="sm" />
        {p.priority && <PriorityBadge priority={p.priority} size="sm" />}
        {p.riskLevel && <RiskBadge level={p.riskLevel} size="sm" />}
        {p.source === "seed" && <SourceBadge source={p.source} size="sm" />}
      </div>
      <p className="text-xs text-muted">
        <time dateTime={p.createdAt}>{formatDateTime(p.createdAt)}</time> · {formatRelative(p.createdAt)}
      </p>
      {p.address && <p className="text-xs text-muted">{truncate(p.address, 90)}</p>}
      {p.hasImage && (
        <p className="flex items-center gap-1 text-xs text-muted">
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" /> Photo attached
        </p>
      )}
      {detailsHref && (
        <Link
          to={detailsHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          View details <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
