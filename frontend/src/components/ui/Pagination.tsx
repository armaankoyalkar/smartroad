import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatNumber } from "@/utils/format";
import { IconButton } from "./Button";
import { paginationRange } from "./paginationRange";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Total number of items, for the "Showing x to y of z" summary. */
  total?: number;
  /** Items per page, for the summary. */
  limit?: number;
  siblingCount?: number;
  itemLabel?: string;
  className?: string;
}

/** Page navigation (nav landmark, aria-current on the active page). Renders nothing for zero results. */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  limit,
  siblingCount = 1,
  itemLabel = "results",
  className,
}: PaginationProps) {
  const hasSummary = typeof total === "number" && typeof limit === "number" && total > 0;
  if (totalPages <= 1 && !hasSummary) return null;

  const from = hasSummary ? (page - 1) * limit + 1 : 0;
  const to = hasSummary ? Math.min(page * limit, total) : 0;
  const items = paginationRange(page, totalPages, siblingCount);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-col items-center justify-between gap-3 sm:flex-row", className)}
    >
      {hasSummary ? (
        <p className="text-sm text-muted">
          Showing <span className="tabular text-text">{formatNumber(from)}</span> to{" "}
          <span className="tabular text-text">{formatNumber(to)}</span> of{" "}
          <span className="tabular text-text">{formatNumber(total)}</span> {itemLabel}
        </p>
      ) : (
        <span />
      )}
      {totalPages > 1 && (
        <ul className="flex items-center gap-1">
          <li>
            <IconButton
              label="Previous page"
              size="sm"
              variant="outline"
              icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            />
          </li>
          {items.map((item) =>
            typeof item === "number" ? (
              <li key={item}>
                <button
                  type="button"
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? "page" : undefined}
                  onClick={() => onPageChange(item)}
                  className={cn(
                    "tabular h-8 min-w-8 rounded-lg border px-2 text-sm transition-colors duration-150",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
                    item === page
                      ? "border-cyan-400/60 bg-cyan-400/15 font-semibold text-text"
                      : "border-transparent text-muted hover:border-navy-500 hover:text-text",
                  )}
                >
                  {item}
                </button>
              </li>
            ) : (
              <li key={item} aria-hidden="true" className="px-1 text-sm text-faint">
                …
              </li>
            ),
          )}
          <li>
            <IconButton
              label="Next page"
              size="sm"
              variant="outline"
              icon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            />
          </li>
        </ul>
      )}
    </nav>
  );
}
