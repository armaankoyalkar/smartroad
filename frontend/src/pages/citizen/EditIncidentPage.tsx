import { Lock } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { useUpdateIncident } from "@/api/mutations";
import { useIncident } from "@/api/queries";
import { useAuth } from "@/auth/useAuth";
import { IncidentForm } from "@/components/incidents/IncidentForm";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/SemanticBadges";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/useToast";
import { IncidentLoadError } from "@/features/citizen/details/IncidentLoadError";
import { editBlockedReason } from "@/features/citizen/incidentAccess";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMeta } from "@/meta/useMeta";

/** Edit one of the caller's own reports while it is still SUBMITTED (PATCH /api/incidents/:id). */
export default function EditIncidentPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const meta = useMeta();
  const navigate = useNavigate();
  const toast = useToast();
  const query = useIncident(id);
  const update = useUpdateIncident();
  const incident = query.data;
  useDocumentTitle(incident ? `Edit: ${incident.title}` : "Edit report");

  if (query.isPending) {
    return (
      <div role="status" aria-label="Loading report" className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  }
  if (query.isError || !incident) {
    return <IncidentLoadError error={query.error} onRetry={() => void query.refetch()} />;
  }

  const detailsPath = `/app/reports/${incident.id}`;
  const blocked = editBlockedReason(incident, user, meta.label("status", incident.status));

  return (
    <div className="space-y-6">
      <PageHeader
        backTo={{ to: detailsPath, label: "Back to the report" }}
        eyebrow="Citizen area"
        title="Edit report"
        titleAddon={<StatusBadge status={incident.status} />}
        description={incident.title}
      />

      {blocked ? (
        <Card>
          <Alert tone="warning" icon={Lock} title="This report can no longer be edited" role="alert">
            {blocked}
          </Alert>
          <div className="mt-4">
            <LinkButton to={detailsPath} variant="secondary">
              View the report
            </LinkButton>
          </div>
        </Card>
      ) : (
        <IncidentForm
          mode="edit"
          initial={incident}
          submitting={update.isPending}
          cancelTo={detailsPath}
          onSubmit={async (payload) => {
            await update.mutateAsync({ id: incident.id, input: payload });
            toast.success("Report updated");
            navigate(detailsPath, { replace: true });
          }}
        />
      )}
    </div>
  );
}
