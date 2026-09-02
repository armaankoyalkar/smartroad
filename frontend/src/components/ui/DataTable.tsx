import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/utils/cn";
import { Skeleton } from "./Skeleton";
import { toggleSort, type SortState } from "./tableSort";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  /** Sortable header button; `sortKey` defaults to `key`. */
  sortable?: boolean;
  sortKey?: string;
  align?: "left" | "center" | "right";
  /** CSS width (e.g. "12rem" or "1%"). */
  width?: string;
  className?: string;
  headerClassName?: string;
  /** Visually hide the header text (actions columns). */
  hideHeader?: boolean;
}

export interface DataTableProps<T> {
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  sort?: SortState | null;
  onSortChange?: (next: SortState) => void;
  /** Below the `md` breakpoint the table collapses to these cards. */
  renderCard?: (row: T, index: number) => ReactNode;
  isLoading?: boolean;
  loadingRows?: number;
  /** Rendered when `rows` is empty and not loading (usually an EmptyState). */
  emptyState?: ReactNode;
  caption?: string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  dense?: boolean;
  stickyHeader?: boolean;
  className?: string;
}

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" };

/**
 * Generic table with typed columns, server-side sort headers (aria-sort), loading skeletons,
 * an empty state and a card layout on small screens.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  renderCard,
  isLoading = false,
  loadingRows = 5,
  emptyState,
  caption,
  onRowClick,
  rowClassName,
  dense = false,
  stickyHeader = false,
  className,
}: DataTableProps<T>) {
  const showSkeleton = isLoading && rows.length === 0;
  const showEmpty = !isLoading && rows.length === 0;
  const cell = dense ? "px-3 py-2" : "px-4 py-3";

  const table = (
    <div className={cn("scrollbar-thin overflow-x-auto", renderCard && "hidden md:block")}>
      <table className="w-full min-w-full border-collapse text-sm" aria-busy={isLoading || undefined}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className={cn(stickyHeader && "sticky top-0 z-10 bg-navy-800")}>
          <tr className="border-b border-navy-600">
            {columns.map((column) => {
              const sortKey = column.sortKey ?? column.key;
              const active = sort?.field === sortKey;
              const ariaSort = column.sortable
                ? active
                  ? sort?.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
                : undefined;
              const Icon = active ? (sort?.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={ariaSort}
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide text-muted",
                    cell,
                    ALIGN[column.align ?? "left"],
                    column.headerClassName,
                  )}
                >
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(toggleSort(sort, sortKey))}
                      className={cn(
                        "inline-flex items-center gap-1 rounded transition-colors duration-150 hover:text-text",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
                        active && "text-text",
                      )}
                    >
                      <span className={cn(column.hideHeader && "sr-only")}>{column.header}</span>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ) : (
                    <span className={cn(column.hideHeader && "sr-only")}>{column.header}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className={cn(isLoading && rows.length > 0 && "opacity-60 transition-opacity")}>
          {showSkeleton &&
            Array.from({ length: loadingRows }, (_, r) => (
              <tr key={`skeleton-${r}`} className="border-b border-navy-600/60">
                {columns.map((column) => (
                  <td key={column.key} className={cell}>
                    <Skeleton className="h-4 w-full max-w-40" />
                  </td>
                ))}
              </tr>
            ))}
          {showEmpty && (
            <tr>
              <td colSpan={columns.length} className="p-0">
                {emptyState}
              </td>
            </tr>
          )}
          {rows.map((row, index) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-navy-600/60 transition-colors duration-150 last:border-b-0 hover:bg-white/[0.03]",
                onRowClick && "cursor-pointer",
                rowClassName?.(row),
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(cell, "align-middle", ALIGN[column.align ?? "left"], column.className)}
                >
                  {column.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!renderCard) return <div className={className}>{table}</div>;

  return (
    <div className={className}>
      {table}
      <div className="space-y-3 md:hidden" aria-busy={isLoading || undefined}>
        {showSkeleton &&
          Array.from({ length: Math.min(loadingRows, 3) }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        {showEmpty && emptyState}
        {rows.map((row, index) => (
          <div key={rowKey(row)}>{renderCard(row, index)}</div>
        ))}
      </div>
    </div>
  );
}
