/**
 * Distinguish the three ways the ML proxy can fail (docs/api.md sections 9 and 10):
 * - the service is unreachable or timed out (503 ML_UNAVAILABLE),
 * - the service answered but has no trained artifacts (502 ML_ERROR carrying the
 *   "Model artifacts not found. Run the training pipeline first." detail),
 * - anything else.
 */
import { isApiError } from "@/api/client";

export type MlErrorKind = "unavailable" | "not-trained" | "other";

const NOT_TRAINED_RE = /artifacts?|training pipeline|not trained|model_loaded/i;

function mentionsMissingArtifacts(error: { message: string; details: unknown[] }): boolean {
  if (NOT_TRAINED_RE.test(error.message)) return true;
  return error.details.some((detail) => {
    if (!detail || typeof detail !== "object") return false;
    return Object.values(detail as Record<string, unknown>).some(
      (value) => typeof value === "string" && NOT_TRAINED_RE.test(value),
    );
  });
}

export function classifyMlError(error: unknown): MlErrorKind {
  if (!isApiError(error)) return "other";
  if (error.code === "ML_UNAVAILABLE") return "unavailable";
  if (error.code === "ML_ERROR" && mentionsMissingArtifacts(error)) return "not-trained";
  return "other";
}

export function isMlDown(error: unknown): boolean {
  const kind = classifyMlError(error);
  return kind === "unavailable" || kind === "not-trained";
}
