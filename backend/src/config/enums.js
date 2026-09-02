/**
 * Domain vocabulary. These keys are stored in MongoDB, sent over the API and
 * mirrored in the frontend (docs/01-requirements.md section 7). Change them
 * here and nowhere else.
 */

export const ROLES = Object.freeze({ CITIZEN: "citizen", ADMIN: "admin" });
export const ROLE_VALUES = Object.freeze(Object.values(ROLES));

export const SEVERITIES = Object.freeze(["LOW", "MEDIUM", "HIGH"]);
export const PRIORITIES = Object.freeze(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const STATUSES = Object.freeze([
  "REPORTED",
  "UNDER_REVIEW",
  "VERIFIED",
  "IN_PROGRESS",
  "RESOLVED",
  "REJECTED",
]);
export const SOURCES = Object.freeze(["user", "seed"]);
export const HISTORY_FIELDS = Object.freeze(["status", "priority"]);

/** Allowed status transitions, enforced by the status service (docs/01 section 8). */
export const TRANSITIONS = Object.freeze({
  REPORTED: Object.freeze(["UNDER_REVIEW", "REJECTED"]),
  UNDER_REVIEW: Object.freeze(["VERIFIED", "REJECTED"]),
  VERIFIED: Object.freeze(["IN_PROGRESS", "RESOLVED", "REJECTED"]),
  IN_PROGRESS: Object.freeze(["RESOLVED"]),
  RESOLVED: Object.freeze(["IN_PROGRESS"]),
  REJECTED: Object.freeze(["UNDER_REVIEW"]),
});

/** Statuses that count as "open" for the high-priority dashboard figure. */
export const OPEN_STATUSES = Object.freeze(["REPORTED", "UNDER_REVIEW", "VERIFIED", "IN_PROGRESS"]);

/** Rank order used when sorting by priority or severity (higher = more urgent). */
export const PRIORITY_RANK = Object.freeze({ LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 });
export const SEVERITY_RANK = Object.freeze({ LOW: 1, MEDIUM: 2, HIGH: 3 });

/** Display labels. The UI may override wording; keys never change. */
export const LABELS = Object.freeze({
  role: Object.freeze({ citizen: "Citizen", admin: "Administrator" }),
  severity: Object.freeze({ LOW: "Low", MEDIUM: "Medium", HIGH: "High" }),
  priority: Object.freeze({ LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical" }),
  status: Object.freeze({
    REPORTED: "Reported",
    UNDER_REVIEW: "Under review",
    VERIFIED: "Verified",
    IN_PROGRESS: "In progress",
    RESOLVED: "Resolved",
    REJECTED: "Rejected",
  }),
  source: Object.freeze({ user: "Reported by a user", seed: "Demo data" }),
});

/** Image types accepted for incident photos (docs/01 FR-R4). */
export const UPLOAD_MIME_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
