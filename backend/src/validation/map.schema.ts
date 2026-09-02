import { z } from "zod";
import { CATEGORY_KEYS } from "../config/categories.js";
import { PRIORITIES, RISK_LEVELS, SEVERITIES, SOURCES, STATUSES } from "../config/enums.js";
import { parseBbox, type Bbox } from "../lib/geo.js";
import { NO_RISK_ESTIMATE, UNASSIGNED } from "../lib/incidentFilters.js";
import { csvEnum, dateRangeFields, refineDateRange } from "./common.schema.js";

/**
 * Query schemas for /api/map (docs/api.md section 8).
 */

export const MAP_MAX_LIMIT = 5000;
export const HOTSPOT_EPS = Object.freeze({ min: 50, max: 2000, default: 200 });
export const HOTSPOT_MIN_SAMPLES = Object.freeze({ min: 3, max: 20, default: 4 });

const PRIORITY_FILTER_VALUES = [...PRIORITIES, UNASSIGNED] as const;
const RISK_FILTER_VALUES = [...RISK_LEVELS, NO_RISK_ESTIMATE] as const;

/** `bbox=minLng,minLat,maxLng,maxLat` parsed with lib/geo (the only place that knows the order). */
export const bboxQuery = z.string().transform((value, ctx): Bbox => {
  const bbox = parseBbox(value);
  if (!bbox) {
    ctx.addIssue({ code: "custom", message: "Expected minLng,minLat,maxLng,maxLat with min < max" });
    return z.NEVER;
  }
  return bbox;
});

/** GET /api/map/incidents */
export const mapIncidentsQuery = z
  .object({
    status: csvEnum(STATUSES),
    category: csvEnum(CATEGORY_KEYS),
    severity: csvEnum(SEVERITIES),
    priority: csvEnum(PRIORITY_FILTER_VALUES),
    riskLevel: csvEnum(RISK_FILTER_VALUES),
    source: csvEnum(SOURCES),
    ...dateRangeFields,
    bbox: bboxQuery.optional(),
    limit: z.coerce.number().int().min(1).max(MAP_MAX_LIMIT).default(MAP_MAX_LIMIT),
  })
  .superRefine(refineDateRange);
export type MapIncidentsQuery = z.output<typeof mapIncidentsQuery>;

/** GET /api/map/hotspots */
export const hotspotsQuery = z
  .object({
    eps: z.coerce.number().min(HOTSPOT_EPS.min).max(HOTSPOT_EPS.max).default(HOTSPOT_EPS.default),
    minSamples: z.coerce
      .number()
      .int()
      .min(HOTSPOT_MIN_SAMPLES.min)
      .max(HOTSPOT_MIN_SAMPLES.max)
      .default(HOTSPOT_MIN_SAMPLES.default),
    category: csvEnum(CATEGORY_KEYS),
    status: csvEnum(STATUSES),
    ...dateRangeFields,
  })
  .superRefine(refineDateRange);
export type HotspotsQuery = z.output<typeof hotspotsQuery>;
