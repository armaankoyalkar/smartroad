import { useMemo } from "react";
import { DEFAULT_INCIDENT_SORT, INCIDENT_SORT_FIELDS } from "@/components/incidents/incidentSort";
import { sortFromParam, sortToParam, type SortState } from "@/components/ui/tableSort";
import { CATEGORY_KEYS, STATUSES, type CategoryKey, type IncidentStatus } from "@/constants/enums";
import { useQueryParams } from "@/hooks/useQueryParams";
import type { MyIncidentListParams } from "@/types/api";

export const MY_REPORTS_LIMIT = 10;

/**
 * URL state of the My reports page (`?status=&category=&sort=&page=`), so a filtered list can be
 * shared and survives a reload. Unknown values are dropped before they reach the API.
 */
export function useMyReportsParams() {
  const query = useQueryParams();
  // Multi-valued in the URL (dashboard cards link to comma lists); the select shows a single value.
  const statusList = query.getEnumList("status", STATUSES);
  const status: IncidentStatus | "" = statusList.length === 1 ? statusList[0] : "";
  const category = query.getEnumList("category", CATEGORY_KEYS)[0] ?? "";
  const sort =
    sortFromParam(query.get("sort"), INCIDENT_SORT_FIELDS, DEFAULT_INCIDENT_SORT) ?? DEFAULT_INCIDENT_SORT;
  const page = Math.max(1, Math.floor(query.getNumber("page", 1)));

  const params = useMemo<MyIncidentListParams>(
    () => ({
      status: statusList.length ? statusList : undefined,
      category: category ? [category] : undefined,
      sort: sortToParam(sort),
      page,
      limit: MY_REPORTS_LIMIT,
    }),
    [statusList, category, sort, page],
  );

  const activeFilterCount = (statusList.length ? 1 : 0) + (category ? 1 : 0);

  return {
    status,
    category,
    sort,
    page,
    params,
    activeFilterCount,
    setStatus: (next: IncidentStatus | "") => query.setOne("status", next || undefined),
    setCategory: (next: CategoryKey | "") => query.setOne("category", next || undefined),
    setSort: (next: SortState) =>
      query.setOne(
        "sort",
        next.field === DEFAULT_INCIDENT_SORT.field && next.direction === DEFAULT_INCIDENT_SORT.direction
          ? undefined
          : sortToParam(next),
      ),
    setPage: (next: number) => query.setOne("page", next > 1 ? next : undefined, { resetPage: false }),
    reset: () => query.clear(["status", "category", "sort", "page"]),
  };
}
