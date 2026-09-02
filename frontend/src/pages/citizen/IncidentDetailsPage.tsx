import { Pencil, ShieldCheck } from "lucide-react";
import { useParams } from "react-router";
import { useIncident } from "@/api/queries";
import { useAuth } from "@/auth/useAuth";
import { IncidentBadges } from "@/components/incidents/IncidentBadges";
import { IncidentFacts } from "@/components/incidents/IncidentFacts";
import { IncidentImage } from "@/components/incidents/IncidentImage";
import { StatusTimeline } from "@/components/incidents/StatusTimeline";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { CategoryBadge, RiskBadge } from "@/components/ui/SemanticBadges";
import { Skeleton } from "@/components/ui/Skeleton";
import { IncidentLoadError } from "@/features/citizen/details/IncidentLoadError";
import { IncidentLocationCard } from "@/features/citizen/details/IncidentLocationCard";
import { canEditIncident, isReporter } from "@/features/citizen/incidentAccess";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMeta } from "@/meta/useMeta";
import { formatDateTime, formatRelative } from "@/utils/format";

function DetailsSkeleton() {
  return (
    <div role="status" aria-label="Loading report" className="space-y-6">
      <Skeleton className="h-8 w-2/3 max-w-md" />
      <Skeleton className="h-5 w-72 max-w-full" />
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(20rem,24rem)]">
        <div className="space-y-6">
          <Skeleton className="h-40 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-72 rounded-card" />
        </div>
      </div>
    </div>
  );
}

/** One report: header with badges, photo, location, facts, history and (for the reporter while SUBMITTED) an edit link. */
export default function IncidentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const meta = useMeta();
  const query = useIncident(id);
  const incident = query.data;
  useDocumentTitle(incident?.title ?? "Incident details");

  if (query.isPending) return <DetailsSkeleton />;
  if (query.isError || !incident) {
    return <IncidentLoadError error={query.error} onRetry={() => void query.refetch()} />;
  }

  const reporter = isReporter(incident, user);
  const canEdit = canEditIncident(incident, user);

  return (
    <div className="space-y-6">
      <PageHeader
        backTo={{ to: "/app/reports", label: "My reports" }}
        title={incident.title}
        titleAddon={<IncidentBadges incident={incident} />}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={incident.category} />
            <span>
              Reported <time dateTime={incident.createdAt}>{formatDateTime(incident.createdAt)}</time> (
              {formatRelative(incident.createdAt)})
            </span>
          </span>
        }
        actions={
          <>
            {canEdit && (
              <LinkButton
                to={`/app/reports/${incident.id}/edit`}
                variant="secondary"
                leftIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
              >
                Edit
              </LinkButton>
            )}
            {isAdmin && (
              <LinkButton
                to={`/admin/incidents/${incident.id}`}
                variant="outline"
                leftIcon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              >
                Open in admin view
              </LinkButton>
            )}
          </>
        }
      />

      {reporter && !canEdit && (
        <Alert tone="neutral">
          This report is {meta.label("status", incident.status).toLowerCase()} and can no longer be edited.
          Administrators keep its history and notes below.
        </Alert>
      )}

      {incident.adminNote && (
        <Alert tone="info" title="Note from the administrator">
          {incident.adminNote}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(20rem,24rem)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Description" />
            <p className="whitespace-pre-line text-sm leading-relaxed text-text">{incident.description}</p>
          </Card>
          <Card>
            <CardHeader title="Photo" />
            <IncidentImage image={incident.image} title={incident.title} />
          </Card>
          <Card>
            <CardHeader
              title="History"
              description="Every status and priority change, with the notes administrators added."
            />
            <StatusTimeline entries={incident.statusHistory} />
          </Card>
        </div>

        <div className="space-y-6">
          <IncidentLocationCard incident={incident} />
          <Card>
            <CardHeader title="Details" />
            <IncidentFacts incident={incident} showReporter={isAdmin} />
          </Card>
          {incident.riskEstimate && (
            <Card>
              <CardHeader
                title="Risk estimate"
                description="Estimate from historical data, not a prediction."
              />
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge level={incident.riskEstimate.level} />
                <span className="text-xs text-muted">
                  model {incident.riskEstimate.modelVersion} ·{" "}
                  <time dateTime={incident.riskEstimate.estimatedAt}>
                    {formatDateTime(incident.riskEstimate.estimatedAt)}
                  </time>
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
