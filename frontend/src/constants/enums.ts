/**
 * Domain vocabulary, mirrored from docs/api.md section 2. Keys are stored in
 * MongoDB, sent over the API and used here; labels are for display only.
 * GET /api/meta/enums and /api/meta/categories are the runtime source; these
 * constants exist so TypeScript can type every value and so the app can render
 * before (or without) the meta endpoints.
 */

export const ROLES = ["citizen", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const CATEGORY_KEYS = [
  "POTHOLE",
  "ROAD_DAMAGE",
  "ACCIDENT",
  "TRAFFIC_CONGESTION",
  "TRAFFIC_SIGNAL",
  "STREET_LIGHT",
  "UNSAFE_ROAD",
  "OBSTRUCTION",
  "WATERLOGGING",
  "OTHER",
] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

/** Display labels only. Category colours are never hard-coded: they come from GET /api/meta/categories. */
export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  POTHOLE: "Pothole",
  ROAD_DAMAGE: "Road damage",
  ACCIDENT: "Accident",
  TRAFFIC_CONGESTION: "Traffic congestion",
  TRAFFIC_SIGNAL: "Broken traffic signal",
  STREET_LIGHT: "Street-light issue",
  UNSAFE_ROAD: "Unsafe road condition",
  OBSTRUCTION: "Obstruction",
  WATERLOGGING: "Waterlogging",
  OTHER: "Other",
};

export const SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "VERIFIED",
  "IN_PROGRESS",
  "RESOLVED",
  "REJECTED",
] as const;
export type IncidentStatus = (typeof STATUSES)[number];

export const VERIFICATION_STATES = ["PENDING", "VERIFIED", "REJECTED"] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const SOURCES = ["user", "seed"] as const;
export type Source = (typeof SOURCES)[number];

/** Filter-only sentinel values accepted by the list endpoints (docs/api.md 6.3). */
export const PRIORITY_UNASSIGNED = "UNASSIGNED" as const;
export const RISK_NONE = "NONE" as const;
export type PriorityFilterValue = Priority | typeof PRIORITY_UNASSIGNED;
export type RiskFilterValue = RiskLevel | typeof RISK_NONE;

/** Allowed status transitions (server-enforced; only admins change status). */
export const TRANSITIONS: Record<IncidentStatus, readonly IncidentStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["VERIFIED", "REJECTED"],
  VERIFIED: ["IN_PROGRESS", "RESOLVED", "REJECTED"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["IN_PROGRESS"],
  REJECTED: ["UNDER_REVIEW"],
};

/** Verification state is derived from status and never stored. */
export const VERIFICATION_BY_STATUS: Record<IncidentStatus, VerificationState> = {
  SUBMITTED: "PENDING",
  UNDER_REVIEW: "PENDING",
  VERIFIED: "VERIFIED",
  IN_PROGRESS: "VERIFIED",
  RESOLVED: "VERIFIED",
  REJECTED: "REJECTED",
};

/** Statuses that count as open for the high-priority dashboard figure. */
export const OPEN_STATUSES: readonly IncidentStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "VERIFIED",
  "IN_PROGRESS",
];
/** Statuses in which a citizen may still edit their own report. */
export const EDITABLE_STATUSES: readonly IncidentStatus[] = ["SUBMITTED"];

export const PRIORITY_RANK: Record<Priority, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
export const SEVERITY_RANK: Record<Severity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

export const ROLE_LABELS: Record<Role, string> = { citizen: "Citizen", admin: "Administrator" };
export const SEVERITY_LABELS: Record<Severity, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };
export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};
export const STATUS_LABELS: Record<IncidentStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  VERIFIED: "Verified",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
};
export const VERIFICATION_LABELS: Record<VerificationState, string> = {
  PENDING: "Pending verification",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};
export const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: "Low risk",
  MEDIUM: "Medium risk",
  HIGH: "High risk",
};
export const SOURCE_LABELS: Record<Source, string> = { user: "Reported by a user", seed: "Demo data" };
export const PRIORITY_UNASSIGNED_LABEL = "Unassigned";
export const RISK_NONE_LABEL = "No estimate";

/** One-line descriptions shown next to the severity choices on the report form. */
export const SEVERITY_DESCRIPTIONS: Record<Severity, string> = {
  LOW: "Minor issue, no immediate danger to road users.",
  MEDIUM: "Needs attention; could cause damage or delays.",
  HIGH: "Dangerous now; risk of injury or serious damage.",
};

/** Feature vocabulary of the shipped risk model (docs/api.md section 9). */
export const DAYS_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
export const LIGHT_CONDITIONS = ["DAYLIGHT", "DARK_LIT", "DARK_UNLIT"] as const;
export type LightCondition = (typeof LIGHT_CONDITIONS)[number];
export const WEATHER_CONDITIONS = ["CLEAR", "RAIN", "FOG", "OTHER"] as const;
export type Weather = (typeof WEATHER_CONDITIONS)[number];
export const ROAD_SURFACES = ["DRY", "WET", "FLOODED"] as const;
export type RoadSurface = (typeof ROAD_SURFACES)[number];
export const ROAD_TYPES = ["HIGHWAY", "ARTERIAL", "LOCAL", "JUNCTION"] as const;
export type RoadType = (typeof ROAD_TYPES)[number];
export const AREA_TYPES = ["URBAN", "RURAL"] as const;
export type AreaType = (typeof AREA_TYPES)[number];
export const RISK_FEATURE_NAMES = [
  "hour",
  "day_of_week",
  "month",
  "light_conditions",
  "weather",
  "road_surface",
  "road_type",
  "speed_limit",
  "area_type",
  "category",
] as const;
export type RiskFeatureName = (typeof RISK_FEATURE_NAMES)[number];

export function isIncidentStatus(value: unknown): value is IncidentStatus {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}
export function isCategoryKey(value: unknown): value is CategoryKey {
  return typeof value === "string" && (CATEGORY_KEYS as readonly string[]).includes(value);
}
export function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && (SEVERITIES as readonly string[]).includes(value);
}
export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && (PRIORITIES as readonly string[]).includes(value);
}
export function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && (RISK_LEVELS as readonly string[]).includes(value);
}

/** Statuses an incident may move to from `from` (empty when none). */
export function allowedTransitions(from: IncidentStatus): readonly IncidentStatus[] {
  return TRANSITIONS[from] ?? [];
}
export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return allowedTransitions(from).includes(to);
}
export function verificationOf(status: IncidentStatus): VerificationState {
  return VERIFICATION_BY_STATUS[status];
}
export function isOpenStatus(status: IncidentStatus): boolean {
  return OPEN_STATUSES.includes(status);
}
