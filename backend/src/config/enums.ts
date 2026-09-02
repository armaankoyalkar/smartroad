/**
 * Domain vocabulary (docs/api.md section 2). These keys are stored in
 * MongoDB, sent over the API and mirrored in the frontend. Change them here
 * and nowhere else.
 */

export const ROLES = Object.freeze({ CITIZEN: "citizen", ADMIN: "admin" } as const);
export const ROLE_VALUES = Object.freeze(["citizen", "admin"] as const);
export type Role = (typeof ROLE_VALUES)[number];

export const SEVERITIES = Object.freeze(["LOW", "MEDIUM", "HIGH"] as const);
export type Severity = (typeof SEVERITIES)[number];

export const PRIORITIES = Object.freeze(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const);
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = Object.freeze([
  "SUBMITTED",
  "UNDER_REVIEW",
  "VERIFIED",
  "IN_PROGRESS",
  "RESOLVED",
  "REJECTED",
] as const);
export type Status = (typeof STATUSES)[number];

/** Derived from the status, never stored (docs/api.md section 2). */
export const VERIFICATION_STATES = Object.freeze(["PENDING", "VERIFIED", "REJECTED"] as const);
export type VerificationState = (typeof VERIFICATION_STATES)[number];

/** Output classes of the risk model. */
export const RISK_LEVELS = Object.freeze(["LOW", "MEDIUM", "HIGH"] as const);
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const SOURCES = Object.freeze(["user", "seed"] as const);
export type Source = (typeof SOURCES)[number];

export const HISTORY_FIELDS = Object.freeze(["status", "priority"] as const);
export type HistoryField = (typeof HISTORY_FIELDS)[number];

/** Allowed status transitions, enforced by the status service (docs/api.md section 2). */
export const TRANSITIONS: Readonly<Record<Status, readonly Status[]>> = Object.freeze({
  SUBMITTED: Object.freeze(["UNDER_REVIEW", "REJECTED"] as const),
  UNDER_REVIEW: Object.freeze(["VERIFIED", "REJECTED"] as const),
  VERIFIED: Object.freeze(["IN_PROGRESS", "RESOLVED", "REJECTED"] as const),
  IN_PROGRESS: Object.freeze(["RESOLVED"] as const),
  RESOLVED: Object.freeze(["IN_PROGRESS"] as const),
  REJECTED: Object.freeze(["UNDER_REVIEW"] as const),
});

/** Which statuses belong to each verification state. */
export const VERIFICATION_STATUSES: Readonly<Record<VerificationState, readonly Status[]>> = Object.freeze({
  PENDING: Object.freeze(["SUBMITTED", "UNDER_REVIEW"] as const),
  VERIFIED: Object.freeze(["VERIFIED", "IN_PROGRESS", "RESOLVED"] as const),
  REJECTED: Object.freeze(["REJECTED"] as const),
});

/** The verification state an incident is in, derived from its status. */
export function verificationOf(status: Status): VerificationState {
  if (status === "REJECTED") return "REJECTED";
  if (status === "SUBMITTED" || status === "UNDER_REVIEW") return "PENDING";
  return "VERIFIED";
}

/** Statuses that count as "open" for the high-priority dashboard figure. */
export const OPEN_STATUSES = Object.freeze(["SUBMITTED", "UNDER_REVIEW", "VERIFIED", "IN_PROGRESS"] as const);
/** pendingVerification in every analytics endpoint (docs/api.md section 7). */
export const PENDING_STATUSES = VERIFICATION_STATUSES.PENDING;
/** "active" in every analytics endpoint: verified work that is not finished. */
export const ACTIVE_STATUSES = Object.freeze(["VERIFIED", "IN_PROGRESS"] as const);

/** Rank order used when sorting by priority or severity (higher = more urgent). */
export const PRIORITY_RANK: Readonly<Record<Priority, number>> = Object.freeze({ LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 });
export const SEVERITY_RANK: Readonly<Record<Severity, number>> = Object.freeze({ LOW: 1, MEDIUM: 2, HIGH: 3 });

/** Display labels. The UI may override wording; keys never change. */
export const LABELS = Object.freeze({
  role: Object.freeze({ citizen: "Citizen", admin: "Administrator" } satisfies Record<Role, string>),
  severity: Object.freeze({ LOW: "Low", MEDIUM: "Medium", HIGH: "High" } satisfies Record<Severity, string>),
  priority: Object.freeze({ LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical" } satisfies Record<
    Priority,
    string
  >),
  status: Object.freeze({
    SUBMITTED: "Submitted",
    UNDER_REVIEW: "Under review",
    VERIFIED: "Verified",
    IN_PROGRESS: "In progress",
    RESOLVED: "Resolved",
    REJECTED: "Rejected",
  } satisfies Record<Status, string>),
  verification: Object.freeze({ PENDING: "Pending verification", VERIFIED: "Verified", REJECTED: "Rejected" } satisfies Record<
    VerificationState,
    string
  >),
  riskLevel: Object.freeze({ LOW: "Low risk", MEDIUM: "Medium risk", HIGH: "High risk" } satisfies Record<RiskLevel, string>),
  source: Object.freeze({ user: "Reported by a user", seed: "Demo data" } satisfies Record<Source, string>),
});

/** Image types accepted for incident photos. */
export const UPLOAD_MIME_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"] as const);
export type UploadMimeType = (typeof UPLOAD_MIME_TYPES)[number];

/** Type guard: is `value` one of the strings in `list`? Narrows to the list's literal type. */
export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

export const isStatus = (value: unknown): value is Status => isOneOf(STATUSES, value);
export const isPriority = (value: unknown): value is Priority => isOneOf(PRIORITIES, value);
export const isSeverity = (value: unknown): value is Severity => isOneOf(SEVERITIES, value);
export const isRiskLevel = (value: unknown): value is RiskLevel => isOneOf(RISK_LEVELS, value);
export const isRole = (value: unknown): value is Role => isOneOf(ROLE_VALUES, value);
export const isUploadMimeType = (value: unknown): value is UploadMimeType => isOneOf(UPLOAD_MIME_TYPES, value);
