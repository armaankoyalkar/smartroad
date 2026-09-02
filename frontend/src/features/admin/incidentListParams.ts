/**
 * URL <-> API conversions for the incident management list (docs/api.md 6.3).
 * Filters live in the URL so a filtered list can be shared and survives reloads.
 */
import { sortFromParam, sortToParam, type SortState } from "@/components/ui/tableSort";
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
import type { IncidentListParams } from "@/types/api";

export interface IncidentFilterValues {
  q: string;
  status: IncidentStatus[];
  category: CategoryKey[];
  priority: PriorityFilterValue[];
  severity: Severity[];
  riskLevel: RiskFilterValue[];
  source: Source[];
  /** `YYYY-MM-DD` or empty. */
  from: string;
  to: string;
}

export const EMPTY_INCIDENT_FILTERS: IncidentFilterValues = {
  q: "",
  status: [],
  category: [],
  priority: [],
  severity: [],
  riskLevel: [],
  source: [],
  from: "",
  to: "",
};

/** Columns the API can sort on that the table exposes (docs/api.md 6.3). */
export const INCIDENT_SORT_FIELDS = ["createdAt", "severity", "priority", "status"] as const;
export const DEFAULT_INCIDENT_SORT: SortState = { field: "createdAt", direction: "desc" };
export const INCIDENT_PAGE_LIMIT = 20;

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

/** Read the filters from the URL; unknown values are dropped so a bad link cannot produce a bad request. */
export function parseIncidentFilters(params: URLSearchParams): IncidentFilterValues {
  return {
    q: (params.get("q") ?? "").trim(),
    status: list(params, "status", STATUSES),
    category: list(params, "category", CATEGORY_KEYS),
    priority: list(params, "priority", PRIORITY_FILTER_VALUES),
    severity: list(params, "severity", SEVERITIES),
    riskLevel: list(params, "riskLevel", RISK_FILTER_VALUES),
    source: list(params, "source", SOURCES),
    from: date(params, "from"),
    to: date(params, "to"),
  };
}

/** Values for useQueryParams().setMany(); empty lists and strings remove the key. */
export function serializeIncidentFilters(
  filters: IncidentFilterValues,
): Record<string, string | string[] | undefined> {
  return {
    q: filters.q || undefined,
    status: filters.status,
    category: filters.category,
    priority: filters.priority,
    severity: filters.severity,
    riskLevel: filters.riskLevel,
    source: filters.source,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
}

export function parseIncidentSort(params: URLSearchParams): SortState {
  return (
    sortFromParam(params.get("sort"), INCIDENT_SORT_FIELDS, DEFAULT_INCIDENT_SORT) ?? DEFAULT_INCIDENT_SORT
  );
}

export function parsePage(params: URLSearchParams): number {
  const value = Number(params.get("page"));
  return Number.isInteger(value) && value > 0 ? value : 1;
}

/** Query parameters for GET /api/incidents. */
export function incidentListParams(
  filters: IncidentFilterValues,
  sort: SortState,
  page: number,
  limit = INCIDENT_PAGE_LIMIT,
): IncidentListParams {
  return {
    q: filters.q || undefined,
    status: filters.status.length ? filters.status : undefined,
    category: filters.category.length ? filters.category : undefined,
    priority: filters.priority.length ? filters.priority : undefined,
    severity: filters.severity.length ? filters.severity : undefined,
    riskLevel: filters.riskLevel.length ? filters.riskLevel : undefined,
    source: filters.source.length ? filters.source : undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    sort: sortToParam(sort),
    page,
    limit,
  };
}

/** Number of active facets (the search text does not count; it has its own box). */
export function countActiveIncidentFilters(filters: IncidentFilterValues): number {
  let count = 0;
  for (const key of ["status", "category", "priority", "severity", "riskLevel", "source"] as const) {
    if (filters[key].length) count += 1;
  }
  if (filters.from || filters.to) count += 1;
  return count;
}
