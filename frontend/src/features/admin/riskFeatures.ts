/**
 * Helpers for the risk model's ten features (docs/api.md section 9): display labels, sensible
 * form defaults and conversions between the form (strings) and the API (typed values).
 */
import { CATEGORY_LABELS, DAYS_OF_WEEK, RISK_FEATURE_NAMES, type RiskFeatureName } from "@/constants/enums";
import type { FeatureSpec, RiskFeatures } from "@/types/api";
import type { RiskFeaturesFormInput } from "@/utils/validation";

/** Labels used when the model-info response has none (it normally carries `label` per feature). */
export const FEATURE_LABELS: Record<RiskFeatureName, string> = {
  hour: "Hour of day",
  day_of_week: "Day of week",
  month: "Month",
  light_conditions: "Light conditions",
  weather: "Weather",
  road_surface: "Road surface",
  road_type: "Road type",
  speed_limit: "Speed limit (km/h)",
  area_type: "Area type",
  category: "Incident category",
};

/** Readable names for categorical values; unknown keys are shown as-is. */
export const FEATURE_VALUE_LABELS: Record<string, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
  DAYLIGHT: "Daylight",
  DARK_LIT: "Dark, street-lit",
  DARK_UNLIT: "Dark, unlit",
  CLEAR: "Clear",
  RAIN: "Rain",
  FOG: "Fog",
  DRY: "Dry",
  WET: "Wet",
  FLOODED: "Flooded",
  HIGHWAY: "Highway",
  ARTERIAL: "Arterial road",
  LOCAL: "Local road",
  JUNCTION: "Junction",
  URBAN: "Urban",
  RURAL: "Rural",
  ...CATEGORY_LABELS,
};

export function isRiskFeatureName(value: unknown): value is RiskFeatureName {
  return typeof value === "string" && (RISK_FEATURE_NAMES as readonly string[]).includes(value);
}

export function featureLabel(name: string, specs?: readonly FeatureSpec[]): string {
  const spec = specs?.find((s) => s.name === name);
  if (spec?.label) return spec.label;
  return isRiskFeatureName(name) ? FEATURE_LABELS[name] : name;
}

export function featureValueLabel(name: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return name === "speed_limit" ? `${value} km/h` : String(value);
  return FEATURE_VALUE_LABELS[value] ?? value;
}

/** Default feature vector: the current hour, weekday and month; the rest as documented defaults. */
export function defaultRiskFeatures(now = new Date()): RiskFeatures {
  const hour = now.getHours();
  // JS getDay(): 0 = Sunday. DAYS_OF_WEEK starts at Monday.
  const day = DAYS_OF_WEEK[(now.getDay() + 6) % 7];
  return {
    hour,
    day_of_week: day,
    month: now.getMonth() + 1,
    light_conditions: hour >= 6 && hour < 18 ? "DAYLIGHT" : "DARK_LIT",
    weather: "CLEAR",
    road_surface: "DRY",
    road_type: "LOCAL",
    speed_limit: 40,
    area_type: "URBAN",
    category: "POTHOLE",
  };
}

/** Form values (numbers as strings so the inputs stay controlled) for react-hook-form defaults. */
export function riskFormDefaults(features: RiskFeatures = defaultRiskFeatures()): RiskFeaturesFormInput {
  return {
    hour: String(features.hour),
    day_of_week: features.day_of_week,
    month: String(features.month),
    light_conditions: features.light_conditions,
    weather: features.weather,
    road_surface: features.road_surface,
    road_type: features.road_type,
    speed_limit: String(features.speed_limit),
    area_type: features.area_type,
    category: features.category,
  };
}

/** Feature specs in the documented order, falling back to a minimal spec when the API sends none. */
export function orderedFeatureSpecs(specs: readonly FeatureSpec[] | undefined): FeatureSpec[] {
  const byName = new Map((specs ?? []).map((s) => [s.name, s]));
  return RISK_FEATURE_NAMES.map(
    (name) => byName.get(name) ?? { name, label: FEATURE_LABELS[name], type: "categorical" as const },
  );
}
