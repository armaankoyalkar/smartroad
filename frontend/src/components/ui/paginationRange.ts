export type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

function range(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
}

/**
 * Page numbers to render, with ellipses: always the first and last page, the current page
 * and `siblingCount` pages on each side of it.
 */
export function paginationRange(page: number, totalPages: number, siblingCount = 1): PaginationItem[] {
  if (totalPages <= 0) return [];
  const current = Math.min(Math.max(1, page), totalPages);
  const totalNumbers = siblingCount * 2 + 5;
  if (totalPages <= totalNumbers) return range(1, totalPages);

  const left = Math.max(current - siblingCount, 1);
  const right = Math.min(current + siblingCount, totalPages);
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < totalPages - 1;
  const edgeCount = 3 + 2 * siblingCount;

  if (!showLeftEllipsis && showRightEllipsis) return [...range(1, edgeCount), "ellipsis-right", totalPages];
  if (showLeftEllipsis && !showRightEllipsis) {
    return [1, "ellipsis-left", ...range(totalPages - edgeCount + 1, totalPages)];
  }
  return [1, "ellipsis-left", ...range(left, right), "ellipsis-right", totalPages];
}
