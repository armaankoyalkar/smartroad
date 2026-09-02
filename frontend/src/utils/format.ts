import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import type { Granularity } from "@/types/api";

export const EM_DASH = "—";

/** Parse an ISO string (or pass a Date through). Returns null for anything invalid. */
export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : parseISO(value);
  return isValid(date) ? date : null;
}

/** `12 Sep 2026`. */
export function formatDate(value: string | Date | null | undefined, pattern = "d MMM yyyy"): string {
  const date = parseDate(value);
  return date ? format(date, pattern) : EM_DASH;
}

/** `12 Sep 2026, 14:05`. */
export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, "d MMM yyyy, HH:mm");
}

/** `3 hours ago`, `in 2 days`. */
export function formatRelative(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  return date ? formatDistanceToNowStrict(date, { addSuffix: true }) : EM_DASH;
}

/** Timeline period labels: day/week `YYYY-MM-DD` and month `YYYY-MM`. */
export function formatPeriod(period: string, granularity: Granularity): string {
  if (granularity === "month") {
    const date = parseDate(`${period}-01`);
    return date ? format(date, "MMM yyyy") : period;
  }
  const date = parseDate(period);
  if (!date) return period;
  return granularity === "week" ? `Week of ${format(date, "d MMM")}` : format(date, "d MMM");
}

/** Value for `<input type="date">`. */
export function toDateInputValue(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  return date ? format(date, "yyyy-MM-dd") : "";
}

/** Round a coordinate to 5 decimals (about 1 m). */
export function roundCoordinate(value: number, decimals = 5): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatCoordinate(value: number | null | undefined, decimals = 5): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(decimals) : EM_DASH;
}

/** `17.44830, 78.38140`. */
export function formatLatLng(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string {
  if (typeof latitude !== "number" || typeof longitude !== "number") return EM_DASH;
  return `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`;
}

export function formatNumber(
  value: number | null | undefined,
  options: Intl.NumberFormatOptions = {},
  locale = "en-US",
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return EM_DASH;
  return new Intl.NumberFormat(locale, options).format(value);
}

/** `0.523` -> `52.3%`. */
export function formatPercent(fraction: number | null | undefined, digits = 1): string {
  if (typeof fraction !== "number" || !Number.isFinite(fraction)) return EM_DASH;
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Fixed-decimal metric such as accuracy or F1 (`0.8123` -> `0.812`). */
export function formatMetric(value: number | null | undefined, digits = 3): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return EM_DASH;
  return value.toFixed(digits);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return EM_DASH;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

/** `140 m`, `1.2 km`. */
export function formatMeters(meters: number | null | undefined): string {
  if (typeof meters !== "number" || !Number.isFinite(meters)) return EM_DASH;
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function truncate(text: string | null | undefined, max = 80): string {
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

/** Two-letter initials for avatars. */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}
