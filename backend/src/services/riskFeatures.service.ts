import { type CategoryKey } from "../config/categories.js";
import { env } from "../config/env.js";
import { RISK_FEATURE_NAMES, type RiskFeatureName, type RiskFeatures } from "../config/mlFeatures.js";
import { zoneParts } from "../lib/time.js";

/**
 * Feature derivation for one stored incident (docs/api.md section 9,
 * GET /api/ml/incidents/:id/risk and POST /api/ml/risk/refresh).
 *
 * SmartRoad only records where, when and what category an incident is, so
 * most of the model's inputs are either derived from the timestamp or
 * assumed. The names of assumed inputs are returned so the UI can say which
 * values were measured and which were defaults.
 */

/** Values used when SmartRoad has no measurement (docs/api.md section 9). */
export const ASSUMED_DEFAULTS = Object.freeze({
  weather: "CLEAR",
  road_type: "LOCAL",
  speed_limit: 40,
  area_type: "URBAN",
} as const satisfies Partial<RiskFeatures>);

/** Daylight is assumed between these local hours (6:00 inclusive to 18:00 exclusive). */
export const DAYLIGHT_HOURS = Object.freeze({ from: 6, to: 18 });

export type FeatureOverrides = Partial<RiskFeatures>;

export interface IncidentFeatureSource {
  createdAt: Date;
  category: CategoryKey;
}

export interface DerivedFeatures {
  features: RiskFeatures;
  /** Names whose values were defaulted rather than measured, in schema order. */
  assumedFeatures: RiskFeatureName[];
}

/**
 * Derive the ten features:
 * - hour, day_of_week, month: createdAt in `timeZone`;
 * - light_conditions: DAYLIGHT during daylight hours, otherwise DARK_LIT (assumed);
 * - category: the incident's category;
 * - road_surface: FLOODED for WATERLOGGING, otherwise DRY (assumed);
 * - weather, road_type, speed_limit, area_type: assumed defaults.
 * Overrides replace any feature and remove it from the assumed list.
 */
export function deriveIncidentFeatures(
  incident: IncidentFeatureSource,
  timeZone: string = env.ANALYTICS_TIMEZONE,
  overrides: FeatureOverrides = {},
): DerivedFeatures {
  const parts = zoneParts(incident.createdAt, timeZone);
  const daylight = parts.hour >= DAYLIGHT_HOURS.from && parts.hour < DAYLIGHT_HOURS.to;
  const waterlogging = incident.category === "WATERLOGGING";

  const features: RiskFeatures = {
    hour: parts.hour,
    day_of_week: parts.dayOfWeek,
    month: parts.month,
    light_conditions: daylight ? "DAYLIGHT" : "DARK_LIT",
    weather: ASSUMED_DEFAULTS.weather,
    road_surface: waterlogging ? "FLOODED" : "DRY",
    road_type: ASSUMED_DEFAULTS.road_type,
    speed_limit: ASSUMED_DEFAULTS.speed_limit,
    area_type: ASSUMED_DEFAULTS.area_type,
    category: incident.category,
  };

  const assumed = new Set<RiskFeatureName>(["weather", "road_type", "speed_limit", "area_type"]);
  if (!daylight) assumed.add("light_conditions");
  if (!waterlogging) assumed.add("road_surface");

  for (const name of RISK_FEATURE_NAMES) {
    const value = overrides[name];
    if (value === undefined) continue;
    // The override values were validated by validation/ml.schema.ts against the same schema.
    (features as Record<RiskFeatureName, unknown>)[name] = value;
    assumed.delete(name);
  }

  return { features, assumedFeatures: RISK_FEATURE_NAMES.filter((name) => assumed.has(name)) };
}

/** Keep only the feature names that were given (undefined values are dropped). */
export function pickOverrides(query: Partial<Record<RiskFeatureName, unknown>>): FeatureOverrides {
  const out: Record<string, unknown> = {};
  for (const name of RISK_FEATURE_NAMES) {
    if (query[name] !== undefined) out[name] = query[name];
  }
  return out as FeatureOverrides;
}

export function hasOverrides(overrides: FeatureOverrides): boolean {
  return RISK_FEATURE_NAMES.some((name) => overrides[name] !== undefined);
}
