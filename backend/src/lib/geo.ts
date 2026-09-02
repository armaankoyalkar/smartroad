/**
 * Coordinate helpers. GeoJSON stores [longitude, latitude]; the API exposes
 * latitude and longitude as named fields. Every conversion goes through here
 * so the order is decided in exactly one file.
 */

export const EARTH_RADIUS_M = 6371000;

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface GeoPolygon {
  type: "Polygon";
  coordinates: [number, number][][];
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export function isValidLatitude(lat: unknown): lat is number {
  return typeof lat === "number" && Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: unknown): lng is number {
  return typeof lng === "number" && Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

/** Build a GeoJSON Point from latitude and longitude (in that order). */
export function toPoint(latitude: number, longitude: number): GeoPoint {
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    throw new RangeError("Invalid coordinates");
  }
  return { type: "Point", coordinates: [longitude, latitude] };
}

/** Read latitude and longitude back from a GeoJSON Point (null for anything malformed). */
export function fromPoint(point: unknown): { latitude: number | null; longitude: number | null } {
  if (!point || typeof point !== "object") return { latitude: null, longitude: null };
  const coordinates = (point as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return { latitude: null, longitude: null };
  }
  const [longitude, latitude] = coordinates as [number, number];
  return { latitude, longitude };
}

/**
 * Parse a "minLng,minLat,maxLng,maxLat" query string. Returns null when the
 * value is malformed so the caller can raise a validation error.
 */
export function parseBbox(value: unknown): Bbox | null {
  if (typeof value !== "string") return null;
  const parts = value.split(",").map((s) => Number(s.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLng, minLat, maxLng, maxLat] = parts as [number, number, number, number];
  if (!isValidLongitude(minLng) || !isValidLongitude(maxLng)) return null;
  if (!isValidLatitude(minLat) || !isValidLatitude(maxLat)) return null;
  if (minLng >= maxLng || minLat >= maxLat) return null;
  return { minLng, minLat, maxLng, maxLat };
}

/**
 * A bounding box as a closed GeoJSON polygon, the form the 2dsphere index
 * needs for $geoWithin (the $box shorthand only works with the legacy 2d
 * index).
 */
export function bboxToPolygon({ minLng, minLat, maxLng, maxLat }: Bbox): GeoPolygon {
  return {
    type: "Polygon",
    coordinates: [
      [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ],
    ],
  };
}

/** Great-circle distance in metres between two points given as {latitude, longitude}. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

/** Rough bounding box of the Hyderabad urban area, used by the seed script. */
export const HYDERABAD_BBOX: Readonly<Bbox> = Object.freeze({
  minLat: 17.3,
  maxLat: 17.52,
  minLng: 78.3,
  maxLng: 78.6,
});
