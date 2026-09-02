/**
 * Map filter values and their URL / API conversions. MapFilters is a controlled component;
 * the page keeps the values in the URL with useQueryParams and these helpers do the parsing.
 */
import {
  CATEGORY_KEYS,
  PRIORITIES,
  PRIORITY_UNASSIGNED,
  RISK_LEVELS,
  RISK_NONE,
  SEVERITIES,
  SOURCES,
  STATUSES,
  type CategoryKey,
  type IncidentStatus,
  type PriorityFilterValue,
  type RiskFilterValue,
  type Severity,
  type Source,
} from "@/constants/enums";
import type { BBox, HotspotParams, MapIncidentsParams } from "@/types/api";
import { isColorMode, type ColorMode } from "./mapColors";

export interface MapFilterValues {
  category: CategoryKey[];
  status: IncidentStatus[];
  severity: Severity[];
  /** Admin only (ignored by the API for other callers). */
  priority: PriorityFilterValue[];
  /** Admin only. */
  riskLevel: RiskFilterValue[];
  source: Source[];
  /** `YYYY-MM-DD` or empty. */
  from: string;
  to: string;
  colorMode: ColorMode;
}

export const EMPTY_MAP_FILTERS: MapFilterValues = {
  category: [],
  status: [],
  severity: [],
  priority: [],
  riskLevel: [],
  source: [],
  from: "",
  to: "",
  colorMode: "category",
};

const PRIORITY_FILTER_VALUES: readonly PriorityFilterValue[] = [...PRIORITIES, PRIORITY_UNASSIGNED];
const RISK_FILTER_VALUES: readonly RiskFilterValue[] = [...RISK_LEVELS, RISK_NONE];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function list<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]): T[] {
  return (params.get(key) ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is T => (allowed as readonly string[]).includes(v));
}

function date(params: URLSearchParams, key: string): string {
  const value = params.get(key) ?? "";
  return DATE_RE.test(value) ? value : "";
}

/** Read filters from the URL; unknown values are dropped so a bad link cannot produce a bad request. */
export function parseMapFilters(
  params: URLSearchParams,
  options: { isAdmin?: boolean } = {},
): MapFilterValues {
  const isAdmin = options.isAdmin ?? false;
  const color = params.get("color");
  const colorMode: ColorMode = isColorMode(color) && (isAdmin || color !== "risk") ? color : "category";
  return {
    category: list(params, "category", CATEGORY_KEYS),
    status: list(params, "status", STATUSES),
    severity: list(params, "severity", SEVERITIES),
    priority: isAdmin ? list(params, "priority", PRIORITY_FILTER_VALUES) : [],
    riskLevel: isAdmin ? list(params, "riskLevel", RISK_FILTER_VALUES) : [],
    source: list(params, "source", SOURCES),
    from: date(params, "from"),
    to: date(params, "to"),
    colorMode,
  };
}

/** Values for useQueryParams().setMany(); empty lists and strings remove the key. */
export function serializeMapFilters(filters: MapFilterValues): Record<string, string | string[] | undefined> {
  return {
    category: filters.category,
    status: filters.status,
    severity: filters.severity,
    priority: filters.priority,
    riskLevel: filters.riskLevel,
    source: filters.source,
    from: filters.from || undefined,
    to: filters.to || undefined,
    color: filters.colorMode === "category" ? undefined : filters.colorMode,
  };
}

/** Query parameters for GET /api/map/incidents. */
export function mapFiltersToParams(
  filters: MapFilterValues,
  options: { isAdmin?: boolean; bbox?: BBox | null; limit?: number } = {},
): MapIncidentsParams {
  const params: MapIncidentsParams = {
    category: filters.category.length ? filters.category : undefined,
    status: filters.status.length ? filters.status : undefined,
    severity: filters.severity.length ? filters.severity : undefined,
    source: filters.source.length ? filters.source : undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    bbox: options.bbox ?? undefined,
    limit: options.limit,
  };
  if (options.isAdmin) {
    params.priority = filters.priority.length ? filters.priority : undefined;
    params.riskLevel = filters.riskLevel.length ? filters.riskLevel : undefined;
  }
  return params;
}

/** Query parameters for GET /api/map/hotspots (the same category, status and date filters). */
export function hotspotParamsFromFilters(
  filters: MapFilterValues,
  params: { eps?: number; minSamples?: number } = {},
): HotspotParams {
  return {
    eps: params.eps,
    minSamples: params.minSamples,
    category: filters.category.length ? filters.category : undefined,
    status: filters.status.length ? filters.status : undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
}

/** Number of active filter facets (for a "Filters (3)" badge). The colour mode does not count. */
export function countActiveMapFilters(filters: MapFilterValues): number {
  let count = 0;
  for (const key of ["category", "status", "severity", "priority", "riskLevel", "source"] as const) {
    if (filters[key].length) count += 1;
  }
  if (filters.from || filters.to) count += 1;
  return count;
}
