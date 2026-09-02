import { HotspotLayer } from "@/components/map/HotspotLayer";
import { IncidentMarkers } from "@/components/map/IncidentMarkers";
import { Legend } from "@/components/map/Legend";
import { MapCanvas, type MapViewport } from "@/components/map/MapCanvas";
import type { ColorMode } from "@/components/map/mapColors";
import type { HotspotCluster, MapFeature } from "@/types/api";
import { cn } from "@/utils/cn";

export interface MapViewProps {
  features: readonly MapFeature[];
  colorMode: ColorMode;
  selectedId: string | null;
  onSelect: (feature: MapFeature) => void;
  detailsHref: (feature: MapFeature) => string | null;
  onViewportChange: (viewport: MapViewport) => void;
  /** Admin hotspot layer (null when off or not loaded). */
  hotspots: { clusters: readonly HotspotCluster[]; noiseIds: readonly string[] } | null;
  height?: number | string;
  /** Below the lg breakpoint the legend is hidden unless this is true (it is always shown on lg+). */
  legendVisible?: boolean;
}

/**
 * The Leaflet composition of the public map page: clustered incident markers, the optional
 * hotspot layer and the legend overlay. Loaded lazily so the map bundle stays off other pages.
 */
export function MapView({
  features,
  colorMode,
  selectedId,
  onSelect,
  detailsHref,
  onViewportChange,
  hotspots,
  height = "100%",
  legendVisible = true,
}: MapViewProps) {
  return (
    <div className="absolute inset-0">
      <MapCanvas
        height={height}
        onViewportChange={onViewportChange}
        ariaLabel="Map of reported incidents"
        className="rounded-none border-0 lg:rounded-none"
      >
        {hotspots && (
          <HotspotLayer clusters={hotspots.clusters} noiseIds={hotspots.noiseIds} features={features} />
        )}
        <IncidentMarkers
          features={features}
          colorMode={colorMode}
          selectedId={selectedId}
          onSelect={onSelect}
          detailsHref={detailsHref}
          mutedIds={hotspots?.noiseIds}
        />
      </MapCanvas>
      <div
        className={cn(
          "pointer-events-none absolute bottom-6 left-3 z-[500] max-w-[calc(100%-1.5rem)]",
          !legendVisible && "hidden lg:block",
        )}
      >
        <Legend mode={colorMode} className="pointer-events-auto max-h-56 overflow-y-auto scrollbar-thin" />
      </div>
    </div>
  );
}
