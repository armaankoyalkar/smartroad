import { useId, useState, type FormEvent } from "react";
import { getErrorMessage } from "@/api/client";
import { useSetPriority } from "@/api/mutations";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, FormError } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PriorityBadge } from "@/components/ui/SemanticBadges";
import { useToast } from "@/components/ui/useToast";
import { isPriority, PRIORITIES, PRIORITY_UNASSIGNED_LABEL, type Priority } from "@/constants/enums";
import { useMeta } from "@/meta/useMeta";
import type { Incident } from "@/types/api";

export interface PriorityFormProps {
  incident: Incident;
  className?: string;
}

/** Set or clear the priority (PATCH /api/incidents/:id/priority) with an optional note. */
export function PriorityForm({ incident, className }: PriorityFormProps) {
  const meta = useMeta();
  const toast = useToast();
  const mutation = useSetPriority();
  const id = useId();
  const [priority, setPriority] = useState<Priority | "">(incident.priority ?? "");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const unchanged = (priority || null) === incident.priority;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (unchanged) return;
    setFormError(null);
    const value = priority || null;
    try {
      await mutation.mutateAsync({
        id: incident.id,
        input: note.trim() ? { priority: value, note: note.trim() } : { priority: value },
      });
      toast.success(value ? `Priority set to ${meta.label("priority", value)}` : "Priority cleared");
      setNote("");
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <Card className={className}>
      <CardHeader
        title="Priority"
        description={
          <span className="inline-flex items-center gap-2">
            Currently <PriorityBadge priority={incident.priority} size="sm" />
          </span>
        }
        as="h2"
      />
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-4" noValidate>
        <Field label="Priority" id={`${id}-priority`}>
          <Select
            value={priority}
            onChange={(event) => setPriority(isPriority(event.target.value) ? event.target.value : "")}
            disabled={mutation.isPending}
          >
            <option value="">{PRIORITY_UNASSIGNED_LABEL}</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {meta.label("priority", p)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note" id={`${id}-note`} showOptional hint="Visible to the reporter.">
          <Textarea
            value={note}
            rows={2}
            maxLength={1000}
            onChange={(event) => setNote(event.target.value)}
            disabled={mutation.isPending}
          />
        </Field>
        <FormError message={formError} />
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" loading={mutation.isPending} disabled={unchanged}>
            Save priority
          </Button>
        </div>
      </form>
    </Card>
  );
}
