import type { Map as LeafletMap } from "leaflet";
import { HotspotLayer } from "@/components/map/HotspotLayer";
import { IncidentMarkers } from "@/components/map/IncidentMarkers";
import { Legend } from "@/components/map/Legend";
import { MapCanvas, type MapViewport } from "@/components/map/MapCanvas";
import type { ColorMode } from "@/components/map/mapColors";
import type { HotspotCluster, MapFeature } from "@/types/api";

export interface AdminMapCanvasProps {
  features: readonly MapFeature[];
  colorMode: ColorMode;
  clusters?: readonly HotspotCluster[];
  noiseIds?: readonly string[];
  showHotspots: boolean;
  selectedClusterId: number | null;
  onClusterSelect: (cluster: HotspotCluster) => void;
  onReady: (map: LeafletMap) => void;
  onViewportChange?: (viewport: MapViewport) => void;
  height?: number | string;
  className?: string;
}

/**
 * The admin map proper: markers (any colour mode, including risk), the hotspot layer and the
 * legend overlay. Loaded lazily by the page so the Leaflet bundle is only fetched here.
 */
export default function AdminMapCanvas({
  features,
  colorMode,
  clusters = [],
  noiseIds = [],
  showHotspots,
  selectedClusterId,
  onClusterSelect,
  onReady,
  onViewportChange,
  height = "100%",
  className,
}: AdminMapCanvasProps) {
  return (
    <div className={className} style={{ position: "relative", height }}>
      <MapCanvas
        height="100%"
        ariaLabel="Incident and hotspot map"
        onReady={onReady}
        onViewportChange={onViewportChange}
      >
        <IncidentMarkers
          features={features}
          colorMode={colorMode}
          mutedIds={showHotspots ? noiseIds : undefined}
          detailsHref={(feature) => `/admin/incidents/${feature.properties.id}`}
        />
        {showHotspots && (
          <HotspotLayer
            clusters={clusters}
            noiseIds={noiseIds}
            features={features}
            selectedClusterId={selectedClusterId}
            onClusterClick={onClusterSelect}
          />
        )}
      </MapCanvas>
      <div className="pointer-events-none absolute bottom-6 left-3 z-[400] max-w-[60%]">
        <Legend mode={colorMode} className="pointer-events-auto max-h-56 overflow-y-auto" />
      </div>
    </div>
  );
}
