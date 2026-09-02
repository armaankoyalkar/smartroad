import { useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Send } from "lucide-react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { isApiError } from "@/api/client";
import { LazyLocationPicker } from "@/components/map/LazyMap";
import { Alert } from "@/components/ui/Alert";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, FormError } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiAssetUrl } from "@/config";
import { useMeta } from "@/meta/useMeta";
import type { Incident } from "@/types/api";
import { cn } from "@/utils/cn";
import { applyServerErrors } from "@/utils/formErrors";
import { buildIncidentFormSchema, type IncidentFormValues } from "@/utils/validation";
import { ImageDropzone } from "./ImageDropzone";
import {
  ADDRESS_MAX,
  DESCRIPTION_MAX,
  EMPTY_INCIDENT_FORM,
  INCIDENT_FIELD_NAMES,
  TITLE_MAX,
  incidentToFormFields,
  toIncidentPayload,
  type IncidentFormFields,
  type IncidentFormPayload,
} from "./incidentFormModel";
import { SeverityRadioCards } from "./SeverityRadioCards";

export interface IncidentFormProps {
  mode?: "create" | "edit";
  /** Prefill (edit mode). */
  initial?: Incident;
  /** Receives the multipart payload; throw an ApiError to have field errors mapped back. */
  onSubmit: (payload: IncidentFormPayload) => Promise<unknown> | unknown;
  /** External busy flag (the mutation is pending). */
  submitting?: boolean;
  cancelTo?: string;
  className?: string;
}

/**
 * Report / edit form: category, title, description, severity cards, location picker with
 * reverse-geocoded address, single photo. Client validation mirrors the server (utils/validation);
 * server `details[]` are mapped back onto the fields.
 */
