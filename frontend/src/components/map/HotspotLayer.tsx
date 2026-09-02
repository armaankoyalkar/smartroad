import { useMemo } from "react";
import { Circle, CircleMarker, Popup, Tooltip } from "react-leaflet";
import { BRAND } from "@/constants/colors";
import { useMeta } from "@/meta/useMeta";
import type { HotspotCluster, MapFeature } from "@/types/api";
import { formatMeters, pluralize } from "@/utils/format";
import { MUTED_MARKER } from "./mapColors";

export interface HotspotLayerProps {
  clusters: readonly HotspotCluster[];
  /** Ids of points DBSCAN labelled as noise. */
  noiseIds?: readonly string[];
  /** Loaded map features; those in `noiseIds` are drawn as muted dots (ids not loaded are ignored). */
  features?: readonly MapFeature[];
  selectedClusterId?: number | null;
  onClusterClick?: (cluster: HotspotCluster) => void;
  /** Colour circles by dominant category (default) or with the accent colour. */
  colorByCategory?: boolean;
  showPopups?: boolean;
}

/**
 * One Circle per DBSCAN cluster (centroid, radius) with a permanent count tooltip and a
 * details popup; noise points drawn muted. "Clusters of reported incidents", never "risk".
 */
export function HotspotLayer({
  clusters,
  noiseIds,
  features,
  selectedClusterId = null,
  onClusterClick,
  colorByCategory = true,
  showPopups = true,
}: HotspotLayerProps) {
  const meta = useMeta();
  const noise = useMemo(() => {
    if (!features || !noiseIds?.length) return [];
    const ids = new Set(noiseIds);
    return features.filter((f) => ids.has(f.properties.id));
  }, [features, noiseIds]);

  return (
    <>
      {noise.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        return (
          <CircleMarker
            key={`noise-${feature.properties.id}`}
            center={[lat, lng]}
            radius={4}
            pathOptions={{ ...MUTED_MARKER, dashArray: "2 3", interactive: false }}
          />
        );
      })}
      {clusters.map((cluster) => {
        const color =
          colorByCategory && cluster.dominantCategory
            ? meta.categoryColor(cluster.dominantCategory)
            : BRAND.accent;
        const selected = cluster.id === selectedClusterId;
        const categories = Object.entries(cluster.categoryCounts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
        return (
          <Circle
            key={cluster.id}
            center={[cluster.centroid.latitude, cluster.centroid.longitude]}
            radius={Math.max(cluster.radiusMeters, 30)}
            pathOptions={{
              color: selected ? BRAND.text : color,
              weight: selected ? 3 : 2,
              fillColor: color,
              fillOpacity: selected ? 0.32 : 0.18,
            }}
            eventHandlers={onClusterClick ? { click: () => onClusterClick(cluster) } : undefined}
          >
            <Tooltip permanent direction="center" className="hotspot-count" interactive={false}>
              {cluster.count}
            </Tooltip>
            {showPopups && (
              <Popup maxWidth={260}>
                <div className="w-52 space-y-1.5 text-text">
                  <p className="text-sm font-semibold">Cluster {cluster.id + 1}</p>
                  <p className="text-xs text-muted">
                    {pluralize(cluster.count, "reported incident")} within{" "}
                    {formatMeters(cluster.radiusMeters)}
                  </p>
                  <ul className="space-y-0.5 text-xs">
                    {categories.map(([key, count]) => (
                      <li key={key} className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: meta.categoryColor(key) }}
                        />
                        <span className="flex-1">{meta.categoryLabel(key)}</span>
                        <span className="tabular text-muted">{count}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-faint">
                    Density cluster of reports (DBSCAN); not a risk estimate.
                  </p>
                </div>
              </Popup>
            )}
          </Circle>
        );
      })}
    </>
  );
}
