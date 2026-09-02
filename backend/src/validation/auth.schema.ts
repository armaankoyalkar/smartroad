import { z } from "zod";

/**
 * Bodies for /api/auth (docs/api.md section 5). The shared fields (name,
 * email, password, phone) are exported so the user schemas reuse the exact
 * same rules; the User model repeats them as a last line of defence.
 */

export const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;

const LENGTH = (min: number, max: number) => `Must be between ${min} and ${max} characters`;

export const nameField = z.string({ error: "Name is required" }).trim().min(2, LENGTH(2, 80)).max(80, LENGTH(2, 80));

/** Trimmed and lower-cased before the format check so " A@B.com " is accepted and stored as "a@b.com". */
export const emailField = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .max(254, "Must be at most 254 characters")
  .pipe(z.email("Must be a valid email address"));

export const passwordField = z
  .string({ error: "Password is required" })
  .min(8, LENGTH(8, 72))
  .max(72, LENGTH(8, 72));

/** Optional in every form: an empty string clears the phone like an explicit null. */
export const phoneField = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string({ error: "Must be a string" })
    .trim()
    .regex(PHONE_PATTERN, "Must be 10 to 15 digits with an optional leading +")
    .nullable(),
);

/** `role` is deliberately absent: z.object() strips it, so nobody registers as an admin. */
export const registerBody = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
  phone: phoneField.optional(),
});

export const loginBody = z.object({
  email: z.string({ error: "Email is required" }).trim().toLowerCase().min(1, "Email is required"),
  password: z.string({ error: "Password is required" }).min(1, "Password is required"),
});

export const registerSchemas = { body: registerBody };
export const loginSchemas = { body: loginBody };

export type RegisterInput = z.output<typeof registerBody>;
export type LoginInput = z.output<typeof loginBody>;
