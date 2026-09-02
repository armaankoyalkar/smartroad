import type { ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  CategoryBadge,
  PriorityBadge,
  RiskBadge,
  SeverityBadge,
  SourceBadge,
  StatusBadge,
  VerificationBadge,
} from "@/components/ui/SemanticBadges";
import type { Incident } from "@/types/api";
import { EM_DASH, formatDateTime, formatLatLng } from "@/utils/format";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-navy-600/50 py-2 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-faint sm:w-40">{label}</dt>
      <dd className="min-w-0 text-sm text-text sm:text-right">{children}</dd>
    </div>
  );
}

/** Every field an administrator may see (docs/api.md 6.1, admin variant) as a definition list. */
export function AdminIncidentFacts({ incident }: { incident: Incident }) {
  const estimate = incident.riskEstimate ?? null;
  return (
    <Card>
      <CardHeader title="Details" as="h2" />
      <dl>
        <Row label="Category">
          <CategoryBadge category={incident.category} />
        </Row>
        <Row label="Severity">
          <SeverityBadge severity={incident.severity} />
        </Row>
        <Row label="Priority">
          <PriorityBadge priority={incident.priority} />
        </Row>
        <Row label="Status">
          <span className="inline-flex flex-wrap justify-end gap-1.5">
            <StatusBadge status={incident.status} />
            <VerificationBadge verification={incident.verification} />
          </span>
        </Row>
        <Row label="Risk estimate">
          {estimate ? (
            <span className="inline-flex flex-col items-end gap-1">
              <RiskBadge level={estimate.level} />
              <span className="text-xs text-muted">
                Estimate from historical data · {estimate.modelVersion} ·{" "}
                {formatDateTime(estimate.estimatedAt)}
              </span>
            </span>
          ) : (
            <span className="text-muted">Not estimated yet</span>
          )}
        </Row>
        <Row label="Source">
          <SourceBadge source={incident.source} />
        </Row>
        <Row label="Reporter">
          {incident.reportedBy ? (
            <span className="inline-flex flex-col items-end">
              <span>{incident.reportedBy.name}</span>
              {incident.reportedBy.email && (
                <a
                  href={`mailto:${incident.reportedBy.email}`}
                  className="text-xs text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                >
                  {incident.reportedBy.email}
                </a>
              )}
            </span>
          ) : (
            EM_DASH
          )}
        </Row>
        <Row label="Verified by">
          {incident.verifiedBy?.name ?? <span className="text-muted">Not verified yet</span>}
        </Row>
        <Row label="Admin note">
          {incident.adminNote ? (
            <span className="whitespace-pre-wrap sm:text-left">{incident.adminNote}</span>
          ) : (
            <span className="text-muted">None</span>
          )}
        </Row>
        <Row label="Address">{incident.address || <span className="text-muted">No address given</span>}</Row>
        <Row label="Coordinates">
          <span className="tabular font-mono text-xs">
            {formatLatLng(incident.latitude, incident.longitude)}
          </span>
        </Row>
        <Row label="Reported">
          <time dateTime={incident.createdAt}>{formatDateTime(incident.createdAt)}</time>
        </Row>
        <Row label="Last updated">
          <time dateTime={incident.updatedAt}>{formatDateTime(incident.updatedAt)}</time>
        </Row>
        <Row label="Resolved">
          {incident.resolvedAt ? (
            <time dateTime={incident.resolvedAt}>{formatDateTime(incident.resolvedAt)}</time>
          ) : (
            <span className="text-muted">Not resolved</span>
          )}
        </Row>
      </dl>
    </Card>
  );
}
