/**
 * zod schemas shared by the forms. Rules mirror the server (docs/api.md sections 5, 6 and 9)
 * so the client and the API agree on every message.
 */
import { z } from "zod";
import {
  AREA_TYPES,
  CATEGORY_KEYS,
  DAYS_OF_WEEK,
  LIGHT_CONDITIONS,
  PRIORITIES,
  ROAD_SURFACES,
  ROAD_TYPES,
  SEVERITIES,
  STATUSES,
  WEATHER_CONDITIONS,
} from "@/constants/enums";
import { config } from "@/config";

const PHONE_RE = /^\+?\d{10,15}$/;

/** Accept "", null or undefined as empty; anything else must be a number in range. */
function numberField(
  label: string,
  min: number,
  max: number,
  options: { int?: boolean; emptyMessage?: string } = {},
) {
  const empty = options.emptyMessage ?? `Enter ${label.toLowerCase()}`;
  let schema = z.number({
    error: (issue) => (issue.input === undefined ? empty : `${label} must be a number`),
  });
  if (options.int) schema = schema.int({ error: `${label} must be a whole number` });
  schema = schema
    .min(min, { error: `${label} must be between ${min} and ${max}` })
    .max(max, { error: `${label} must be between ${min} and ${max}` });
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    if (typeof value === "string") return value.trim() === "" ? undefined : Number(value);
    return value;
  }, schema);
}

export const emailSchema = z.email({ error: "Enter a valid email address" });
export const passwordSchema = z
  .string({ error: "Enter a password" })
  .min(8, { error: "Password must be at least 8 characters" })
  .max(72, { error: "Password must be at most 72 characters" });
export const nameSchema = z
  .string({ error: "Enter your name" })
  .trim()
  .min(2, { error: "Name must be 2 to 80 characters" })
  .max(80, { error: "Name must be 2 to 80 characters" });
/** Optional phone: empty string allowed, otherwise 10 to 15 digits with an optional leading +. */
export const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || PHONE_RE.test(v), {
    error: "Phone must be 10 to 15 digits, optionally starting with +",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: "Enter your password" }).min(1, { error: "Enter your password" }),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string({ error: "Confirm your password" }),
    phone: optionalPhoneSchema.optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const profileSchema = z.object({
  name: nameSchema,
  phone: optionalPhoneSchema,
});
export type ProfileFormValues = z.infer<typeof profileSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string({ error: "Enter your current password" })
      .min(1, { error: "Enter your current password" }),
    newPassword: passwordSchema,
    confirmPassword: z.string({ error: "Confirm your new password" }),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    error: "The new password must differ from the current one",
    path: ["newPassword"],
  });
export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

export const latitudeSchema = numberField("Latitude", -90, 90, {
  emptyMessage: "Pick a location on the map or enter coordinates",
});
export const longitudeSchema = numberField("Longitude", -180, 180, {
  emptyMessage: "Pick a location on the map or enter coordinates",
});

/** Client-side image check; the server repeats it by magic bytes. */
export function imageFileSchema(
  limits: { maxBytes: number; mimeTypes: readonly string[] } = config.defaultUpload,
) {
  return z
    .instanceof(File, { error: "Choose an image file" })
    .refine((f) => limits.mimeTypes.includes(f.type), { error: "Image must be JPEG, PNG or WebP" })
    .refine((f) => f.size <= limits.maxBytes, {
      error: `Image must be at most ${Math.round(limits.maxBytes / (1024 * 1024))} MB`,
    });
}

export function buildIncidentFormSchema(
  limits: { maxBytes: number; mimeTypes: readonly string[] } = config.defaultUpload,
) {
  return z.object({
    title: z
      .string({ error: "Enter a title" })
      .trim()
      .min(5, { error: "Title must be 5 to 120 characters" })
      .max(120, { error: "Title must be 5 to 120 characters" }),
    category: z.enum(CATEGORY_KEYS, { error: "Choose a category" }),
    description: z
      .string({ error: "Enter a description" })
      .trim()
      .min(10, { error: "Description must be 10 to 2000 characters" })
      .max(2000, { error: "Description must be 10 to 2000 characters" }),
    severity: z.enum(SEVERITIES, { error: "Choose a severity" }),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    address: z.string().trim().max(300, { error: "Address must be at most 300 characters" }).optional(),
    image: imageFileSchema(limits).nullable().optional(),
  });
}

/** Default incident schema with the documented 5 MB / JPEG-PNG-WebP limits. */
export const incidentFormSchema = buildIncidentFormSchema();
export type IncidentFormInput = z.input<typeof incidentFormSchema>;
export type IncidentFormValues = z.output<typeof incidentFormSchema>;

export const statusChangeSchema = z
  .object({
    status: z.enum(STATUSES, { error: "Choose a status" }),
    note: z.string().trim().max(1000, { error: "Note must be at most 1000 characters" }).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.status === "REJECTED" && !d.note) {
      ctx.addIssue({ code: "custom", path: ["note"], message: "A reason is required when rejecting" });
    }
  });
export type StatusChangeFormValues = z.infer<typeof statusChangeSchema>;

export const priorityChangeSchema = z.object({
  priority: z.enum(PRIORITIES).nullable(),
  note: z.string().trim().max(1000, { error: "Note must be at most 1000 characters" }).optional(),
});
export type PriorityChangeFormValues = z.infer<typeof priorityChangeSchema>;

export const adminNoteSchema = z.object({
  adminNote: z.string().trim().max(1000, { error: "Note must be at most 1000 characters" }),
});

/** The ten features of POST /api/ml/estimate-risk. */
export const riskFeaturesSchema = z.object({
  hour: numberField("Hour", 0, 23, { int: true }),
  day_of_week: z.enum(DAYS_OF_WEEK, { error: "Choose a day of week" }),
  month: numberField("Month", 1, 12, { int: true }),
  light_conditions: z.enum(LIGHT_CONDITIONS, { error: "Choose the light conditions" }),
  weather: z.enum(WEATHER_CONDITIONS, { error: "Choose the weather" }),
  road_surface: z.enum(ROAD_SURFACES, { error: "Choose the road surface" }),
  road_type: z.enum(ROAD_TYPES, { error: "Choose the road type" }),
  speed_limit: numberField("Speed limit", 20, 120, { int: true }),
  area_type: z.enum(AREA_TYPES, { error: "Choose the area type" }),
  category: z.enum(CATEGORY_KEYS, { error: "Choose a category" }),
});
export type RiskFeaturesFormInput = z.input<typeof riskFeaturesSchema>;
export type RiskFeaturesFormValues = z.output<typeof riskFeaturesSchema>;

/** Hotspot parameters accepted by GET /api/map/hotspots. */
export const hotspotParamsSchema = z.object({
  eps: numberField("Radius (eps)", 50, 2000, { int: true }),
  minSamples: numberField("Minimum points", 3, 20, { int: true }),
});
export type HotspotParamsFormInput = z.input<typeof hotspotParamsSchema>;
export type HotspotParamsFormValues = z.output<typeof hotspotParamsSchema>;
