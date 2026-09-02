import { Types } from "mongoose";
import { ACTIVE_STATUSES, isStatus, PENDING_STATUSES, STATUSES, type Status } from "../config/enums.js";
import { cache, type CacheResult } from "../lib/cache.js";
import { type IncidentFilter } from "../lib/incidentFilters.js";
import { Incident } from "../models/Incident.js";

/**
 * Analytics counts (docs/api.md section 7). Every figure is an aggregation
 * over the incidents collection; nothing here is a stored or invented
 * number. The count definitions are shared by all endpoints:
 *   pendingVerification = SUBMITTED + UNDER_REVIEW
 *   verified            = VERIFIED
 *   active              = VERIFIED + IN_PROGRESS
 *   highPriorityOpen    = priority HIGH or CRITICAL and status not RESOLVED/REJECTED
 * Breakdown and timeline live in analyticsCharts.service.ts.
 */

const DAY_MS = 86_400_000;

export const PUBLIC_STATS_CACHE_KEY = "analytics:public";
export const PUBLIC_STATS_TTL_MS = 5 * 60 * 1000;

export interface RangeOptions {
  from?: Date;
  to?: Date;
  /** Include records with source "seed" (default true on the admin endpoints). */
  includeSeed: boolean;
}

/** createdAt range plus the optional seed exclusion, as a query filter. */
export function rangeFilter({ from, to, includeSeed }: RangeOptions): IncidentFilter {
  const filter: Record<string, unknown> = {};
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    filter.createdAt = range;
  }
  if (!includeSeed) filter.source = { $ne: "seed" };
  return filter as IncidentFilter;
}

export type StatusCounts = Record<Status, number>;

export function zeroStatusCounts(): StatusCounts {
  return Object.fromEntries(STATUSES.map((s) => [s, 0])) as StatusCounts;
}

/** One $group over status; every status key is present in the result, zero when absent. */
export async function countByStatus(match: IncidentFilter): Promise<StatusCounts> {
  const rows = await Incident.aggregate<{ _id: unknown; count: number }>([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const counts = zeroStatusCounts();
  for (const row of rows) {
    if (isStatus(row._id)) counts[row._id] = row.count;
  }
  return counts;
}

const sumOf = (counts: StatusCounts, statuses: readonly Status[]): number =>
  statuses.reduce((total, status) => total + counts[status], 0);

// --- GET /api/analytics/public ---------------------------------------------

export interface PublicStats {
  reportsFiled: number;
  reportsResolved: number;
  reportsLast30Days: number;
  resolvedLast30Days: number;
  generatedAt: string;
}

/** Landing page figures: real (non-seed) reports that were not rejected. */
export async function computePublicStats(now: Date = new Date()): Promise<PublicStats> {
  const base: IncidentFilter = { status: { $ne: "REJECTED" }, source: { $ne: "seed" } };
  const since = new Date(now.getTime() - 30 * DAY_MS);
  const [reportsFiled, reportsResolved, reportsLast30Days, resolvedLast30Days] = await Promise.all([
    Incident.countDocuments(base),
    Incident.countDocuments({ ...base, status: "RESOLVED" }),
    Incident.countDocuments({ ...base, createdAt: { $gte: since } }),
    Incident.countDocuments({ ...base, status: "RESOLVED", resolvedAt: { $gte: since } }),
  ]);
  return {
    reportsFiled,
    reportsResolved,
    reportsLast30Days,
    resolvedLast30Days,
    generatedAt: now.toISOString(),
  };
}

/** Cached for five minutes (docs/api.md section 7). */
export function getPublicStats(): Promise<CacheResult<PublicStats>> {
  return cache.getOrSet(PUBLIC_STATS_CACHE_KEY, PUBLIC_STATS_TTL_MS, () => computePublicStats());
}

// --- GET /api/analytics/mine -----------------------------------------------

export interface MyStats {
  total: number;
  pending: number;
  active: number;
  resolved: number;
  rejected: number;
}

/** Counts over the caller's own reports, every status included. */
export async function computeMyStats(userId: Types.ObjectId | string): Promise<MyStats> {
  // Aggregation pipelines are not cast by Mongoose, so the id must be a real ObjectId.
  const reportedBy = userId instanceof Types.ObjectId ? userId : new Types.ObjectId(String(userId));
  const counts = await countByStatus({ reportedBy } as IncidentFilter);
  return {
    total: sumOf(counts, STATUSES),
    pending: sumOf(counts, PENDING_STATUSES),
    active: sumOf(counts, ACTIVE_STATUSES),
    resolved: counts.RESOLVED,
    rejected: counts.REJECTED,
  };
}

// --- GET /api/analytics/summary --------------------------------------------

export interface Summary {
  total: number;
  pendingVerification: number;
  verified: number;
  active: number;
  resolved: number;
  rejected: number;
  highPriorityOpen: number;
  byStatus: StatusCounts;
  /** Seed records inside the counted set (0 when includeSeed is false). */
  seedCount: number;
}

export async function computeSummary(options: RangeOptions): Promise<Summary> {
  const base = rangeFilter(options);
  const [byStatus, highPriorityOpen, seedCount] = await Promise.all([
    countByStatus(base),
    Incident.countDocuments({
      ...base,
      priority: { $in: ["HIGH", "CRITICAL"] },
      status: { $nin: ["RESOLVED", "REJECTED"] },
    }),
    options.includeSeed ? Incident.countDocuments({ ...base, source: "seed" }) : Promise.resolve(0),
  ]);
  return {
    total: sumOf(byStatus, STATUSES),
    pendingVerification: sumOf(byStatus, PENDING_STATUSES),
    verified: byStatus.VERIFIED,
    active: sumOf(byStatus, ACTIVE_STATUSES),
    resolved: byStatus.RESOLVED,
    rejected: byStatus.REJECTED,
    highPriorityOpen,
    byStatus,
    seedCount,
  };
}

/** `meta` for the admin analytics responses. */
export function rangeMeta({ from, to, includeSeed }: RangeOptions): {
  from: string | null;
  to: string | null;
  includeSeed: boolean;
} {
  return { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null, includeSeed };
}
