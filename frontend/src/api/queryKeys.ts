import { cleanParams, type ParamValue } from "./params";
import type {
  AnalyticsParams,
  BreakdownBy,
  HotspotParams,
  IncidentListParams,
  IncidentRiskParams,
  MapIncidentsParams,
  MyIncidentListParams,
  TimelineParams,
  UserListParams,
} from "@/types/api";

type AnyParams = Record<string, ParamValue>;
const clean = <T extends object>(params: T | undefined) => cleanParams((params ?? {}) as AnyParams);

/**
 * Query keys, grouped by domain. The first segment is the domain so invalidation can target
 * `["incidents"]` and hit every incident list and detail at once.
 */
export const queryKeys = {
  meta: {
    all: ["meta"] as const,
    categories: ["meta", "categories"] as const,
    enums: ["meta", "enums"] as const,
    health: ["meta", "health"] as const,
  },
  auth: {
    me: ["auth", "me"] as const,
  },
  users: {
    all: ["users"] as const,
    list: (params?: UserListParams) => ["users", "list", clean(params)] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },
  incidents: {
    all: ["incidents"] as const,
    mine: (params?: MyIncidentListParams) => ["incidents", "mine", clean(params)] as const,
    admin: (params?: IncidentListParams) => ["incidents", "admin", clean(params)] as const,
    detail: (id: string) => ["incidents", "detail", id] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    public: ["analytics", "public"] as const,
    mine: ["analytics", "mine"] as const,
    summary: (params?: AnalyticsParams) => ["analytics", "summary", clean(params)] as const,
    breakdown: (by: BreakdownBy, params?: AnalyticsParams) =>
      ["analytics", "breakdown", by, clean(params)] as const,
    timeline: (params?: TimelineParams) => ["analytics", "timeline", clean(params)] as const,
  },
  map: {
    all: ["map"] as const,
    incidents: (params?: MapIncidentsParams) => ["map", "incidents", clean(params)] as const,
    hotspots: (params?: HotspotParams) => ["map", "hotspots", clean(params)] as const,
  },
  ml: {
    all: ["ml"] as const,
    modelInfo: ["ml", "model-info"] as const,
    incidentRisk: (id: string, params?: IncidentRiskParams) =>
      ["ml", "incident-risk", id, clean(params)] as const,
    distribution: ["ml", "risk", "distribution"] as const,
  },
} as const;
