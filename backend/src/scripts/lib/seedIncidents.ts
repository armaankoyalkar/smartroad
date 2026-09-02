import { type Types } from "mongoose";
import { toPoint } from "../../lib/geo.js";
import { Incident, type IncidentDocument } from "../../models/Incident.js";
import { applyPriorityChange } from "../../services/incidentStatus.service.js";
import { walkTo } from "./seedData.js";
import { CURATED_INCIDENTS, type CuratedIncident } from "./seedIncidentsData.js";

/**
 * Builds the curated demo set (seedIncidentsData.ts) as Incident documents:
 * every record is source "seed", its description ends with DEMO_SUFFIX, it
 * was "reported" between 1 and 179 days ago at a plausible local hour, and
 * it has been walked through the lifecycle by the seed admin so histories,
 * verifiedBy, resolvedAt and priorities look like real administration.
 */

export const DEMO_SUFFIX = " (Demo data)";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
/** The demo set describes Hyderabad, so report hours are Asia/Kolkata (UTC+05:30). */
const IST_OFFSET_MINUTES = 330;

export interface CuratedIncidentOptions {
  adminId?: Types.ObjectId | string | null;
  /** The instant "daysAgo" counts back from (defaults to the current time). */
  now?: Date;
}

/** The report instant: `daysAgo` days before `now`, at `hour` local time plus a few minutes. */
export function curatedCreatedAt(entry: CuratedIncident, now: Date, index: number): Date {
  const date = new Date(now.getTime() - entry.daysAgo * DAY_MS);
  const minutes = (index * 7) % 25;
  date.setUTCHours(0, entry.hour * 60 + minutes - IST_OFFSET_MINUTES, 0, 0);
  return date;
}

export function buildCuratedIncidents(
  reporterIds: readonly (Types.ObjectId | string)[],
  { adminId = null, now = new Date() }: CuratedIncidentOptions = {},
): IncidentDocument[] {
  if (reporterIds.length === 0) throw new Error("At least one reporter id is required");

  return CURATED_INCIDENTS.map((entry, index) => {
    const createdAt = curatedCreatedAt(entry, now, index);
    const incident = new Incident({
      title: entry.title,
      description: entry.description + DEMO_SUFFIX,
      category: entry.category,
      severity: entry.severity,
      location: toPoint(entry.latitude, entry.longitude),
      address: entry.address,
      reportedBy: reporterIds[index % reporterIds.length],
      source: "seed",
      createdAt,
      updatedAt: createdAt,
    });
    // The pre-validate hook only adds the initial entry when the history is
    // empty; the lifecycle walk below appends entries before validation runs.
    incident.statusHistory.push({
      field: "status",
      from: null,
      to: "SUBMITTED",
      note: null,
      changedBy: null,
      at: createdAt,
    });

    walkTo(
      incident,
      entry.status,
      adminId,
      createdAt,
      "Seed data: closed as a duplicate of an earlier report.",
    );
    if (entry.priority) {
      applyPriorityChange(incident, { priority: entry.priority, adminId });
      const last = incident.statusHistory[incident.statusHistory.length - 1];
      if (last) last.at = new Date(createdAt.getTime() + incident.statusHistory.length * HOUR_MS);
    }
    // The lifecycle service stamps "now" on resolution; align it with the history.
    const lastStatusEntry = [...incident.statusHistory].reverse().find((entry) => entry.field === "status");
    if (incident.status === "RESOLVED" && lastStatusEntry) incident.resolvedAt = lastStatusEntry.at;
    const lastEntry = incident.statusHistory[incident.statusHistory.length - 1];
    if (lastEntry) incident.updatedAt = lastEntry.at;
    return incident;
  });
}

/** Insert the curated set (the caller removes the previous seed incidents first). */
export async function insertCuratedIncidents(
  reporterIds: readonly (Types.ObjectId | string)[],
  options?: CuratedIncidentOptions,
): Promise<number> {
  const docs = buildCuratedIncidents(reporterIds, options);
  await Incident.insertMany(docs, { ordered: true });
  return docs.length;
}
