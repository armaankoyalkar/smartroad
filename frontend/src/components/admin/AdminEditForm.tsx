import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { getErrorMessage, isApiError } from "@/api/client";
import { useUpdateIncident } from "@/api/mutations";
import { LazyLocationPicker } from "@/components/map/LazyMap";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, FormError } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/useToast";
import { SEVERITIES } from "@/constants/enums";
import { useMeta } from "@/meta/useMeta";
import type { Incident, IncidentUpdateInput } from "@/types/api";
import { applyServerErrors } from "@/utils/formErrors";
import { buildIncidentFormSchema } from "@/utils/validation";
import { AdminEditImageField } from "./AdminEditImageField";

export interface AdminEditFormProps {
  incident: Incident;
  onSaved?: (incident: Incident) => void;
  onCancel?: () => void;
  className?: string;
}

function buildSchema(limits: { maxBytes: number; mimeTypes: readonly string[] }) {
  return buildIncidentFormSchema(limits)
    .omit({ image: true })
    .extend({
      adminNote: z.string().trim().max(1000, { error: "Note must be at most 1000 characters" }),
    });
}
type FormInput = z.input<ReturnType<typeof buildSchema>>;
type FormValues = z.output<ReturnType<typeof buildSchema>>;

const FORM_FIELDS = [
  "title",
  "category",
  "description",
  "severity",
  "latitude",
  "longitude",
  "address",
  "adminNote",
] as const;

/** Admin edit of every reporter field plus the admin note; image replace or remove (PATCH /api/incidents/:id). */
export function AdminEditForm({ incident, onSaved, onCancel, className }: AdminEditFormProps) {
  const meta = useMeta();
  const toast = useToast();
  const mutation = useUpdateIncident();
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const schema = buildSchema(meta.enums.upload);
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: incident.title,
      category: incident.category,
      description: incident.description,
      severity: incident.severity,
      latitude: incident.latitude,
      longitude: incident.longitude,
      address: incident.address ?? "",
      adminNote: incident.adminNote ?? "",
    },
  });
  const { register, control, handleSubmit, setError, setValue, formState } = form;
  const latitude = useWatch({ control, name: "latitude" });
  const longitude = useWatch({ control, name: "longitude" });
  const coordinateError = formState.errors.latitude?.message ?? formState.errors.longitude?.message;

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    const input: IncidentUpdateInput = {
      title: values.title,
      category: values.category,
      description: values.description,
      severity: values.severity,
      latitude: values.latitude,
      longitude: values.longitude,
      address: values.address ?? "",
      adminNote: values.adminNote ? values.adminNote : null,
    };
    if (file) input.image = file;
    else if (removeImage) input.removeImage = true;
    try {
      const saved = await mutation.mutateAsync({ id: incident.id, input });
      toast.success("Incident updated");
      setFile(null);
      setRemoveImage(false);
      onSaved?.(saved);
    } catch (error) {
      // The image is not a react-hook-form field: route its server message to the image control.
      const serverImageError = isApiError(error) ? (error.fieldErrors().image ?? null) : null;
      setImageError(serverImageError);
      const message = applyServerErrors(error, setError, { fields: FORM_FIELDS });
      setFormError(serverImageError && message === getErrorMessage(error) ? null : message);
    }
  });

  return (
    <Card className={className}>
      <CardHeader
        title="Edit incident"
        description="Administrators may change any field at any status."
        as="h2"
      />
      <form onSubmit={(event) => void submit(event)} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Title"
            id={`${id}-title`}
            required
            error={formState.errors.title?.message}
            className="sm:col-span-2"
          >
            <Input {...register("title")} maxLength={120} disabled={mutation.isPending} />
          </Field>
          <Field label="Category" id={`${id}-category`} required error={formState.errors.category?.message}>
            <Select
              {...register("category")}
              options={meta.categories.map((c) => ({ value: c.key, label: c.label }))}
              disabled={mutation.isPending}
            />
          </Field>
          <Field label="Severity" id={`${id}-severity`} required error={formState.errors.severity?.message}>
            <Select
              {...register("severity")}
              options={SEVERITIES.map((s) => ({ value: s, label: meta.label("severity", s) }))}
              disabled={mutation.isPending}
            />
          </Field>
          <Field
            label="Description"
            id={`${id}-description`}
            required
            error={formState.errors.description?.message}
            className="sm:col-span-2"
          >
            <Textarea {...register("description")} rows={5} maxLength={2000} disabled={mutation.isPending} />
          </Field>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-text">Location</legend>
          <LazyLocationPicker
            latitude={typeof latitude === "number" ? latitude : null}
            longitude={typeof longitude === "number" ? longitude : null}
            onChange={(position) => {
              setValue("latitude", position?.latitude ?? "", { shouldDirty: true, shouldValidate: true });
              setValue("longitude", position?.longitude ?? "", { shouldDirty: true, shouldValidate: true });
            }}
            onAddressSuggestion={(address) => {
              if (address && !form.getValues("address")) setValue("address", address, { shouldDirty: true });
            }}
            height={280}
            disabled={mutation.isPending}
            error={coordinateError}
            idPrefix={`${id}-location`}
          />
          <Field label="Address" id={`${id}-address`} showOptional error={formState.errors.address?.message}>
            <Input {...register("address")} maxLength={300} disabled={mutation.isPending} />
          </Field>
        </fieldset>

        <AdminEditImageField
          current={incident.image}
          file={file}
          onFileChange={(next) => {
            setFile(next);
            setImageError(null);
          }}
          error={imageError ?? undefined}
          removeCurrent={removeImage}
          onRemoveCurrentChange={setRemoveImage}
          limits={meta.enums.upload}
          disabled={mutation.isPending}
          idPrefix={id}
        />

        <Controller
          control={control}
          name="adminNote"
          render={({ field, fieldState }) => (
            <Field
              label="Admin note"
              id={`${id}-admin-note`}
              showOptional
              hint="Visible to the reporter. Leave empty to clear it."
              error={fieldState.error?.message}
            >
              <Textarea
                {...field}
                value={field.value ?? ""}
                rows={3}
                maxLength={1000}
                disabled={mutation.isPending}
              />
            </Field>
          )}
        />

        <FormError message={formError} />
        <div className="flex flex-wrap justify-end gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} disabled={mutation.isPending}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={mutation.isPending} loadingText="Saving">
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}
