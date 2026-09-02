/**
 * TanStack Query read hooks, one per GET endpoint in docs/api.md.
 * Every hook returns the standard UseQueryResult so pages render loading, empty and error states.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getBreakdown, getMyStats, getPublicStats, getSummary, getTimeline } from "./analytics";
import { getMe } from "./auth";
import { isApiError } from "./client";
import { getIncident, listIncidents, listMyIncidents } from "./incidents";
import { getHotspots, getMapIncidents } from "./map";
import { getCategories, getEnums, getHealth } from "./meta";
import { getIncidentRisk, getModelInfo, getRiskDistribution } from "./ml";
import { queryKeys } from "./queryKeys";
import { getUser, listUsers } from "./users";
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

export interface QueryOptions {
  enabled?: boolean;
  /** Keep showing the previous page/filter result while the next one loads (default true for lists). */
  keepPrevious?: boolean;
  staleTime?: number;
  refetchInterval?: number | false;
}

/** ML-backed endpoints: never retry a 502/503 (the ML service is down) or an auth failure. */
function retryUnlessMlDown(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && (error.isMlUnavailable || error.status === 401 || error.status === 403))
    return false;
  return failureCount < 1;
}

// ------------------------------------------------------------------ meta and auth

export function useCategories() {
  return useQuery({ queryKey: queryKeys.meta.categories, queryFn: getCategories, staleTime: Infinity });
}

export function useEnums() {
  return useQuery({ queryKey: queryKeys.meta.enums, queryFn: getEnums, staleTime: Infinity });
}

export function useHealth(options: QueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.meta.health,
    queryFn: getHealth,
    enabled: options.enabled ?? true,
    refetchInterval: options.refetchInterval ?? false,
    retry: false,
  });
}

export function useMe(options: QueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: getMe,
    enabled: options.enabled ?? true,
    staleTime: options.staleTime ?? 5 * 60_000,
    retry: false,
  });
}

// ------------------------------------------------------------------ users (admin)

export function useUsers(params: UserListParams = {}, options: QueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => listUsers(params),
    enabled: options.enabled ?? true,
    placeholderData: options.keepPrevious === false ? undefined : keepPreviousData,
  });
}

export function useUser(id: string | undefined, options: QueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.users.detail(id ?? ""),
    queryFn: () => getUser(id as string),
    enabled: (options.enabled ?? true) && !!id,
  });
}

// ------------------------------------------------------------------ incidents

export function useMyIncidents(params: MyIncidentListParams = {}, options: QueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.incidents.mine(params),
    queryFn: () => listMyIncidents(params),
    enabled: options.enabled ?? true,
    placeholderData: options.keepPrevious === false ? undefined : keepPreviousData,
  });
}

export function useAdminIncidents(params: IncidentListParams = {}, options: QueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.incidents.admin(params),
    queryFn: () => listIncidents(params),
    enabled: options.enabled ?? true,
    placeholderData: options.keepPrevious === false ? undefined : keepPreviousData,
  });
}

export function useIncident(id: string | undefined, options: QueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.incidents.detail(id ?? ""),
    queryFn: () => getIncident(id as string),
    enabled: (options.enabled ?? true) && !!id,
  });
}

// ------------------------------------------------------------------ analytics

export function usePublicStats(options: QueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.public,
    queryFn: getPublicStats,
    enabled: options.enabled ?? true,
    staleTime: options.staleTime ?? 5 * 60_000,
  });
}

export function useMyStats(options: QueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.mine,
    queryFn: getMyStats,
    enabled: options.enabled ?? true,
  });
}

export function useSummary(params: AnalyticsParams = {}, options: QueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.summary(params),
    queryFn: () => getSummary(params),
    enabled: options.enabled ?? true,
    placeholderData: options.keepPrevious === false ? undefined : keepPreviousData,
  });
}

export function useBreakdown(by: BreakdownBy, params: AnalyticsParams = {}, options: QueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.breakdown(by, params),
    queryFn: () => getBreakdown(by, params),
    enabled: options.enabled ?? true,
    placeholderData: options.keepPrevious === false ? undefined : keepPreviousData,
  });
}

export function useTimeline(params: TimelineParams = {}, options: QueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.timeline(params),
    queryFn: () => getTimeline(params),
    enabled: options.enabled ?? true,
    placeholderData: options.keepPrevious === false ? undefined : keepPreviousData,
  });
}

// ------------------------------------------------------------------ map

export function useMapIncidents(params: MapIncidentsParams = {}, options: QueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.map.incidents(params),
    queryFn: () => getMapIncidents(params),
    enabled: options.enabled ?? true,
    staleTime: options.staleTime ?? 60_000,
    placeholderData: options.keepPrevious === false ? undefined : keepPreviousData,
  });
}

/** Admin only; pass `enabled=false` until the hotspot layer is switched on. */
export function useHotspots(params: HotspotParams = {}, enabled = true, options: QueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.map.hotspots(params),
    queryFn: () => getHotspots(params),
    enabled,
    staleTime: options.staleTime ?? 10 * 60_000,
    retry: retryUnlessMlDown,
    placeholderData: options.keepPrevious === false ? undefined : keepPreviousData,
  });
}

// ------------------------------------------------------------------ ml (admin)

export function useModelInfo(options: QueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.ml.modelInfo,
    queryFn: getModelInfo,
    enabled: options.enabled ?? true,
    staleTime: options.staleTime ?? 10 * 60_000,
    retry: retryUnlessMlDown,
  });
}

export function useIncidentRisk(
  id: string | undefined,
  params: IncidentRiskParams = {},
  options: QueryOptions = {},
) {
  return useQuery({
    queryKey: queryKeys.ml.incidentRisk(id ?? "", params),
    queryFn: () => getIncidentRisk(id as string, params),
    enabled: (options.enabled ?? true) && !!id,
    retry: retryUnlessMlDown,
  });
}

export function useRiskDistribution(options: QueryOptions = {}) {
  return useQuery({
    queryKey: queryKeys.ml.distribution,
    queryFn: getRiskDistribution,
    enabled: options.enabled ?? true,
  });
}
