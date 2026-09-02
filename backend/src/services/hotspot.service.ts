import { CATEGORY_KEYS, type CategoryKey } from "../config/categories.js";
import { cache } from "../lib/cache.js";
import { fromPoint } from "../lib/geo.js";
import { buildIncidentFilter, type IncidentFilter } from "../lib/incidentFilters.js";
import * as mlClient from "../lib/mlClient.js";
import { Incident } from "../models/Incident.js";
import { mlHotspotsResponseSchema } from "../validation/ml.schema.js";
import { parseMlBody } from "./ml.service.js";

/**
 * GET /api/map/hotspots (docs/api.md section 8): DBSCAN clusters of reported
 * incidents computed by the ML service from the coordinates the backend
 * sends it. The ML service never sees categories; the dominant category of
 * each cluster is derived here from the members. Results are cached for ten
 * minutes per parameter set.
 */

export const HOTSPOT_CACHE_PREFIX = "hotspots:";
export const HOTSPOT_CACHE_TTL_MS = 10 * 60 * 1000;
export const HOTSPOT_ALGORITHM = "DBSCAN (haversine)";

export interface HotspotParams {
  eps: number;
  minSamples: number;
  category?: string[];
  status?: string[];
  from?: Date;
  to?: Date;
}

export interface HotspotCluster {
  id: number;
  centroid: { latitude: number; longitude: number };
  radiusMeters: number;
  count: number;
  dominantCategory: string | null;
  categoryCounts: Record<string, number>;
  memberIds: string[];
}

export interface HotspotData {
  clusters: HotspotCluster[];
  noiseIds: string[];
  totalPoints: number;
}

export interface HotspotComputation {
  data: HotspotData;
  computedAt: string;
  algorithm: string;
}

export interface HotspotResult {
  data: HotspotData;
  meta: { eps: number; minSamples: number; computedAt: string; cached: boolean; algorithm: string };
}

/** Cache key that is the same for the same parameters regardless of list order. */
export function hotspotCacheKey(params: HotspotParams): string {
  const sorted = (list: string[] | undefined) => [...(list ?? [])].sort();
  return (
    HOTSPOT_CACHE_PREFIX +
    JSON.stringify({
      eps: params.eps,
      minSamples: params.minSamples,
      category: sorted(params.category),
      status: sorted(params.status),
      from: params.from?.toISOString() ?? null,
      to: params.to?.toISOString() ?? null,
    })
  );
}

export interface CategorySummary {
  dominantCategory: string | null;
  /** Ordered by count descending, then category order. */
  categoryCounts: Record<string, number>;
}

const categoryRank = (key: string): number => {
  const index = CATEGORY_KEYS.indexOf(key as CategoryKey);
  return index === -1 ? CATEGORY_KEYS.length : index;
};

/** Count the members' categories; the dominant one wins ties by category order. */
export function summariseCategories(
  memberIds: readonly string[],
  categoryById: ReadonlyMap<string, string>,
): CategorySummary {
  const counts = new Map<string, number>();
  for (const id of memberIds) {
    const category = categoryById.get(id);
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  const ordered = [...counts.entries()].sort(
    ([keyA, a], [keyB, b]) => b - a || categoryRank(keyA) - categoryRank(keyB) || keyA.localeCompare(keyB),
  );
  return {
    dominantCategory: ordered[0]?.[0] ?? null,
    categoryCounts: Object.fromEntries(ordered),
  };
}

/** Non-rejected incidents unless a status filter is given (docs/api.md section 8). */
export function hotspotFilter({ category, status, from, to }: HotspotParams): IncidentFilter {
  const filter = buildIncidentFilter({ category, status, from, to }, { isAdmin: true }) as Record<
    string,
    unknown
  >;
  if (!status?.length) filter.status = { $ne: "REJECTED" };
  return filter as IncidentFilter;
}

interface PointSource {
  _id: unknown;
  location: unknown;
  category: string;
}

export async function computeHotspots(params: HotspotParams): Promise<HotspotComputation> {
  const docs = await Incident.find(hotspotFilter(params), { location: 1, category: 1 })
    .sort({ createdAt: -1, _id: -1 })
    .limit(mlClient.ML_MAX_HOTSPOT_POINTS)
    .lean<PointSource[]>();

  const points: mlClient.MlHotspotPoint[] = [];
  const categoryById = new Map<string, string>();
  for (const doc of docs) {
    const { latitude, longitude } = fromPoint(doc.location);
    if (latitude == null || longitude == null) continue;
    const id = String(doc._id);
    points.push({ id, lat: latitude, lng: longitude });
    categoryById.set(id, doc.category);
  }
  const computedAt = new Date().toISOString();

  if (points.length < params.minSamples) {
    // DBSCAN cannot form a cluster from fewer than minSamples points, so the
    // answer is known without calling the ML service (docs/api.md section 8).
    return {
      data: { clusters: [], noiseIds: points.map((p) => p.id), totalPoints: points.length },
      computedAt,
      algorithm: HOTSPOT_ALGORITHM,
    };
  }

  const body = parseMlBody(
    mlHotspotsResponseSchema,
    await mlClient.hotspots(points, params.eps, params.minSamples),
    "hotspot",
  );
  const clusters: HotspotCluster[] = body.clusters.map((cluster) => ({
    id: cluster.id,
    centroid: { latitude: cluster.centroid.lat, longitude: cluster.centroid.lng },
    radiusMeters: cluster.radius_m,
    count: cluster.count,
    ...summariseCategories(cluster.member_ids, categoryById),
    memberIds: cluster.member_ids,
  }));
  return {
    data: { clusters, noiseIds: body.noise_ids, totalPoints: body.total_points },
    computedAt,
    algorithm: body.params.algorithm || HOTSPOT_ALGORITHM,
  };
}

/** Cached entry point used by the controller. ML failures propagate as ML_UNAVAILABLE / ML_ERROR. */
export async function getHotspots(params: HotspotParams): Promise<HotspotResult> {
  const { value, cached } = await cache.getOrSet(hotspotCacheKey(params), HOTSPOT_CACHE_TTL_MS, () =>
    computeHotspots(params),
  );
  return {
    data: value.data,
    meta: {
      eps: params.eps,
      minSamples: params.minSamples,
      computedAt: value.computedAt,
      cached,
      algorithm: value.algorithm,
    },
  };
}
