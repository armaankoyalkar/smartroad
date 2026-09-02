import { z } from "zod";
import { ROLE_VALUES } from "../config/enums.js";
import { nameField, passwordField, phoneField } from "./auth.schema.js";
import { objectIdParam, optionalBooleanish, paginationQuery, sortQuery } from "./common.schema.js";

/**
 * Bodies and queries for /api/users (docs/api.md section 5): own profile
 * and password, and the admin user management endpoints.
 */

/** A PATCH whose every known field is absent (or only had unknown fields) is reported, not silently ignored. */
function atLeastOneField(value: Record<string, unknown>, ctx: z.RefinementCtx): void {
  if (Object.values(value).every((v) => v === undefined)) {
    ctx.addIssue({ code: "custom", message: "Provide at least one field to update." });
  }
}

export const updateProfileBody = z
  .object({
    name: nameField.optional(),
    phone: phoneField.optional(),
  })
  .superRefine(atLeastOneField);

export const changePasswordBody = z.object({
  currentPassword: z.string({ error: "Current password is required" }).min(1, "Current password is required"),
  newPassword: passwordField,
});

export const USER_SORT_FIELDS = ["createdAt", "name", "email"] as const;

const roleField = z.enum(ROLE_VALUES, { error: `Must be one of ${ROLE_VALUES.join(", ")}` });

export const listUsersQuery = paginationQuery.extend({
  q: z.string().trim().max(200, "Must be at most 200 characters").optional(),
  role: roleField.optional(),
  isActive: optionalBooleanish,
  sort: sortQuery(USER_SORT_FIELDS, "-createdAt"),
});

export const adminUpdateUserBody = z
  .object({
    isActive: z.boolean({ error: "Must be true or false" }).optional(),
    role: roleField.optional(),
  })
  .superRefine(atLeastOneField);

export const updateProfileSchemas = { body: updateProfileBody };
export const changePasswordSchemas = { body: changePasswordBody };
export const listUsersSchemas = { query: listUsersQuery };
export const userIdSchemas = { params: objectIdParam };
export const adminUpdateUserSchemas = { params: objectIdParam, body: adminUpdateUserBody };

export type UpdateProfileInput = z.output<typeof updateProfileBody>;
export type ChangePasswordInput = z.output<typeof changePasswordBody>;
export type ListUsersQuery = z.output<typeof listUsersQuery>;
export type AdminUpdateUserInput = z.output<typeof adminUpdateUserBody>;
