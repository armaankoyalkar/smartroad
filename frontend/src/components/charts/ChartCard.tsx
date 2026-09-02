import type { ReactNode } from "react";
import { ChartColumn } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/utils/cn";

export interface ChartCardProps {
  title: ReactNode;
  description?: ReactNode;
  /** Controls on the right of the header (tabs, a range selector). */
  actions?: ReactNode;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** No data to draw: shows an empty state instead of an empty chart. */
  isEmpty?: boolean;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  /** Height of the chart area (default 280). The child should fill it (ResponsiveContainer). */
  height?: number | string;
  /** Text alternative rendered under the chart (a sentence or a small table) so the numbers are available without colour or a screen. */
  summary?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Card wrapper for every chart with loading, error and empty states. Every number inside is fetched, never assumed. */
export function ChartCard({
  title,
  description,
  actions,
  isLoading = false,
  error,
  onRetry,
  isEmpty = false,
  emptyTitle = "No data to chart",
  emptyDescription = "Nothing matches the current filters.",
  height = 280,
  summary,
  footer,
  children,
  className,
}: ChartCardProps) {
  let content: ReactNode;
  if (isLoading) content = <Skeleton className="h-full w-full rounded-lg" />;
  else if (error) content = <ErrorState error={error} onRetry={onRetry} className="h-full py-4" />;
  else if (isEmpty)
    content = (
      <EmptyState
        size="sm"
        icon={ChartColumn}
        title={emptyTitle}
        description={emptyDescription}
        className="h-full"
      />
    );
  else content = children;

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader title={title} description={description} actions={actions} />
      <div className="relative w-full" style={{ height }} aria-busy={isLoading || undefined}>
        {content}
      </div>
      {summary && !isLoading && !error && !isEmpty && (
        <div className="mt-3 border-t border-navy-600 pt-3 text-xs text-muted">{summary}</div>
      )}
      {footer && <div className="mt-3">{footer}</div>}
    </Card>
  );
}
