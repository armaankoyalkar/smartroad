import { useNavigate } from "react-router";
import { useCreateIncident } from "@/api/mutations";
import { IncidentForm } from "@/components/incidents/IncidentForm";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/useToast";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/** Report an incident (POST /api/incidents). On success the reporter lands on the new report's details. */
export default function ReportIncidentPage() {
  useDocumentTitle("Report an incident");
  const navigate = useNavigate();
  const toast = useToast();
  const create = useCreateIncident();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Citizen area"
        title="Report an incident"
        description="Tell us what you saw and where. An administrator reviews every report before it is verified."
      />
      <Alert tone="neutral">
        New reports start as <strong className="font-medium text-text">Submitted</strong>. You can edit a
        report until an administrator starts reviewing it; after that its status and any notes appear in its
        history.
      </Alert>
      <IncidentForm
        mode="create"
        submitting={create.isPending}
        cancelTo="/app"
        onSubmit={async (payload) => {
          const incident = await create.mutateAsync(payload);
          toast.success("Report submitted", {
            description: "Thank you. You can follow its status from your reports.",
          });
          navigate(`/app/reports/${incident.id}`, { replace: true });
        }}
      />
    </div>
  );
}
