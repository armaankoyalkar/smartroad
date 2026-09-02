import { z } from "zod";
import { CATEGORY_KEYS } from "../config/categories.js";
import { RISK_LEVELS } from "../config/enums.js";
import {
  AREA_TYPES,
  DAYS_OF_WEEK,
  LIGHT_CONDITIONS,
  ROAD_SURFACES,
  ROAD_TYPES,
  SPEED_LIMIT_RANGE,
  WEATHER_CONDITIONS,
} from "../config/mlFeatures.js";
import { optionalBooleanish } from "./common.schema.js";

/**
 * Schemas for /api/ml (docs/api.md section 9) and for the bodies the ML
 * service sends back (section 10). Requests are validated against the fixed
 * feature schema before anything is proxied; responses are validated so a
 * malformed body becomes ML_ERROR instead of leaking into the API.
 */

// --- requests -------------------------------------------------------------

/** The ten features of the shipped model, JSON body form (numbers are numbers). */
export const riskFeaturesSchema = z.object({
  hour: z.number().int().min(0).max(23),
  day_of_week: z.enum(DAYS_OF_WEEK),
  month: z.number().int().min(1).max(12),
  light_conditions: z.enum(LIGHT_CONDITIONS),
  weather: z.enum(WEATHER_CONDITIONS),
  road_surface: z.enum(ROAD_SURFACES),
  road_type: z.enum(ROAD_TYPES),
  speed_limit: z.number().int().min(SPEED_LIMIT_RANGE.min).max(SPEED_LIMIT_RANGE.max),
  area_type: z.enum(AREA_TYPES),
  category: z.enum(CATEGORY_KEYS),
});

/** POST /api/ml/estimate-risk */
export const estimateRiskBody = z.object({ features: riskFeaturesSchema });
export type EstimateRiskBody = z.output<typeof estimateRiskBody>;

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);
const queryInt = (min: number, max: number) =>
  z.preprocess(blankToUndefined, z.coerce.number().int().min(min).max(max).optional());
const queryEnum = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(blankToUndefined, z.enum(values).optional());

/** GET /api/ml/incidents/:id/risk: every feature may be overridden from the query string. */
export const incidentRiskQuery = z.object({
  hour: queryInt(0, 23),
  day_of_week: queryEnum(DAYS_OF_WEEK),
  month: queryInt(1, 12),
  light_conditions: queryEnum(LIGHT_CONDITIONS),
  weather: queryEnum(WEATHER_CONDITIONS),
  road_surface: queryEnum(ROAD_SURFACES),
  road_type: queryEnum(ROAD_TYPES),
  speed_limit: queryInt(SPEED_LIMIT_RANGE.min, SPEED_LIMIT_RANGE.max),
  area_type: queryEnum(AREA_TYPES),
  category: queryEnum(CATEGORY_KEYS),
  refresh: optionalBooleanish.default(false),
});
export type IncidentRiskQuery = z.output<typeof incidentRiskQuery>;

// --- ML service responses (snake_case, docs/api.md section 10) -------------

const probabilities = z.object({ LOW: z.number(), MEDIUM: z.number(), HIGH: z.number() });

export const mlEstimateResponseSchema = z.object({
  risk_level: z.enum(RISK_LEVELS),
  probabilities,
  model_version: z.string().min(1),
  is_demo_model: z.boolean(),
  contributions: z.array(
    z.object({ feature: z.string(), value: z.union([z.string(), z.number()]), effect: z.number() }),
  ),
  disclaimer: z.string(),
});

export const mlBatchResponseSchema = z.object({
  model_version: z.string().min(1),
  is_demo_model: z.boolean(),
  results: z.array(z.object({ id: z.string(), risk_level: z.enum(RISK_LEVELS), probabilities })),
});

export const mlHotspotsResponseSchema = z.object({
  clusters: z.array(
    z.object({
      id: z.number().int(),
      centroid: z.object({ lat: z.number(), lng: z.number() }),
      radius_m: z.number(),
      count: z.number().int(),
      member_ids: z.array(z.string()),
    }),
  ),
  noise_ids: z.array(z.string()),
  params: z.looseObject({ eps_m: z.number(), min_samples: z.number(), algorithm: z.string() }),
  total_points: z.number().int(),
});

/**
 * /model/info after camelCase conversion. Only the parts the API relies on
 * are checked; everything else (dataset card, metrics, matrices) passes
 * through unchanged so the research view shows exactly what the artifacts
 * contain.
 */
export const modelInfoSchema = z.looseObject({
  modelName: z.string(),
  modelVersion: z.string().min(1),
  isDemoModel: z.boolean(),
  features: z.array(z.looseObject({ name: z.string(), type: z.string() })),
  classes: z.array(z.string()),
  disclaimer: z.string(),
  hotspotDefaults: z.looseObject({ epsMeters: z.number(), minSamples: z.number() }),
});
export type ModelInfo = z.output<typeof modelInfoSchema>;
