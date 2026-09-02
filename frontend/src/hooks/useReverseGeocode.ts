import { useEffect, useState } from "react";
import { config } from "@/config";

export type GeocodeStatus = "idle" | "loading" | "success" | "empty" | "error";

export interface ReverseGeocodeResult {
  status: GeocodeStatus;
  address: string | null;
  error: string | null;
}

/** Results per rounded coordinate for the browser session (Nominatim asks for caching). */
const sessionCache = new Map<string, string | null>();

/** Nominatim usage policy: at most one request per second, application-wide. */
const MIN_INTERVAL_MS = 1000;
let nextSlotAt = 0;

function reserveSlot(): number {
  const now = Date.now();
  const wait = Math.max(0, nextSlotAt - now);
  nextSlotAt = Math.max(now, nextSlotAt) + MIN_INTERVAL_MS;
  return wait;
}

function coordinateKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

/** Exported for tests and for pages that want to pre-warm the cache. */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const key = coordinateKey(latitude, longitude);
  const cached = sessionCache.get(key);
  if (cached !== undefined) return cached;

  const wait = reserveSlot();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const url = new URL(config.geocodeUrl);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("accept-language", "en");

  const response = await fetch(url.toString(), { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Geocoding failed (HTTP ${response.status})`);
  const body = (await response.json()) as { display_name?: unknown; error?: unknown };
  const address =
    typeof body.display_name === "string" && body.display_name.trim() ? body.display_name.trim() : null;
  sessionCache.set(key, address);
  return address;
}

export function clearReverseGeocodeCache(): void {
  sessionCache.clear();
}

interface Settled {
  key: string;
  address: string | null;
  error: string | null;
}

/**
 * Debounced reverse geocoding for the location picker. Requests start `debounceMs` after the
 * coordinates stop changing (>= 1 s so a dragged marker never floods the service), results are
 * cached for the session and any failure degrades to "type the address yourself".
 */
export function useReverseGeocode(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  options: { enabled?: boolean; debounceMs?: number } = {},
): ReverseGeocodeResult {
  const { enabled = true } = options;
  const debounceMs = Math.max(MIN_INTERVAL_MS, options.debounceMs ?? MIN_INTERVAL_MS);
  const valid =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  const key = valid ? coordinateKey(latitude, longitude) : null;
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    if (!enabled || !valid || key === null || sessionCache.has(key)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      reverseGeocode(latitude, longitude, controller.signal)
        .then((address) => setSettled({ key, address, error: null }))
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setSettled({
            key,
            address: null,
            error: err instanceof Error ? err.message : "Address lookup failed",
          });
        });
    }, debounceMs);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, valid, key, latitude, longitude, debounceMs]);

  if (!enabled || key === null) return { status: "idle", address: null, error: null };

  const cached = sessionCache.get(key);
  if (cached !== undefined) return { status: cached ? "success" : "empty", address: cached, error: null };

  if (settled && settled.key === key) {
    if (settled.error) return { status: "error", address: null, error: settled.error };
    return { status: settled.address ? "success" : "empty", address: settled.address, error: null };
  }

  return { status: "loading", address: null, error: null };
}
