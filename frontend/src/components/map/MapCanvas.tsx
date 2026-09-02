import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { LatLngBoundsExpression, LeafletMouseEvent, Map as LeafletMap } from "leaflet";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { config } from "@/config";
import { useMeta } from "@/meta/useMeta";
import type { BBox } from "@/types/api";
import { cn } from "@/utils/cn";
import { roundCoordinate } from "@/utils/format";

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface MapViewport {
  /** `[minLng, minLat, maxLng, maxLat]`, ready for the `bbox` query parameter. */
  bbox: BBox;
  zoom: number;
  center: LatLng;
}

export interface MapCanvasProps {
  /** Initial centre; defaults to the API map defaults (GET /api/meta/enums). */
  center?: LatLng;
  zoom?: number;
  /** Fit these bounds on mount instead of `center` / `zoom`. */
  bounds?: LatLngBoundsExpression;
  /** CSS height of the map (default 420px). Use "100%" inside a sized flex parent. */
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  /** false renders a static map: no dragging, zooming or keyboard handling. */
  interactive?: boolean;
  zoomControl?: boolean;
  scrollWheelZoom?: boolean;
  /** Invert and tint the OpenStreetMap tiles to match the dark theme (default true). */
  darkTiles?: boolean;
  /** Draw paths on a canvas (faster with thousands of CircleMarkers). Default true. */
  preferCanvas?: boolean;
  minZoom?: number;
  maxZoom?: number;
  /** Fired after every pan or zoom with the new viewport. */
  onViewportChange?: (viewport: MapViewport) => void;
  /** Fired once with the Leaflet map instance (fly to a cluster, fit bounds, ...). */
  onReady?: (map: LeafletMap) => void;
  /** Fired on a click on the base map (coordinates rounded to 5 decimals). */
  onClick?: (position: LatLng) => void;
  /** Accessible name of the map region. */
  ariaLabel?: string;
  children?: ReactNode;
}

function viewportOf(map: LeafletMap): MapViewport {
  const b = map.getBounds();
  const c = map.getCenter();
  return {
    bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
    zoom: map.getZoom(),
    center: { latitude: c.lat, longitude: c.lng },
  };
}

/** Leaflet only measures its container once; re-measure on mount and whenever the container resizes. */
function SizeWatcher() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function MapEvents({ onViewportChange, onClick }: Pick<MapCanvasProps, "onViewportChange" | "onClick">) {
  const map = useMapEvents({
    moveend: () => onViewportChange?.(viewportOf(map)),
    click: (event: LeafletMouseEvent) => {
      if (!onClick) return;
      const point = event.latlng.wrap();
      onClick({ latitude: roundCoordinate(point.lat), longitude: roundCoordinate(point.lng) });
    },
  });
  return null;
}

function ReadyCallback({ onReady }: Pick<MapCanvasProps, "onReady">) {
  const map = useMap();
  const called = useRef(false);
  useEffect(() => {
    if (called.current) return;
    called.current = true;
    onReady?.(map);
  }, [map, onReady]);
  return null;
}

/**
 * MapContainer + OpenStreetMap tiles with the project attribution, default view from
 * MetaContext, size invalidation on mount and resize. Everything else (markers, layers,
 * pickers) is passed as children.
 */
export function MapCanvas({
  center,
  zoom,
  bounds,
  height = 420,
  className,
  style,
  interactive = true,
  zoomControl,
  scrollWheelZoom,
  darkTiles = true,
  preferCanvas = true,
  minZoom = 3,
  maxZoom = 19,
  onViewportChange,
  onReady,
  onClick,
  ariaLabel = "Map",
  children,
}: MapCanvasProps) {
  const { enums } = useMeta();
  const view = center ?? enums.map.center;
  const initialZoom = zoom ?? enums.map.zoom;

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={cn(
        "relative w-full overflow-hidden rounded-card border border-navy-600 bg-navy-900",
        className,
      )}
      style={{ height, ...style }}
    >
      <MapContainer
        center={[view.latitude, view.longitude]}
        zoom={initialZoom}
        bounds={bounds}
        minZoom={minZoom}
        maxZoom={maxZoom}
        preferCanvas={preferCanvas}
        zoomControl={zoomControl ?? interactive}
        scrollWheelZoom={interactive && (scrollWheelZoom ?? true)}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
        attributionControl
        className={cn("h-full w-full", darkTiles && "map-dark-tiles")}
      >
        <TileLayer url={config.tileUrl} attribution={config.tileAttribution} maxZoom={maxZoom} />
        <SizeWatcher />
        {(onViewportChange || onClick) && <MapEvents onViewportChange={onViewportChange} onClick={onClick} />}
        {onReady && <ReadyCallback onReady={onReady} />}
        {children}
      </MapContainer>
    </div>
  );
}
