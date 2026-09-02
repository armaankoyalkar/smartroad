import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { getErrorMessage, isApiError } from "@/api/client";

/**
 * Map a server VALIDATION_ERROR (`details: [{ field, message }]`) back onto form fields.
 * Returns a message to show above the form when nothing could be mapped, otherwise null.
 * `fieldMap` renames server fields to form fields when they differ.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  options: { fields?: readonly string[]; fieldMap?: Record<string, string> } = {},
): string | null {
  if (!isApiError(error)) return getErrorMessage(error);
  const entries = Object.entries(error.fieldErrors());
  let applied = 0;
  for (const [serverField, message] of entries) {
    const target = options.fieldMap?.[serverField] ?? serverField;
    if (options.fields && !options.fields.includes(target)) continue;
    setError(target as Path<T>, { type: "server", message });
    applied += 1;
  }
  return applied > 0 ? null : error.message;
}
