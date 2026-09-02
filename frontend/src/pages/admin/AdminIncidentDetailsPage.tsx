import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { useParams } from "react-router";
import { isApiError } from "@/api/client";
import { useIncident } from "@/api/queries";
import { AdminEditForm } from "@/components/admin/AdminEditForm";
import { AdminIncidentFacts } from "@/components/admin/AdminIncidentFacts";
import { AdminStatusTimeline } from "@/components/admin/AdminStatusTimeline";
import { DangerZone } from "@/components/admin/DangerZone";
import { PriorityForm } from "@/components/admin/PriorityForm";
import { RiskEstimatePanel } from "@/components/admin/RiskEstimatePanel";
import { StatusChangeForm } from "@/components/admin/StatusChangeForm";
import { LazyMiniMap } from "@/components/map/LazyMap";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge, StatusBadge, VerificationBadge } from "@/components/ui/SemanticBadges";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiAssetUrl } from "@/config";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMeta } from "@/meta/useMeta";
import { formatDateTime } from "@/utils/format";

const BACK = { to: "/admin/incidents", label: "All incidents" };

function DetailsSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading incident">
      <Skeleton className="h-8 w-2/3 max-w-lg" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-card lg:col-span-2" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    </div>
  );
}

export default function AdminIncidentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const query = useIncident(id);
  const meta = useMeta();
  const incident = query.data;
  const [editing, setEditing] = useState(false);
  useDocumentTitle(incident ? incident.title : "Incident");

  if (query.isLoading) return <DetailsSkeleton />;

  if (query.error || !incident) {
    const notFound = isApiError(query.error) && (query.error.isNotFound || query.error.isValidation);
    return (
      <div className="space-y-6">
        <PageHeader backTo={BACK} title={notFound ? "Incident not found" : "Incident"} />
        <Card>
          <ErrorState
            error={query.error}
            title={notFound ? "This incident does not exist" : undefined}
            message={notFound ? "It may have been deleted, or the link is wrong." : undefined}
            onRetry={notFound ? undefined : () => void query.refetch()}
          />
          {notFound && (
            <div className="flex justify-center pb-4">
              <LinkButton to="/admin/incidents" variant="secondary">
                Back to incidents
              </LinkButton>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const imageUrl = apiAssetUrl(incident.image?.url);

  return (
    <div className="space-y-6">
      <PageHeader
        backTo={BACK}
        eyebrow="Incident"
        title={incident.title}
        titleAddon={
          <span className="flex flex-wrap gap-1.5">
            <StatusBadge status={incident.status} />
            <VerificationBadge verification={incident.verification} />
            {incident.source === "seed" && <SourceBadge source="seed" />}
          </span>
        }
        description={`Reported ${formatDateTime(incident.createdAt)}${incident.reportedBy ? ` by ${incident.reportedBy.name}` : ""}.`}
        actions={
          <Button
            variant={editing ? "ghost" : "secondary"}
            onClick={() => setEditing((v) => !v)}
            aria-expanded={editing}
            leftIcon={
              editing ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Pencil className="h-4 w-4" aria-hidden="true" />
              )
            }
          >
            {editing ? "Close editor" : "Edit incident"}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {editing && (
            <AdminEditForm
              key={incident.updatedAt}
              incident={incident}
              onSaved={() => setEditing(false)}
              onCancel={() => setEditing(false)}
            />
          )}
          <Card>
            <CardHeader title="Description" as="h2" />
            <p className="whitespace-pre-wrap text-sm leading-6 text-text">{incident.description}</p>
            {imageUrl && (
              <figure className="mt-4">
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block overflow-hidden rounded-lg border border-navy-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                >
                  <img
                    src={imageUrl}
                    alt={`Photo attached to ${incident.title}`}
                    className="max-h-96 w-full object-cover"
                  />
                </a>
                <figcaption className="mt-1 text-xs text-muted">
                  Opens the full-size image in a new tab.
                </figcaption>
              </figure>
            )}
          </Card>
          <Card padding="none" className="overflow-hidden">
            <LazyMiniMap
              latitude={incident.latitude}
              longitude={incident.longitude}
              color={meta.categoryColor(incident.category)}
              height={260}
              interactive
              className="rounded-none border-0"
            />
          </Card>
          <AdminIncidentFacts incident={incident} />
          <RiskEstimatePanel incident={incident} />
          <AdminStatusTimeline history={incident.statusHistory} />
        </div>
        <div className="space-y-4">
          <StatusChangeForm incident={incident} />
          <PriorityForm key={`${incident.id}-${incident.priority ?? "none"}`} incident={incident} />
          <DangerZone incident={incident} />
        </div>
      </div>
    </div>
  );
}
