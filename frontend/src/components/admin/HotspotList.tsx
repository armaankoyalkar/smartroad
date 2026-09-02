import { Crosshair, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryBadge } from "@/components/ui/SemanticBadges";
import { useMeta } from "@/meta/useMeta";
import type { HotspotCluster, HotspotMeta } from "@/types/api";
import { cn } from "@/utils/cn";
import { formatDateTime, formatLatLng, formatMeters, formatNumber, pluralize } from "@/utils/format";
import { MlNotice } from "./MlStates";

export interface HotspotListProps {
  clusters: readonly HotspotCluster[];
  noiseCount: number;
  totalPoints: number;
  meta?: HotspotMeta;
  selectedId: number | null;
  onSelect: (cluster: HotspotCluster) => void;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

/** Table of DBSCAN clusters; selecting a row flies the map to the cluster. */
export function HotspotList({
  clusters,
  noiseCount,
  totalPoints,
  meta,
  selectedId,
  onSelect,
  isLoading = false,
  error,
  onRetry,
  className,
}: HotspotListProps) {
  const categories = useMeta();
  const columns: DataTableColumn<HotspotCluster>[] = [
    {
      key: "id",
      header: "Cluster",
      render: (row) => (
        <Button
          size="xs"
          variant={row.id === selectedId ? "secondary" : "ghost"}
          onClick={() => onSelect(row)}
          aria-pressed={row.id === selectedId}
          leftIcon={<Crosshair className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          {row.id + 1}
        </Button>
      ),
    },
    {
      key: "category",
      header: "Dominant category",
      render: (row) => (
        <div className="space-y-1">
          {row.dominantCategory ? (
            <CategoryBadge category={row.dominantCategory} size="sm" />
          ) : (
            <span className="text-muted">Mixed</span>
          )}
          <p className="text-[11px] text-muted">
            {Object.entries(row.categoryCounts)
              .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
              .map(([key, count]) => `${categories.categoryLabel(key)} ${count}`)
              .join(" · ")}
          </p>
        </div>
      ),
    },
    { key: "count", header: "Points", align: "right", render: (row) => formatNumber(row.count) },
    { key: "radius", header: "Radius", align: "right", render: (row) => formatMeters(row.radiusMeters) },
    {
      key: "centre",
      header: "Centre",
      render: (row) => (
        <span className="tabular font-mono text-xs text-muted">
          {formatLatLng(row.centroid.latitude, row.centroid.longitude)}
        </span>
      ),
    },
  ];

  if (error) return <MlNotice error={error} onRetry={onRetry} className={className} />;

  return (
    <div className={cn("space-y-2", className)}>
      <DataTable
        columns={columns}
        rows={clusters}
        rowKey={(row) => String(row.id)}
        isLoading={isLoading}
        loadingRows={3}
        dense
        caption="Hotspot clusters"
        onRowClick={onSelect}
        rowClassName={(row) => (row.id === selectedId ? "bg-cyan-400/10" : undefined)}
        emptyState={
          <EmptyState
            size="sm"
            icon={MapPinOff}
            title="Not enough data for hotspots"
            description="No group of reports is dense enough for these parameters. Try a larger radius or fewer minimum points."
          />
        }
      />
      {!isLoading && (
        <p className="text-xs text-muted" aria-live="polite">
          {pluralize(clusters.length, "cluster")} from {formatNumber(totalPoints)} points;{" "}
          {pluralize(noiseCount, "point")} left as noise.
          {meta && (
            <>
              {" "}
              {meta.cached ? "Computed" : "Computed just now"} {formatDateTime(meta.computedAt)} (
              {meta.algorithm}).
            </>
          )}
        </p>
      )}
    </div>
  );
}
