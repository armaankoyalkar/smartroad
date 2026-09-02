import { z } from "zod";
import { CATEGORY_KEYS } from "../config/categories.js";
import { PRIORITIES, RISK_LEVELS, SEVERITIES, SOURCES, STATUSES } from "../config/enums.js";
import { NO_RISK_ESTIMATE, UNASSIGNED } from "../lib/incidentFilters.js";
import {
  csvEnum,
  dateRangeFields,
  objectIdParam,
  optionalBooleanish,
  paginationQuery,
  refineDateRange,
  sortQuery,
} from "./common.schema.js";

/**
 * Bodies and queries for /api/incidents (docs/api.md section 6). Create and
 * edit bodies may arrive as multipart/form-data, where every value is a
 * string, so numbers are accepted as numeric strings and booleans as
 * "true"/"false"; JSON bodies pass through the same schemas unchanged.
 */

const LENGTH = (min: number, max: number) => `Must be between ${min} and ${max} characters`;
const oneOf = (values: readonly string[]) => `Must be one of ${values.join(", ")}`;

/** A number, or a string holding one (multipart). Anything else fails as "not a number". */
function numeric(min: number, max: number) {
  const message = `Must be between ${min} and ${max}`;
  return z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed !== "" && Number.isFinite(Number(trimmed))) return Number(trimmed);
      }
      return value;
    },
    z.number({ error: "Must be a number" }).min(min, message).max(max, message),
  );
}

/** "" clears a nullable text field (multipart cannot send null). */
const emptyToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);

const titleField = z.string({ error: "Title is required" }).trim().min(5, LENGTH(5, 120)).max(120, LENGTH(5, 120));
const descriptionField = z
  .string({ error: "Description is required" })
  .trim()
  .min(10, LENGTH(10, 2000))
  .max(2000, LENGTH(10, 2000));
const categoryField = z.enum(CATEGORY_KEYS, { error: oneOf(CATEGORY_KEYS) });
const severityField = z.enum(SEVERITIES, { error: oneOf(SEVERITIES) });
const latitudeField = numeric(-90, 90);
const longitudeField = numeric(-180, 180);
const addressField = z.string({ error: "Must be a string" }).trim().max(300, "Must be at most 300 characters");
const noteField = z.string({ error: "Must be a string" }).trim().max(1000, "Must be at most 1000 characters");
const optionalNote = z.preprocess(emptyToNull, noteField.nullable()).optional();

/** status and priority have dedicated endpoints; their presence is a validation error that says so. */
const dedicatedEndpoint = (field: string) =>
  z.never({ error: `Use PATCH /api/incidents/:id/${field} to change the ${field}.` }).optional();

export const createIncidentBody = z.object({
  title: titleField,
  description: descriptionField,
  category: categoryField,
  severity: severityField,
  latitude: latitudeField,
  longitude: longitudeField,
  address: addressField.optional(),
});

export const updateIncidentBody = z.object({
  title: titleField.optional(),
  description: descriptionField.optional(),
  category: categoryField.optional(),
  severity: severityField.optional(),
  latitude: latitudeField.optional(),
  longitude: longitudeField.optional(),
  address: addressField.optional(),
  adminNote: optionalNote,
  removeImage: optionalBooleanish,
  status: dedicatedEndpoint("status"),
  priority: dedicatedEndpoint("priority"),
});

export const INCIDENT_SORT_FIELDS = ["createdAt", "updatedAt", "priority", "status", "severity"] as const;

/** Filters shared by the admin list and "mine" (docs/api.md sections 6.3 and 6.4). */
const commonFilters = {
  status: csvEnum(STATUSES),
  category: csvEnum(CATEGORY_KEYS),
  severity: csvEnum(SEVERITIES),
  priority: csvEnum([...PRIORITIES, UNASSIGNED] as const),
  ...dateRangeFields,
  sort: sortQuery(INCIDENT_SORT_FIELDS, "-createdAt"),
};

export const listIncidentsQuery = paginationQuery
  .extend({
    ...commonFilters,
    source: csvEnum(SOURCES),
    riskLevel: csvEnum([...RISK_LEVELS, NO_RISK_ESTIMATE] as const),
    q: z.string({ error: "Must be a string" }).trim().max(200, "Must be at most 200 characters").optional(),
  })
  .superRefine(refineDateRange);

export const mineIncidentsQuery = paginationQuery.extend(commonFilters).superRefine(refineDateRange);

export const changeStatusBody = z.object({
  status: z.enum(STATUSES, { error: oneOf(STATUSES) }),
  note: optionalNote,
});

export const changePriorityBody = z.object({
  priority: z.enum(PRIORITIES, { error: `${oneOf(PRIORITIES)} or null` }).nullable(),
  note: optionalNote,
});

export const createIncidentSchemas = { body: createIncidentBody };
export const listIncidentsSchemas = { query: listIncidentsQuery };
export const mineIncidentsSchemas = { query: mineIncidentsQuery };
export const incidentIdSchemas = { params: objectIdParam };
export const updateIncidentSchemas = { params: objectIdParam, body: updateIncidentBody };
export const changeStatusSchemas = { params: objectIdParam, body: changeStatusBody };
export const changePrioritySchemas = { params: objectIdParam, body: changePriorityBody };

export type CreateIncidentInput = z.output<typeof createIncidentBody>;
export type UpdateIncidentInput = z.output<typeof updateIncidentBody>;
export type ListIncidentsQuery = z.output<typeof listIncidentsQuery>;
export type MineIncidentsQuery = z.output<typeof mineIncidentsQuery>;
export type ChangeStatusInput = z.output<typeof changeStatusBody>;
export type ChangePriorityInput = z.output<typeof changePriorityBody>;
