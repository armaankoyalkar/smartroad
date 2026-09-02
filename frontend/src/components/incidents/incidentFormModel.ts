/**
 * Pure helpers for the incident form: field shape, defaults, prefill from an incident and the
 * multipart payload. Kept in a .ts module so it can be unit-tested without React.
 */
import type { CategoryKey, Severity } from "@/constants/enums";
import type { Incident, IncidentCreateInput, IncidentUpdateInput } from "@/types/api";
import type { IncidentFormValues } from "@/utils/validation";

export const TITLE_MAX = 120;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 2000;
export const ADDRESS_MAX = 300;

/** What react-hook-form holds; the zod schema turns it into IncidentFormValues on submit. */
export interface IncidentFormFields {
  title: string;
  category: CategoryKey | "";
  description: string;
  severity: Severity | "";
  latitude: number | null;
  longitude: number | null;
  address: string;
  image: File | null;
}

export const INCIDENT_FIELD_NAMES: readonly (keyof IncidentFormFields)[] = [
  "title",
  "category",
  "description",
  "severity",
  "latitude",
  "longitude",
  "address",
  "image",
];

export const EMPTY_INCIDENT_FORM: IncidentFormFields = {
  title: "",
  category: "",
  description: "",
  severity: "",
  latitude: null,
  longitude: null,
  address: "",
  image: null,
};

/** Prefill for edit mode. The stored image is not a File; ImageDropzone shows it from `incident.image`. */
export function incidentToFormFields(incident: Incident): IncidentFormFields {
  return {
    title: incident.title,
    category: incident.category,
    description: incident.description,
    severity: incident.severity,
    latitude: incident.latitude,
    longitude: incident.longitude,
    address: incident.address ?? "",
    image: null,
  };
}

/** Payload accepted by both POST /api/incidents and PATCH /api/incidents/:id. */
export type IncidentFormPayload = IncidentCreateInput & Pick<IncidentUpdateInput, "removeImage">;

export interface IncidentPayloadOptions {
  /** The incident being edited already has a stored image. */
  existingImage?: boolean;
  /** The user removed that stored image without choosing a new one. */
  existingImageRemoved?: boolean;
}

export function toIncidentPayload(
  values: IncidentFormValues,
  options: IncidentPayloadOptions = {},
): IncidentFormPayload {
  const payload: IncidentFormPayload = {
    title: values.title,
    category: values.category,
    description: values.description,
    severity: values.severity,
    latitude: values.latitude,
    longitude: values.longitude,
    address: values.address ?? "",
  };
  if (values.image instanceof File) {
    payload.image = values.image;
  } else if (options.existingImage && options.existingImageRemoved) {
    payload.removeImage = true;
  }
  return payload;
}
