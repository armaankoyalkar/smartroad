/**
 * DBSCAN parameters for GET /api/map/hotspots (docs/api.md section 8): `eps` in metres
 * (50 to 2000, default 200) and `minSamples` (3 to 20, default 4). Kept in the URL as
 * `eps` and `minSamples`; the panel edits a draft and commits it with "Recompute".
 */
import { hotspotParamsSchema } from "@/utils/validation";

export const HOTSPOT_LIMITS = {
  eps: { min: 50, max: 2000, step: 10 },
  minSamples: { min: 3, max: 20, step: 1 },
} as const;

export interface HotspotParamValues {
  eps: number;
  minSamples: number;
}

export const DEFAULT_HOTSPOT_PARAMS: HotspotParamValues = { eps: 200, minSamples: 4 };

export interface HotspotDraft {
  eps: string;
  minSamples: string;
}

export interface HotspotDraftErrors {
  eps?: string;
  minSamples?: string;
}

export function draftFromValues(values: HotspotParamValues): HotspotDraft {
  return { eps: String(values.eps), minSamples: String(values.minSamples) };
}

/** Validate the typed values against the documented bounds (whole numbers only). */
export function validateHotspotDraft(draft: HotspotDraft): {
  values: HotspotParamValues | null;
  errors: HotspotDraftErrors;
} {
  const result = hotspotParamsSchema.safeParse(draft);
  if (result.success) return { values: result.data, errors: {} };
  const errors: HotspotDraftErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if ((field === "eps" || field === "minSamples") && !errors[field]) errors[field] = issue.message;
  }
  return { values: null, errors };
}

/** Read `eps` and `minSamples` from the URL; out-of-range or missing values fall back to the defaults. */
export function parseHotspotParams(
  params: URLSearchParams,
  defaults: HotspotParamValues = DEFAULT_HOTSPOT_PARAMS,
): HotspotParamValues {
  const { values } = validateHotspotDraft({
    eps: params.get("eps") ?? String(defaults.eps),
    minSamples: params.get("minSamples") ?? String(defaults.minSamples),
  });
  if (values) return values;
  const eps = validateHotspotDraft({ eps: params.get("eps") ?? "", minSamples: String(defaults.minSamples) });
  const min = validateHotspotDraft({ eps: String(defaults.eps), minSamples: params.get("minSamples") ?? "" });
  return { eps: eps.values?.eps ?? defaults.eps, minSamples: min.values?.minSamples ?? defaults.minSamples };
}

/** Values for useQueryParams().setMany(); defaults are removed from the URL. */
export function serializeHotspotParams(
  values: HotspotParamValues,
  defaults: HotspotParamValues = DEFAULT_HOTSPOT_PARAMS,
): Record<string, string | undefined> {
  return {
    eps: values.eps === defaults.eps ? undefined : String(values.eps),
    minSamples: values.minSamples === defaults.minSamples ? undefined : String(values.minSamples),
  };
}
