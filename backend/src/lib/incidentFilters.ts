import { type QueryFilter, type Types } from "mongoose";
import { type IncidentAttrs } from "../models/Incident.js";
import { AppError } from "./errors.js";
import { type Bbox, bboxToPolygon, parseBbox } from "./geo.js";

/**
 * Translate list/map query parameters into a MongoDB filter (docs/api.md
 * sections 6.3, 6.4 and 8). Values are expected to be validated already
 * (validation/common.schema.ts); this module only assembles the filter and
 * applies the privacy rule: callers without an admin token never receive
 * REJECTED incidents unless they are listing their own reports.
 */

export const UNASSIGNED = "UNASSIGNED";
export const NO_RISK_ESTIMATE = "NONE";

export interface IncidentFilterQuery {
  status?: string | string[];
  category?: string | string[];
  severity?: string | string[];
  priority?: string | string[];
  source?: string | string[];
  riskLevel?: string | string[];
  from?: Date;
  to?: Date;
  q?: string;
  bbox?: Bbox | string;
}

export interface IncidentFilterOptions {
  isAdmin: boolean;
  /** When set, only this reporter's incidents are matched and REJECTED stays visible. */
  ownerId?: Types.ObjectId | string | null;
}

export type IncidentFilter = QueryFilter<IncidentAttrs>;

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Normalise "A,B", ["A", "B"] or ["A,B"] into a de-duplicated list of trimmed values. */
function list(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const items = Array.isArray(value) ? value : [value];
  return [...new Set(items.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean))];
}

export function buildIncidentFilter(query: IncidentFilterQuery, { isAdmin, ownerId }: IncidentFilterOptions): IncidentFilter {
  const filter: Record<string, unknown> = {};
  const restrictRejected = !isAdmin && !ownerId;

  if (ownerId) filter.reportedBy = ownerId;

  const statuses = list(query.status);
  if (statuses.length) {
    const visible = restrictRejected ? statuses.filter((s) => s !== "REJECTED") : statuses;
    filter.status = { $in: visible }; // an empty list matches nothing, by design
  } else if (restrictRejected) {
    filter.status = { $ne: "REJECTED" };
  }

  const categories = list(query.category);
  if (categories.length) filter.category = { $in: categories };

  const severities = list(query.severity);
  if (severities.length) filter.severity = { $in: severities };

  const priorities = list(query.priority);
  if (priorities.length) {
    const values: Array<string | null> = priorities.filter((p) => p !== UNASSIGNED);
    if (priorities.includes(UNASSIGNED)) values.push(null);
    filter.priority = { $in: values };
  }

  const sources = list(query.source);
  if (sources.length) filter.source = { $in: sources };

  const riskLevels = list(query.riskLevel);
  if (riskLevels.length) {
    const values: Array<string | null> = riskLevels.filter((r) => r !== NO_RISK_ESTIMATE);
    if (riskLevels.includes(NO_RISK_ESTIMATE)) values.push(null); // null also matches a missing sub-document
    filter["riskEstimate.level"] = { $in: values };
  }

  if (query.from || query.to) {
    const range: Record<string, Date> = {};
    if (query.from) range.$gte = query.from;
    if (query.to) range.$lte = query.to;
    filter.createdAt = range;
  }

  const q = typeof query.q === "string" ? query.q.trim() : "";
  if (q) {
    const pattern = escapeRegex(q.slice(0, 200));
    filter.$or = ["title", "description", "address"].map((field) => ({ [field]: { $regex: pattern, $options: "i" } }));
  }

  if (query.bbox !== undefined) {
    const bbox = typeof query.bbox === "string" ? parseBbox(query.bbox) : query.bbox;
    if (!bbox) {
      throw AppError.validation([{ field: "bbox", message: "Expected minLng,minLat,maxLng,maxLat" }]);
    }
    filter.location = { $geoWithin: { $geometry: bboxToPolygon(bbox) } };
  }

  return filter as IncidentFilter;
}
