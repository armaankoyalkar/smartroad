import { useCallback, useEffect, useRef, useState } from "react";
import { roundCoordinate } from "@/utils/format";

export type GeolocationStatus = "idle" | "locating" | "success" | "denied" | "unavailable" | "error";

export interface GeoPosition {
  latitude: number;
  longitude: number;
  /** Metres, as reported by the browser. */
  accuracy: number | null;
}

export interface GeolocationState {
  status: GeolocationStatus;
  position: GeoPosition | null;
  error: string | null;
}

const IDLE: GeolocationState = { status: "idle", position: null, error: null };

/**
 * Wraps `navigator.geolocation.getCurrentPosition`. Nothing runs until `request()` is called,
 * so the browser never asks for permission before the user clicks "Use my location".
 * A denied permission is a normal outcome (status "denied") that the UI handles with a map click.
 */
export function useGeolocation(options: PositionOptions = {}) {
  const [state, setState] = useState<GeolocationState>(IDLE);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;

  const request = useCallback(() => {
    if (!supported) {
      setState({
        status: "unavailable",
        position: null,
        error: "Location is not available in this browser.",
      });
      return;
    }
    setState((s) => ({ ...s, status: "locating", error: null }));
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setState({
          status: "success",
          position: {
            latitude: roundCoordinate(result.coords.latitude),
            longitude: roundCoordinate(result.coords.longitude),
            accuracy: Number.isFinite(result.coords.accuracy) ? Math.round(result.coords.accuracy) : null,
          },
          error: null,
        });
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        const unavailable = err.code === err.POSITION_UNAVAILABLE;
        setState({
          status: denied ? "denied" : unavailable ? "unavailable" : "error",
          position: null,
          error: denied
            ? "Location permission was denied. Click the map to place the marker instead."
            : unavailable
              ? "Your position could not be determined. Click the map to place the marker instead."
              : "Finding your location took too long. Click the map to place the marker instead.",
        });
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000, ...optionsRef.current },
    );
  }, [supported]);

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, supported, request, reset, isLocating: state.status === "locating" };
}
