/**
 * Client-side hints about what the current user may do with an incident. The API enforces the
 * real rules (docs/api.md 6.6); these only decide which buttons and notices to show.
 */
import { EDITABLE_STATUSES } from "@/constants/enums";
import type { Incident, User } from "@/types/api";

type IncidentLike = Pick<Incident, "reportedBy" | "status">;
type UserLike = Pick<User, "id"> | null | undefined;

/** True when the viewer is the reporter (the API only includes `reportedBy` for the reporter and admins). */
export function isReporter(incident: Pick<Incident, "reportedBy">, user: UserLike): boolean {
  return !!user && !!incident.reportedBy && incident.reportedBy.id === user.id;
}

/** Citizens edit their own reports only while SUBMITTED. */
export function canEditIncident(incident: IncidentLike, user: UserLike): boolean {
  return isReporter(incident, user) && EDITABLE_STATUSES.includes(incident.status);
}

/** Why the edit page is unavailable, or null when editing is allowed. */
export function editBlockedReason(
  incident: IncidentLike,
  user: UserLike,
  statusLabel: string,
): string | null {
  if (!isReporter(incident, user)) return "Only the person who reported this incident can edit it.";
  if (!EDITABLE_STATUSES.includes(incident.status)) {
    return `This report is ${statusLabel.toLowerCase()} and can no longer be edited. Administrators keep its history and notes.`;
  }
  return null;
}
