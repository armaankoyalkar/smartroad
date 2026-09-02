import { useMemo } from "react";
import type { PathOptions } from "leaflet";
import { CircleMarker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useMeta } from "@/meta/useMeta";
import type { MapFeature } from "@/types/api";
import { IncidentPopup } from "./IncidentPopup";
import { featureColor, MUTED_MARKER, type ColorMode } from "./mapColors";

export interface IncidentMarkersProps {
  features: readonly MapFeature[];
  /** What the marker colour encodes (default category). */
  colorMode?: ColorMode;
  /** Group nearby markers at low zoom (default true). */
  cluster?: boolean;
  /** Clustering only switches on from this many features (default 200). */
  clusterThreshold?: number;
  /** Cluster radius in pixels (default 60). */
  clusterRadius?: number;
  /** Highlighted marker. */
  selectedId?: string | null;
  onSelect?: (feature: MapFeature) => void;
  /** Details link shown in the popup; return null/undefined for no link (anonymous visitors). */
  detailsHref?: (feature: MapFeature) => string | null | undefined;
  /** Ids drawn muted (for example DBSCAN noise points). */
  mutedIds?: ReadonlySet<string> | readonly string[];
  /** Marker radius in pixels (default 7). */
  radius?: number;
  showPopups?: boolean;
}

const SELECTED_OUTLINE = "#E6EDF7";

/**
 * One CircleMarker per GeoJSON feature (no icon images, so no asset path problems).
 * Colour by category, severity, status or risk; optional clustering; popup with badges.
 */
export function IncidentMarkers({
  features,
  colorMode = "category",
  cluster = true,
  clusterThreshold = 200,
  clusterRadius = 60,
  selectedId = null,
  onSelect,
  detailsHref,
  mutedIds,
  radius = 7,
  showPopups = true,
}: IncidentMarkersProps) {
  const meta = useMeta();
  const muted = useMemo(
    () => (mutedIds instanceof Set ? (mutedIds as ReadonlySet<string>) : new Set(mutedIds ?? [])),
    [mutedIds],
  );

  const markers = features.map((feature) => {
    const { id } = feature.properties;
    const [lng, lat] = feature.geometry.coordinates;
    const color = featureColor(feature.properties, colorMode, meta);
    const selected = id === selectedId;
    const pathOptions: PathOptions = muted.has(id)
      ? MUTED_MARKER
      : {
          color: selected ? SELECTED_OUTLINE : color,
          fillColor: color,
          fillOpacity: selected ? 0.95 : 0.8,
          weight: selected ? 3 : 1.5,
          opacity: 1,
        };
    return (
      <CircleMarker
        key={id}
        center={[lat, lng]}
        radius={selected ? radius + 3 : radius}
        pathOptions={pathOptions}
        eventHandlers={onSelect ? { click: () => onSelect(feature) } : undefined}
      >
        {showPopups && (
          <Popup maxWidth={300} closeButton>
            <IncidentPopup feature={feature} detailsHref={detailsHref?.(feature)} />
          </Popup>
        )}
      </CircleMarker>
    );
  });

  if (cluster && features.length >= clusterThreshold) {
    return (
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={clusterRadius}
        showCoverageOnHover={false}
        spiderfyOnMaxZoom
        disableClusteringAtZoom={17}
      >
        {markers}
      </MarkerClusterGroup>
    );
  }
  return <>{markers}</>;
}