export function IncidentForm({
  mode = "create",
  initial,
  onSubmit,
  submitting = false,
  cancelTo,
  className,
}: IncidentFormProps) {
  const meta = useMeta();
  const limits = meta.enums.upload;
  const schema = useMemo(() => buildIncidentFormSchema(limits), [limits]);
  const [formError, setFormError] = useState<string | null>(null);
  const [existingImageRemoved, setExistingImageRemoved] = useState(false);
  const lastSuggestion = useRef<string | null>(null);

  const { register, control, handleSubmit, setValue, getValues, setError, formState } = useForm<
    IncidentFormFields,
    unknown,
    IncidentFormValues
  >({
    // The schema's coordinate fields use z.preprocess (input type unknown); the form holds numbers or null.
    resolver: zodResolver(schema) as Resolver<IncidentFormFields, unknown, IncidentFormValues>,
    defaultValues: initial ? incidentToFormFields(initial) : EMPTY_INCIDENT_FORM,
    mode: "onTouched",
  });
  const { errors, isSubmitted, isSubmitting } = formState;
  const [category, description, latitude, longitude] = useWatch({
    control,
    name: ["category", "description", "latitude", "longitude"],
  });

  const setLocation = (position: { latitude: number; longitude: number } | null) => {
    const options = { shouldDirty: true, shouldValidate: isSubmitted };
    setValue("latitude", position?.latitude ?? null, options);
    setValue("longitude", position?.longitude ?? null, options);
  };

  /** Auto-fill the address unless the reporter typed their own. */
  const suggestAddress = (address: string | null) => {
    const current = getValues("address");
    if (address && (!current.trim() || current === lastSuggestion.current)) {
      setValue("address", address.slice(0, ADDRESS_MAX), { shouldDirty: true });
    }
    lastSuggestion.current = address;
  };

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(toIncidentPayload(values, { existingImage: !!initial?.image, existingImageRemoved }));
    } catch (error) {
      if (
        isApiError(error) &&
        (error.code === "UPLOAD_TOO_LARGE" || error.code === "UNSUPPORTED_FILE_TYPE")
      ) {
        setError("image", { type: "server", message: error.message });
        return;
      }
      const message = applyServerErrors(error, setError, { fields: INCIDENT_FIELD_NAMES });
      setFormError(message ?? "Please check the highlighted fields and try again.");
    }
  });

  const busy = submitting || isSubmitting;
  const categoryInfo = category ? meta.getCategory(category) : null;
  const hasLocation = latitude !== null && longitude !== null;
  const locationError = errors.latitude?.message ?? errors.longitude?.message;
  const descriptionOver = description.length > DESCRIPTION_MAX;

  return (
    <form onSubmit={submit} noValidate className={cn("space-y-6", className)} aria-busy={busy || undefined}>
      <Card>
        <CardHeader
          title="What happened"
          description="Describe the problem so an administrator can verify it."
        />
        <div className="space-y-5">
          <Field
            label="Category"
            required
            error={errors.category?.message}
            hint={categoryInfo?.description || "Pick the closest match; choose Other if nothing fits."}
          >
            <Select
              placeholder="Select a category"
              options={meta.categories.map((c) => ({ value: c.key, label: c.label }))}
              disabled={busy}
              {...register("category")}
            />
          </Field>
          <Field
            label="Title"
            required
            error={errors.title?.message}
            hint="5 to 120 characters, for example: Deep pothole after the flyover exit."
          >
            <Input maxLength={TITLE_MAX} autoComplete="off" disabled={busy} {...register("title")} />
          </Field>
          <Field
            label="Description"
            required
            error={errors.description?.message}
            hint="What you saw, how big it is, and whether traffic is affected (10 to 2000 characters)."
            labelAddon={
              <span
                aria-live="polite"
                className={cn("tabular text-xs", descriptionOver ? "text-red-300" : "text-muted")}
              >
                {description.length}/{DESCRIPTION_MAX}
              </span>
            }
          >
            <Textarea rows={5} maxLength={DESCRIPTION_MAX} disabled={busy} {...register("description")} />
          </Field>
          <Controller
            control={control}
            name="severity"
            render={({ field, fieldState }) => (
              <SeverityRadioCards
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                error={fieldState.error?.message}
                disabled={busy}
              />
            )}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Where is it"
          description="Place the marker on the map, use your current position or type the coordinates."
        />
        <div className="space-y-4">
          {!hasLocation && !locationError && (
            <Alert tone="warning" title="Location required">
              Click the map, use your current location or type the coordinates below.
            </Alert>
          )}
          <LazyLocationPicker
            latitude={latitude}
            longitude={longitude}
            onChange={(position) => setLocation(position)}
            onAddressSuggestion={suggestAddress}
            disabled={busy}
            error={locationError}
            idPrefix="incident-location"
          />
          <Field
            label="Address"
            showOptional
            error={errors.address?.message}
            hint="Filled in from the map when an address is found; edit it if it is wrong."
          >
            <Input
              maxLength={ADDRESS_MAX}
              autoComplete="street-address"
              disabled={busy}
              {...register("address")}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Photo" description="A photo of the spot helps administrators verify the report." />
        <Controller
          control={control}
          name="image"
          render={({ field, fieldState }) => (
            <ImageDropzone
              id="incident-image"
              value={field.value}
              onChange={field.onChange}
              existingUrl={apiAssetUrl(initial?.image?.url)}
              existingRemoved={existingImageRemoved}
              onExistingRemovedChange={setExistingImageRemoved}
              limits={limits}
              error={fieldState.error?.message}
              disabled={busy}
            />
          )}
        />
      </Card>

      <FormError message={formError} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {cancelTo && (
          <LinkButton to={cancelTo} variant="ghost">
            Cancel
          </LinkButton>
        )}
        <Button
          type="submit"
          loading={busy}
          loadingText={mode === "edit" ? "Saving…" : "Submitting…"}
          leftIcon={
            mode === "edit" ? (
              <Save className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )
          }
        >
          {mode === "edit" ? "Save changes" : "Submit report"}
        </Button>
      </div>
    </form>
  );
}
