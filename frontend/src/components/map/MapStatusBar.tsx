import type { ReactNode } from "react";
import { CircleAlert, Database, ZoomIn } from "lucide-react";
import { getErrorMessage, isApiError } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/utils/cn";
import { formatNumber, pluralize } from "@/utils/format";

export interface HotspotStatus {
  enabled: boolean;
  isLoading?: boolean;
  error?: unknown;
  clusterCount?: number;
  totalPoints?: number;
}

export interface MapStatusBarProps {
  /** Features currently shown (`meta.count`). */
  count?: number;
  /** `meta.truncated`: more incidents matched than `limit`. */
  truncated?: boolean;
  limit?: number;
  /** `meta.seedCount`: demo records among the shown features. */
  seedCount?: number;
  isLoading?: boolean;
  /** Background refetch (previous data still shown). */
  isFetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  hotspots?: HotspotStatus;
  /** Extra controls rendered on the right. */
  children?: ReactNode;
  className?: string;
}

function Item({
  icon,
  tone = "muted",
  children,
}: {
  icon?: ReactNode;
  tone?: "muted" | "warning" | "danger";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        tone === "warning" && "text-amber-300",
        tone === "danger" && "text-red-300",
        tone === "muted" && "text-muted",
      )}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
}

/** Count, truncation hint, demo-data note and hotspot / ML availability, announced politely. */
export function MapStatusBar({
  count,
  truncated = false,
  limit,
  seedCount = 0,
  isLoading = false,
  isFetching = false,
  error,
  onRetry,
  hotspots,
  children,
  className,
}: MapStatusBarProps) {
  const hotspotError = hotspots?.enabled ? hotspots.error : undefined;
  const mlDown = isApiError(hotspotError) && hotspotError.isMlUnavailable;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "glass-strong flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg px-3 py-2 text-xs",
        className,
      )}
    >
      {isLoading ? (
        <Item icon={<Spinner size="sm" decorative className="text-cyan-400" />}>Loading incidents…</Item>
      ) : error ? (
        <Item tone="danger" icon={<CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />}>
          {getErrorMessage(error)}
          {onRetry && (
            <Button size="xs" variant="outline" className="ml-2" onClick={onRetry}>
              Retry
            </Button>
          )}
        </Item>
      ) : (
        typeof count === "number" && (
          <Item>
            <span className="tabular text-text">{pluralize(count, "incident")}</span> shown
            {isFetching && <Spinner size="sm" decorative className="ml-1.5 text-cyan-400" />}
          </Item>
        )
      )}
      {truncated && !isLoading && (
        <Item tone="warning" icon={<ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />}>
          Showing the newest {limit ? formatNumber(limit) : "matches"}. Zoom in to see all.
        </Item>
      )}
      {seedCount > 0 && !isLoading && (
        <Item icon={<Database className="h-3.5 w-3.5" aria-hidden="true" />}>
          Includes demo data ({formatNumber(seedCount)})
        </Item>
      )}
      {hotspots?.enabled &&
        (hotspots.isLoading ? (
          <Item icon={<Spinner size="sm" decorative className="text-cyan-400" />}>Computing hotspots…</Item>
        ) : hotspotError ? (
          <Item tone="warning" icon={<CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />}>
            {mlDown
              ? "ML service unavailable: hotspots cannot be computed right now. Reporting and the map keep working."
              : getErrorMessage(hotspotError)}
          </Item>
        ) : hotspots.clusterCount === 0 ? (
          <Item>Not enough data for hotspots with these parameters.</Item>
        ) : typeof hotspots.clusterCount === "number" ? (
          <Item>
            <span className="tabular text-text">{pluralize(hotspots.clusterCount, "hotspot")}</span>
            {typeof hotspots.totalPoints === "number" && ` from ${formatNumber(hotspots.totalPoints)} points`}
          </Item>
        ) : null)}
      {children && <span className="ml-auto flex items-center gap-2">{children}</span>}
    </div>
  );
}
