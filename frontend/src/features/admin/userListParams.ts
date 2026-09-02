/** URL <-> API conversions for the user administration list (docs/api.md section 5). */
import { sortFromParam, sortToParam, type SortState } from "@/components/ui/tableSort";
import { ROLES, type Role } from "@/constants/enums";
import type { UserListParams } from "@/types/api";

export type ActiveFilter = "" | "true" | "false";

export interface UserFilterValues {
  q: string;
  role: Role | "";
  isActive: ActiveFilter;
}

export const EMPTY_USER_FILTERS: UserFilterValues = { q: "", role: "", isActive: "" };
export const USER_SORT_FIELDS = ["createdAt", "name", "email"] as const;
export const DEFAULT_USER_SORT: SortState = { field: "createdAt", direction: "desc" };
export const USER_PAGE_LIMIT = 20;

export function parseUserFilters(params: URLSearchParams): UserFilterValues {
  const role = params.get("role");
  const active = params.get("isActive");
  return {
    q: (params.get("q") ?? "").trim(),
    role: role && (ROLES as readonly string[]).includes(role) ? (role as Role) : "",
    isActive: active === "true" || active === "false" ? active : "",
  };
}

export function serializeUserFilters(filters: UserFilterValues): Record<string, string | undefined> {
  return {
    q: filters.q || undefined,
    role: filters.role || undefined,
    isActive: filters.isActive || undefined,
  };
}

export function parseUserSort(params: URLSearchParams): SortState {
  return sortFromParam(params.get("sort"), USER_SORT_FIELDS, DEFAULT_USER_SORT) ?? DEFAULT_USER_SORT;
}

export function userListParams(
  filters: UserFilterValues,
  sort: SortState,
  page: number,
  limit = USER_PAGE_LIMIT,
): UserListParams {
  return {
    q: filters.q || undefined,
    role: filters.role || undefined,
    isActive: filters.isActive === "" ? undefined : filters.isActive === "true",
    sort: sortToParam(sort),
    page,
    limit,
  };
}
