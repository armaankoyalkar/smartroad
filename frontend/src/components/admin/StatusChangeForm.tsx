import { useId, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getErrorMessage, isApiError } from "@/api/client";
import { useChangeStatus } from "@/api/mutations";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, FormError } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/SemanticBadges";
import { useToast } from "@/components/ui/useToast";
import { isIncidentStatus, type IncidentStatus } from "@/constants/enums";
import { useMeta } from "@/meta/useMeta";
import type { Incident } from "@/types/api";
import { statusChangeSchema } from "@/utils/validation";

export interface StatusChangeFormProps {
  incident: Incident;
  className?: string;
}

const CONFIRMED: readonly IncidentStatus[] = ["REJECTED", "RESOLVED"];

/**
 * Move an incident along the documented lifecycle. Only the transitions allowed from the current
 * status are offered; rejecting needs a note; rejecting and resolving ask for confirmation.
 * A 409 INVALID_TRANSITION shows the server message and reloads the incident.
 */
export function StatusChangeForm({ incident, className }: StatusChangeFormProps) {
  const meta = useMeta();
  const toast = useToast();
  const queryClient = useQueryClient();
  const mutation = useChangeStatus();
  const id = useId();
  const transitions = meta.enums.transitions[incident.status] ?? [];

  const [status, setStatus] = useState<IncidentStatus | "">("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ status?: string; note?: string; form?: string | null }>({});
  const [confirming, setConfirming] = useState(false);

  const validate = () => {
    const parsed = statusChangeSchema.safeParse({ status, note: note || undefined });
    if (parsed.success) {
      setErrors({});
      return parsed.data;
    }
    const next: typeof errors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "status" && !next.status) next.status = "Choose a status";
      if (field === "note" && !next.note) next.note = issue.message;
    }
    setErrors(next);
    return null;
  };

  const apply = async () => {
    const values = validate();
    if (!values) return;
    try {
      await mutation.mutateAsync({
        id: incident.id,
        input: values.note ? { status: values.status, note: values.note } : { status: values.status },
      });
      toast.success(`Status changed to ${meta.label("status", values.status)}`);
      setStatus("");
      setNote("");
      setErrors({});
      setConfirming(false);
    } catch (error) {
      setConfirming(false);
      if (isApiError(error) && error.code === "NOTE_REQUIRED") {
        setErrors({ note: error.message });
        return;
      }
      if (isApiError(error) && error.code === "INVALID_TRANSITION") {
        const allowed = error.details[0]?.allowed;
        setErrors({
          form: `${error.message}${allowed?.length ? ` Allowed now: ${allowed.map((s) => meta.label("status", s)).join(", ")}.` : ""}`,
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.incidents.detail(incident.id) });
        return;
      }
      setErrors({ form: getErrorMessage(error) });
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const values = validate();
    if (!values) return;
    if (CONFIRMED.includes(values.status)) setConfirming(true);
    else void apply();
  };

  return (
    <Card className={className}>
      <CardHeader
        title="Change status"
        description={
          <span className="inline-flex items-center gap-2">
            Currently <StatusBadge status={incident.status} size="sm" />
          </span>
        }
        as="h2"
      />
      {transitions.length === 0 ? (
        <p className="text-sm text-muted">No status change is possible from the current status.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="New status" id={`${id}-status`} required error={errors.status}>
            <Select
              value={status}
              placeholder="Choose a status"
              options={transitions.map((s) => ({ value: s, label: meta.label("status", s) }))}
              onChange={(event) => {
                const value = event.target.value;
                setStatus(isIncidentStatus(value) ? value : "");
                setErrors({});
              }}
              disabled={mutation.isPending}
            />
          </Field>
          <Field
            label="Note"
            id={`${id}-note`}
            required={status === "REJECTED"}
            showOptional={status !== "REJECTED"}
            error={errors.note}
            hint={
              status === "REJECTED"
                ? "Explain why the report is rejected. The reporter can read this note."
                : "Visible to the reporter."
            }
          >
            <Textarea
              value={note}
              rows={3}
              maxLength={1000}
              onChange={(event) => {
                setNote(event.target.value);
                if (errors.note) setErrors((e) => ({ ...e, note: undefined }));
              }}
              disabled={mutation.isPending}
            />
          </Field>
          <FormError message={errors.form} />
          <div className="flex justify-end">
            <Button type="submit" loading={mutation.isPending} disabled={!status}>
              Apply status
            </Button>
          </div>
        </form>
      )}
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={apply}
        title={
          status === "REJECTED"
            ? "Reject this incident?"
            : `Mark as ${meta.label("status", status).toLowerCase()}?`
        }
        description={
          status === "REJECTED"
            ? "The reporter will see the incident as rejected together with your note."
            : "This records the resolution date. The incident can be reopened later."
        }
        confirmLabel={status === "REJECTED" ? "Reject" : "Confirm"}
        tone={status === "REJECTED" ? "danger" : "primary"}
        loading={mutation.isPending}
      >
        {note && (
          <p>
            Note: <span className="text-text">{note}</span>
          </p>
        )}
      </ConfirmDialog>
    </Card>
  );
}
