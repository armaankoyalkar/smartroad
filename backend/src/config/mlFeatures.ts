import { type CategoryKey } from "./categories.js";

/**
 * Feature schema of the shipped risk model (docs/api.md section 9). The ML
 * service publishes the same schema in /model/info; the backend validates
 * requests against this copy before proxying them.
 */

export const DAYS_OF_WEEK = Object.freeze(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const);
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const LIGHT_CONDITIONS = Object.freeze(["DAYLIGHT", "DARK_LIT", "DARK_UNLIT"] as const);
export type LightCondition = (typeof LIGHT_CONDITIONS)[number];

export const WEATHER_CONDITIONS = Object.freeze(["CLEAR", "RAIN", "FOG", "OTHER"] as const);
export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number];

export const ROAD_SURFACES = Object.freeze(["DRY", "WET", "FLOODED"] as const);
export type RoadSurface = (typeof ROAD_SURFACES)[number];

export const ROAD_TYPES = Object.freeze(["HIGHWAY", "ARTERIAL", "LOCAL", "JUNCTION"] as const);
export type RoadType = (typeof ROAD_TYPES)[number];

export const AREA_TYPES = Object.freeze(["URBAN", "RURAL"] as const);
export type AreaType = (typeof AREA_TYPES)[number];

export const SPEED_LIMIT_RANGE = Object.freeze({ min: 20, max: 120 });

/** The ten features, snake_case exactly as the ML service expects them. */
export interface RiskFeatures {
  hour: number;
  day_of_week: DayOfWeek;
  month: number;
  light_conditions: LightCondition;
  weather: WeatherCondition;
  road_surface: RoadSurface;
  road_type: RoadType;
  speed_limit: number;
  area_type: AreaType;
  category: CategoryKey;
}

export const RISK_FEATURE_NAMES = Object.freeze([
  "hour",
  "day_of_week",
  "month",
  "light_conditions",
  "weather",
  "road_surface",
  "road_type",
  "speed_limit",
  "area_type",
  "category",
] as const satisfies readonly (keyof RiskFeatures)[]);
export type RiskFeatureName = (typeof RISK_FEATURE_NAMES)[number];
