import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import {
  CategoryBadge,
  PriorityBadge,
  SeverityBadge,
  SourceBadge,
  VerificationBadge,
} from "@/components/ui/SemanticBadges";
import type { Incident } from "@/types/api";
import { cn } from "@/utils/cn";
import { formatDateTime, formatLatLng, formatRelative } from "@/utils/format";

export interface IncidentFactsProps {
  incident: Incident;
  /** Show the reporter row (admins only; the API omits reportedBy for other viewers anyway). */
  showReporter?: boolean;
  className?: string;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(6rem,9rem)_1fr] gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-text">{children}</dd>
    </div>
  );
}

function When({ value }: { value: string | null }) {
  if (!value) return <>—</>;
  return (
    <>
      <time dateTime={value}>{formatDateTime(value)}</time>{" "}
      <span className="text-muted">({formatRelative(value)})</span>
    </>
  );
}

/** Key facts of one incident as a description list. Every value comes from the API object. */
export function IncidentFacts({ incident, showReporter = false, className }: IncidentFactsProps) {
  const osmHref = `https://www.openstreetmap.org/?mlat=${incident.latitude}&mlon=${incident.longitude}#map=17/${incident.latitude}/${incident.longitude}`;
  return (
    <dl className={cn("divide-y divide-navy-600/60", className)}>
      <Row label="Category">
        <CategoryBadge category={incident.category} />
      </Row>
      <Row label="Severity">
        <SeverityBadge severity={incident.severity} />
      </Row>
      <Row label="Priority">
        <PriorityBadge priority={incident.priority} />
        {!incident.priority && (
          <span className="ml-2 text-xs text-muted">set by an administrator after review</span>
        )}
      </Row>
      <Row label="Verification">
        <VerificationBadge verification={incident.verification} />
      </Row>
      <Row label="Address">
        {incident.address ? incident.address : <span className="text-muted">Not provided</span>}
      </Row>
      <Row label="Coordinates">
        <span className="tabular">{formatLatLng(incident.latitude, incident.longitude)}</span>{" "}
        <a
          href={osmHref}
          target="_blank"
          rel="noreferrer"
          className="ml-1 inline-flex items-center gap-1 text-xs text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          Open in OpenStreetMap <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </Row>
      <Row label="Reported">
        <When value={incident.createdAt} />
      </Row>
      <Row label="Last update">
        <When value={incident.updatedAt} />
      </Row>
      {incident.resolvedAt && (
        <Row label="Resolved">
          <When value={incident.resolvedAt} />
        </Row>
      )}
      {incident.verifiedBy?.name && <Row label="Verified by">{incident.verifiedBy.name}</Row>}
      {showReporter && incident.reportedBy && (
        <Row label="Reporter">
          {incident.reportedBy.name}
          {incident.reportedBy.email && (
            <span className="block text-xs text-muted">{incident.reportedBy.email}</span>
          )}
        </Row>
      )}
      <Row label="Source">
        <SourceBadge source={incident.source} />
      </Row>
    </dl>
  );
}
