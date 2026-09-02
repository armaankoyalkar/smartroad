import { CircleMarker } from "react-leaflet";
import { BRAND } from "@/constants/colors";
import { MapCanvas } from "./MapCanvas";

export interface MiniMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  height?: number | string;
  /** Marker fill (a category colour from MetaContext, for example). Default accent cyan. */
  color?: string;
  /** Accessible name (default "Incident location"). */
  label?: string;
  /** Allow panning and zooming (default false). */
  interactive?: boolean;
  className?: string;
}

/** Single-marker map for details pages and previews. Non-interactive by default. */
export function MiniMap({
  latitude,
  longitude,
  zoom = 15,
  height = 220,
  color = BRAND.accent,
  label = "Incident location",
  interactive = false,
  className,
}: MiniMapProps) {
  return (
    <MapCanvas
      center={{ latitude, longitude }}
      zoom={zoom}
      height={height}
      interactive={interactive}
      zoomControl={interactive}
      ariaLabel={label}
      className={className}
    >
      <CircleMarker
        center={[latitude, longitude]}
        radius={9}
        pathOptions={{ color: BRAND.text, weight: 2, fillColor: color, fillOpacity: 0.9 }}
      />
    </MapCanvas>
  );
}
