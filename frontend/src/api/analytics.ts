import { requestData, requestWithMeta } from "./client";
import { toSearchParams } from "./params";
import type {
  AnalyticsMeta,
  AnalyticsParams,
  AnalyticsSummary,
  Breakdown,
  BreakdownBy,
  MyStats,
  PublicStats,
  Timeline,
  TimelineMeta,
  TimelineParams,
  WithMeta,
} from "@/types/api";

/** GET /api/analytics/public: landing-page figures (excludes REJECTED and seed records). */
export function getPublicStats(): Promise<PublicStats> {
  return requestData<PublicStats>({ method: "GET", url: "/analytics/public" });
}

/** GET /api/analytics/mine (signed-in): the caller's own counts. */
export function getMyStats(): Promise<MyStats> {
  return requestData<MyStats>({ method: "GET", url: "/analytics/mine" });
}

/** GET /api/analytics/summary (admin). */
export function getSummary(params: AnalyticsParams = {}): Promise<WithMeta<AnalyticsSummary, AnalyticsMeta>> {
  return requestWithMeta<AnalyticsSummary, AnalyticsMeta>({
    method: "GET",
    url: "/analytics/summary",
    params: toSearchParams({ ...params }),
  });
}

/** GET /api/analytics/breakdown?by=... (admin): `{ key, label, count, color? }[]` sorted by count. */
export function getBreakdown(by: BreakdownBy, params: AnalyticsParams = {}): Promise<Breakdown> {
  return requestData<Breakdown>({
    method: "GET",
    url: "/analytics/breakdown",
    params: toSearchParams({ by, ...params }),
  });
}

/** GET /api/analytics/timeline (admin): counts per day/week/month with gaps filled. */
export function getTimeline(params: TimelineParams = {}): Promise<WithMeta<Timeline, TimelineMeta>> {
  return requestWithMeta<Timeline, TimelineMeta>({
    method: "GET",
    url: "/analytics/timeline",
    params: toSearchParams({ ...params }),
  });
}
