export type SortDirection = "asc" | "desc";

export interface SortState {
  field: string;
  direction: SortDirection;
}

/** `{ field: "createdAt", direction: "desc" }` -> `-createdAt` (docs/api.md section 1). */
export function sortToParam(sort: SortState | null | undefined): string | undefined {
  if (!sort) return undefined;
  return sort.direction === "desc" ? `-${sort.field}` : sort.field;
}

/** `-createdAt` -> `{ field: "createdAt", direction: "desc" }`. Unknown fields fall back. */
export function sortFromParam(
  param: string | null | undefined,
  allowedFields?: readonly string[],
  fallback: SortState | null = null,
): SortState | null {
  if (!param) return fallback;
  const desc = param.startsWith("-");
  const field = desc ? param.slice(1) : param;
  if (!field || (allowedFields && !allowedFields.includes(field))) return fallback;
  return { field, direction: desc ? "desc" : "asc" };
}

/** Next sort when a column header is clicked: same field flips direction, a new field starts at `defaultDirection`. */
export function toggleSort(
  current: SortState | null | undefined,
  field: string,
  defaultDirection: SortDirection = "desc",
): SortState {
  if (current && current.field === field) {
    return { field, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { field, direction: defaultDirection };
}
