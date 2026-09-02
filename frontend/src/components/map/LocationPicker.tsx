import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DragEndEvent, Marker as LeafletMarker } from "leaflet";
import { LocateFixed, X } from "lucide-react";
import { Marker, useMap } from "react-leaflet";
import { Button } from "@/components/ui/Button";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { useMeta } from "@/meta/useMeta";
import { cn } from "@/utils/cn";
import { roundCoordinate } from "@/utils/format";
import { CoordinateInputs } from "./CoordinateInputs";
import { MapCanvas, type LatLng } from "./MapCanvas";
import { PIN_ICON } from "./pinIcon";

export type LocationSource = "map" | "drag" | "geolocation" | "input";

export interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (position: LatLng | null, source: LocationSource) => void;
  /** Receives the reverse-geocoded address (or null when none was found) after each lookup. */
  onAddressSuggestion?: (address: string | null) => void;
  /** Look the address up through VITE_GEOCODE_URL (default true). */
  geocode?: boolean;
  height?: number | string;
  disabled?: boolean;
  /** Form error for the coordinates (shown under the inputs). */
  error?: ReactNode;
  idPrefix?: string;
  className?: string;
}

const PLACED_ZOOM = 15;
const toText = (value: number | null) => (value === null ? "" : String(value));

/** Keeps the map view on the marker when the position arrives from geolocation or typed input. */
function FollowPosition({ position }: { position: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    const target: [number, number] = [position.latitude, position.longitude];
    if (!map.getBounds().contains(target))
      map.flyTo(target, Math.max(map.getZoom(), PLACED_ZOOM), { duration: 0.6 });
    else if (map.getZoom() < PLACED_ZOOM - 2) map.flyTo(target, PLACED_ZOOM, { duration: 0.6 });
  }, [map, position]);
  return null;
}

/**
 * Click-to-place draggable marker, "Use my location" with a permission-denied fallback,
 * coordinate inputs kept in sync both ways and reverse geocoding (debounced, cached).
 * Controlled: the form owns latitude / longitude.
 */
export function LocationPicker({
  latitude,
  longitude,
  onChange,
  onAddressSuggestion,
  geocode = true,
  height = 320,
  disabled = false,
  error,
  idPrefix = "location",
  className,
}: LocationPickerProps) {
  const { enums } = useMeta();
  const position = useMemo<LatLng | null>(
    () => (latitude !== null && longitude !== null ? { latitude, longitude } : null),
    [latitude, longitude],
  );

  // Latest callbacks (so effects below never re-run because a parent passed a new arrow function).
  const onChangeRef = useRef(onChange);
  const onAddressRef = useRef(onAddressSuggestion);
  useEffect(() => {
    onChangeRef.current = onChange;
    onAddressRef.current = onAddressSuggestion;
  });

  // Text inputs mirror the props; re-sync when the props change (map click, drag, geolocation).
  const [synced, setSynced] = useState({ latitude, longitude });
  const [latText, setLatText] = useState(toText(latitude));
  const [lngText, setLngText] = useState(toText(longitude));
  if (synced.latitude !== latitude || synced.longitude !== longitude) {
    setSynced({ latitude, longitude });
    setLatText(toText(latitude));
    setLngText(toText(longitude));
  }

  const commitInputs = () => {
    if (latText.trim() === "" && lngText.trim() === "") {
      if (position) onChange(null, "input");
      return;
    }
    const lat = Number(latText);
    const lng = Number(lngText);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
    const next = { latitude: roundCoordinate(lat), longitude: roundCoordinate(lng) };
    if (next.latitude !== latitude || next.longitude !== longitude) onChange(next, "input");
  };

  const geo = useGeolocation();
  useEffect(() => {
    if (geo.position)
      onChangeRef.current(
        { latitude: geo.position.latitude, longitude: geo.position.longitude },
        "geolocation",
      );
  }, [geo.position]);

  const lookup = useReverseGeocode(latitude, longitude, { enabled: geocode && position !== null });
  useEffect(() => {
    if (lookup.status === "success" || lookup.status === "empty") onAddressRef.current?.(lookup.address);
  }, [lookup.status, lookup.address]);

  const geocodeMessage =
    lookup.status === "loading"
      ? "Looking up the address for this point…"
      : lookup.status === "empty"
        ? "No address was found for this point; you can type it yourself."
        : lookup.status === "error"
          ? "Address lookup is unavailable right now; you can type the address yourself."
          : null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          Click the map to place the marker, drag it to adjust, or type the coordinates.
        </p>
        <div className="flex items-center gap-2">
          {position && (
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(null, "input")}
              leftIcon={<X className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Clear
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled || !geo.supported}
            loading={geo.isLocating}
            loadingText="Locating…"
            onClick={geo.request}
            leftIcon={<LocateFixed className="h-4 w-4" aria-hidden="true" />}
          >
            Use my location
          </Button>
        </div>
      </div>

      <MapCanvas
        height={height}
        center={position ?? enums.map.center}
        zoom={position ? PLACED_ZOOM : enums.map.zoom}
        interactive={!disabled}
        onClick={disabled ? undefined : (point) => onChange(point, "map")}
        ariaLabel="Location picker map"
      >
        <FollowPosition position={position} />
        {position && (
          <Marker
            position={[position.latitude, position.longitude]}
            icon={PIN_ICON}
            draggable={!disabled}
            keyboard
            eventHandlers={{
              dragend: (event: DragEndEvent) => {
                const point = (event.target as LeafletMarker).getLatLng().wrap();
                onChange(
                  { latitude: roundCoordinate(point.lat), longitude: roundCoordinate(point.lng) },
                  "drag",
                );
              },
            }}
          />
        )}
      </MapCanvas>

      <CoordinateInputs
        idPrefix={idPrefix}
        latitudeText={latText}
        longitudeText={lngText}
        onLatitudeChange={setLatText}
        onLongitudeChange={setLngText}
        onCommit={commitInputs}
        disabled={disabled}
        error={error}
      />

      <div role="status" aria-live="polite" className="min-h-4 text-xs text-muted">
        {geo.error ? <span className="text-amber-300">{geo.error}</span> : geocodeMessage}
      </div>
    </div>
  );
}
