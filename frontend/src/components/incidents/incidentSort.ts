import type { SortState } from "@/components/ui/tableSort";

/** Sort fields accepted by GET /api/incidents and /api/incidents/mine (docs/api.md 6.3). */
export const INCIDENT_SORT_FIELDS = ["createdAt", "updatedAt", "priority", "status", "severity"] as const;
export type IncidentSortField = (typeof INCIDENT_SORT_FIELDS)[number];

/** The API default: newest first. */
export const DEFAULT_INCIDENT_SORT: SortState = { field: "createdAt", direction: "desc" };
