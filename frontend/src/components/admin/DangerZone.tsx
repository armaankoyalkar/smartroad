import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { getErrorMessage } from "@/api/client";
import { useDeleteIncident } from "@/api/mutations";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/useToast";
import type { Incident } from "@/types/api";

export interface DangerZoneProps {
  incident: Incident;
  className?: string;
}

/** Permanent deletion (DELETE /api/incidents/:id) behind a confirmation dialog. */
export function DangerZone({ incident, className }: DangerZoneProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = useDeleteIncident();
  const toast = useToast();
  const navigate = useNavigate();

  const confirm = async () => {
    setError(null);
    try {
      await mutation.mutateAsync(incident.id);
      toast.success("Incident deleted", { description: incident.title });
      void navigate("/admin/incidents", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Card className={className}>
      <CardHeader
        title="Danger zone"
        description="Deleting removes the report, its history and its image permanently."
        as="h2"
      />
      <Button
        variant="danger"
        onClick={() => setOpen(true)}
        leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
      >
        Delete incident
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        onConfirm={confirm}
        title="Delete this incident?"
        description="This cannot be undone. The reporter will no longer see it in their reports."
        confirmLabel="Delete permanently"
        tone="danger"
        loading={mutation.isPending}
        error={error}
      >
        <p className="text-text">{incident.title}</p>
      </ConfirmDialog>
    </Card>
  );
}
