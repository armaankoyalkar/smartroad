import {
  ROLES,
  verificationOf,
  type Priority,
  type RiskLevel,
  type Severity,
  type Source,
  type Status,
  type VerificationState,
} from "../config/enums.js";
import { fromPoint, toPoint, type GeoPoint } from "../lib/geo.js";
import { buildIncidentFilter } from "../lib/incidentFilters.js";
import { Incident } from "../models/Incident.js";
import { type MapIncidentsQuery } from "../validation/map.schema.js";

/**
 * GET /api/map/incidents (docs/api.md section 8): the only endpoint that
 * returns GeoJSON. Callers without an admin token never receive REJECTED
 * incidents (lib/incidentFilters) and get `priority` and `riskLevel` as
 * null in the properties.
 */

export interface MapViewer {
  role?: string;
}

export interface MapFeatureProperties {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  status: Status;
  verification: VerificationState;
  priority: Priority | null;
  riskLevel: RiskLevel | null;
  createdAt: Date;
  address: string;
  source: Source;
  hasImage: boolean;
}

export interface MapFeature {
  type: "Feature";
  geometry: GeoPoint;
  properties: MapFeatureProperties;
}

export interface MapFeatureCollection {
  type: "FeatureCollection";
  features: MapFeature[];
}

export interface MapIncidentsResult {
  data: MapFeatureCollection;
  meta: { count: number; truncated: boolean; seedCount: number };
}

/** The projected document read for the map (lean documents, or plain objects in tests). */
export interface MapIncidentSource {
  _id: unknown;
  title: string;
  category: string;
  severity: Severity;
  status: Status;
  priority?: Priority | null;
  riskEstimate?: { level: RiskLevel } | null;
  createdAt: Date;
  address?: string;
  source?: Source;
  image?: unknown;
  location: unknown;
}

const PROJECTION = Object.freeze({
  title: 1,
  category: 1,
  severity: 1,
  status: 1,
  priority: 1,
  "riskEstimate.level": 1,
  createdAt: 1,
  address: 1,
  source: 1,
  "image.url": 1,
  location: 1,
});

/** One GeoJSON feature; null when the stored location is unreadable. */
export function toFeature(doc: MapIncidentSource, isAdmin: boolean): MapFeature | null {
  const { latitude, longitude } = fromPoint(doc.location);
  if (latitude == null || longitude == null) return null;
  return {
    type: "Feature",
    geometry: toPoint(latitude, longitude),
    properties: {
      id: String(doc._id),
      title: doc.title,
      category: doc.category,
      severity: doc.severity,
      status: doc.status,
      verification: verificationOf(doc.status),
      priority: isAdmin ? (doc.priority ?? null) : null,
      riskLevel: isAdmin ? (doc.riskEstimate?.level ?? null) : null,
      createdAt: doc.createdAt,
      address: doc.address ?? "",
      source: doc.source ?? "user",
      hasImage: doc.image != null,
    },
  };
}

export async function listMapIncidents(
  query: MapIncidentsQuery,
  viewer: MapViewer | null | undefined,
): Promise<MapIncidentsResult> {
  const isAdmin = viewer?.role === ROLES.ADMIN;
  const { limit, priority, riskLevel, ...filters } = query;
  // `priority` and `riskLevel` are admin-only filters (docs/api.md section 8):
  // other callers never see those values, so honouring the filter would leak
  // them through the result set. Both are ignored for non-admins.
  const filter = buildIncidentFilter(
    {
      ...filters,
      ...(isAdmin && priority ? { priority } : {}),
      ...(isAdmin && riskLevel ? { riskLevel } : {}),
    },
    { isAdmin },
  );

  // One extra document tells us whether the newest `limit` are all there is.
  const docs = await Incident.find(filter, PROJECTION)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean<MapIncidentSource[]>();
  const truncated = docs.length > limit;
  const rows = truncated ? docs.slice(0, limit) : docs;

  const features = rows.map((doc) => toFeature(doc, isAdmin)).filter((f): f is MapFeature => f !== null);
  const seedCount = rows.filter((doc) => doc.source === "seed").length;
  return {
    data: { type: "FeatureCollection", features },
    meta: { count: features.length, truncated, seedCount },
  };
}
