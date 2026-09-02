import { PRIORITIES, STATUSES, TRANSITIONS } from "../config/enums.js";
import { AppError } from "../lib/errors.js";

/**
 * Incident lifecycle rules (docs/01-requirements.md section 8). These
 * functions mutate a Mongoose document (or a plain object with the same
 * shape) and never touch the database themselves, so the rules can be unit
 * tested without MongoDB. The caller saves the document.
 */

export function canTransition(from, to) {
  return Boolean(TRANSITIONS[from]?.includes(to));
}

export function allowedTransitions(from) {
  return [...(TRANSITIONS[from] ?? [])];
}

function idOf(value) {
  if (value == null) return null;
  return value._id ?? value.id ?? value;
}

/**
 * Apply a status change with its side effects:
 * history entry, verifiedBy on first VERIFIED, resolvedAt set or cleared,
 * adminNote replaced by the note or cleared on reconsideration.
 */
export function applyStatusChange(incident, { status, note = null, adminId }) {
  if (!STATUSES.includes(status)) {
    throw AppError.validation([{ field: "status", message: `Must be one of ${STATUSES.join(", ")}` }]);
  }
  const from = incident.status;
  if (!canTransition(from, status)) {
    throw new AppError("INVALID_TRANSITION", `Cannot move an incident from ${from} to ${status}.`, [
      { from, to: status, allowed: allowedTransitions(from) },
    ]);
  }
  const cleanNote = typeof note === "string" && note.trim() ? note.trim() : null;
  if (status === "REJECTED" && !cleanNote) {
    throw new AppError("NOTE_REQUIRED", "A reason is required when rejecting an incident.");
  }

  incident.status = status;
  incident.statusHistory.push({ field: "status", from, to: status, note: cleanNote, changedBy: idOf(adminId), at: new Date() });

  if (status === "VERIFIED" && !incident.verifiedBy) {
    incident.verifiedBy = idOf(adminId);
  }
  if (status === "RESOLVED") {
    incident.resolvedAt = new Date();
  } else if (from === "RESOLVED") {
    incident.resolvedAt = null;
  }
  if (cleanNote) {
    incident.adminNote = cleanNote;
  } else if (from === "REJECTED" && status === "UNDER_REVIEW") {
    // Reconsidering: the rejection reason stays in the history only.
    incident.adminNote = null;
  }
  return incident;
}

/** Set or clear the priority, recording the change in the history. */
export function applyPriorityChange(incident, { priority, note = null, adminId }) {
  if (priority !== null && !PRIORITIES.includes(priority)) {
    throw AppError.validation([{ field: "priority", message: `Must be one of ${PRIORITIES.join(", ")} or null` }]);
  }
  const from = incident.priority ?? null;
  const cleanNote = typeof note === "string" && note.trim() ? note.trim() : null;
  incident.priority = priority;
  incident.statusHistory.push({
    field: "priority",
    from,
    to: priority === null ? "UNASSIGNED" : priority,
    note: cleanNote,
    changedBy: idOf(adminId),
    at: new Date(),
  });
  if (cleanNote) incident.adminNote = cleanNote;
  return incident;
}
