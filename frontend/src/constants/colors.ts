/**
 * Semantic colours for status, severity, priority, risk and verification.
 * Category colours are NOT here on purpose: they come from GET /api/meta/categories
 * (MetaContext) so markers, legend and charts can never disagree with the API.
 */
import type { IncidentStatus, Priority, RiskLevel, Severity, Source, VerificationState } from "./enums";

export const STATUS_COLORS: Record<IncidentStatus, string> = {
  SUBMITTED: "#94A3B8",
  UNDER_REVIEW: "#3B82F6",
  VERIFIED: "#14B8A6",
  IN_PROGRESS: "#F59E0B",
  RESOLVED: "#22C55E",
  REJECTED: "#EF4444",
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  LOW: "#22C55E",
  MEDIUM: "#F59E0B",
  HIGH: "#EF4444",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: "#22C55E",
  MEDIUM: "#F59E0B",
  HIGH: "#F97316",
  CRITICAL: "#DC2626",
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: "#22C55E",
  MEDIUM: "#F59E0B",
  HIGH: "#EF4444",
};

export const VERIFICATION_COLORS: Record<VerificationState, string> = {
  PENDING: "#F59E0B",
  VERIFIED: "#14B8A6",
  REJECTED: "#EF4444",
};

export const SOURCE_COLORS: Record<Source, string> = {
  user: "#22D3EE",
  seed: "#A78BFA",
};

/** Used for "Unassigned" priority, "No estimate" risk and any unknown key. */
export const NEUTRAL_COLOR = "#64748B";
/** Used for a category whose colour has not been loaded from the API yet. */
export const FALLBACK_CATEGORY_COLOR = "#94A3B8";

/** Brand colours reused by charts and map accents (same values as the Tailwind theme). */
export const BRAND = {
  accent: "#22D3EE",
  accentSoft: "#67E8F9",
  secondary: "#3B82F6",
  text: "#E6EDF7",
  muted: "#94A3B8",
  surface: "#111A2E",
  elevated: "#182540",
  border: "#22314F",
  background: "#070D19",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
} as const;

/** Ordered palette for chart series that have no semantic colour of their own. */
export const CHART_SERIES_COLORS = [
  "#22D3EE",
  "#3B82F6",
  "#A78BFA",
  "#F59E0B",
  "#22C55E",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];
