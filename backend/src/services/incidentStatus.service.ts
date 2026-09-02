import { type Types } from "mongoose";
import {
  isPriority,
  isStatus,
  PRIORITIES,
  STATUSES,
  TRANSITIONS,
  type HistoryField,
  type Priority,
  type Status,
} from "../config/enums.js";
import { AppError } from "../lib/errors.js";

/**
 * Incident lifecycle rules (docs/api.md section 2). These functions mutate a
 * Mongoose document (or a plain object with the same shape) and never touch
 * the database themselves, so the rules can be unit tested without MongoDB.
 * The caller saves the document.
 */

/** Anything that identifies the acting admin: an id, a string, or a user-like object. */
export type AdminRef = Types.ObjectId | string | { _id?: Types.ObjectId | string; id?: string } | null | undefined;

export type UserId = Types.ObjectId | string | null;

export interface LifecycleHistoryEntry {
  field: HistoryField;
  from: string | null;
  to: string;
  note: string | null;
  changedBy: UserId;
  at: Date;
}

/** The subset of an incident the lifecycle rules read and write. */
export interface LifecycleIncident {
  status: Status;
  priority: Priority | null;
  verifiedBy: UserId;
  resolvedAt: Date | null;
  adminNote: string | null;
  statusHistory: LifecycleHistoryEntry[];
}

export interface StatusChange {
  status: Status | string;
  note?: string | null;
  adminId: AdminRef;
}

export interface PriorityChange {
  priority: Priority | string | null;
  note?: string | null;
  adminId: AdminRef;
}

export function canTransition(from: string, to: string): boolean {
  if (!isStatus(from)) return false;
  return (TRANSITIONS[from] as readonly string[]).includes(to);
}

export function allowedTransitions(from: string): Status[] {
  return isStatus(from) ? [...TRANSITIONS[from]] : [];
}

function idOf(value: AdminRef): UserId {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in value && value._id != null) return value._id;
  if (typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return value as Types.ObjectId;
}

function cleanNoteOf(note: string | null | undefined): string | null {
  return typeof note === "string" && note.trim() ? note.trim() : null;
}

/**
 * Apply a status change with its side effects:
 * history entry, verifiedBy on first VERIFIED, resolvedAt set or cleared,
 * adminNote replaced by the note or cleared on reconsideration.
 */
export function applyStatusChange<T extends LifecycleIncident>(incident: T, { status, note = null, adminId }: StatusChange): T {
  if (!isStatus(status)) {
    throw AppError.validation([{ field: "status", message: `Must be one of ${STATUSES.join(", ")}` }]);
  }
  const from = incident.status;
  if (!canTransition(from, status)) {
    throw new AppError("INVALID_TRANSITION", `Cannot move an incident from ${from} to ${status}.`, [
      { from, to: status, allowed: allowedTransitions(from) },
    ]);
  }
  const cleanNote = cleanNoteOf(note);
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
export function applyPriorityChange<T extends LifecycleIncident>(
  incident: T,
  { priority, note = null, adminId }: PriorityChange,
): T {
  if (priority !== null && !isPriority(priority)) {
    throw AppError.validation([{ field: "priority", message: `Must be one of ${PRIORITIES.join(", ")} or null` }]);
  }
  const from = incident.priority ?? null;
  const cleanNote = cleanNoteOf(note);
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
