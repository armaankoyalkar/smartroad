import { type Types } from "mongoose";
import { CATEGORY_KEYS } from "../../config/categories.js";
import { PRIORITIES, ROLES, SEVERITIES, STATUSES, type Status } from "../../config/enums.js";
import { HYDERABAD_BBOX, toPoint } from "../../lib/geo.js";
import { Incident, type IncidentDocument } from "../../models/Incident.js";
import { User, type UserDocument } from "../../models/User.js";
import { applyPriorityChange, applyStatusChange } from "../../services/incidentStatus.service.js";

/**
 * Seed building blocks, shared by the CLI script and the tests. Everything
 * here is idempotent: running it twice leaves one admin, the same demo
 * citizens and a fresh copy of the seed incidents. Every incident created
 * here carries source: "seed" so the UI can label it as demo data.
 */

export const DEMO_CITIZENS = Object.freeze([
  { name: "Demo Citizen One", email: "citizen1@smartroad.demo" },
  { name: "Demo Citizen Two", email: "citizen2@smartroad.demo" },
  { name: "Demo Citizen Three", email: "citizen3@smartroad.demo" },
]);

export interface AdminSeed {
  name: string;
  email: string | undefined;
  password: string | undefined;
}

/** Create or update the first administrator from the environment. */
export async function seedAdmin({ name, email, password }: AdminSeed): Promise<UserDocument> {
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env");
  }
  const passwordHash = await User.hashPassword(password);
  const admin = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { $set: { name, passwordHash, role: ROLES.ADMIN, isActive: true } },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
  );
  if (!admin) throw new Error("Upsert returned no administrator document");
  return admin;
}

/** Create the demo citizen accounts (shared password) if they do not exist. */
export async function seedDemoCitizens(password: string): Promise<UserDocument[]> {
  const passwordHash = await User.hashPassword(password);
  const users: UserDocument[] = [];
  for (const citizen of DEMO_CITIZENS) {
    const user = await User.findOneAndUpdate(
      { email: citizen.email },
      { $set: { name: citizen.name, passwordHash, role: ROLES.CITIZEN, isActive: true } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    );
    if (user) users.push(user);
  }
  return users;
}

/** Remove every incident marked as seed data. User-reported incidents are never touched. */
export async function clearSeedIncidents(): Promise<number> {
  const result = await Incident.deleteMany({ source: "seed" });
  return result.deletedCount ?? 0;
}

/**
 * Deterministic pseudo-random generator so a load run can be reproduced.
 * (mulberry32; good enough for spreading demo points on a map.)
 */
export function makeRandom(seed = 42): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(random: () => number, list: readonly T[]): T =>
  list[Math.floor(random() * list.length)] as T;

export interface RandomIncidentOptions {
  seed?: number;
  adminId?: Types.ObjectId | string | null;
}

/**
 * Generate `count` random seed incidents inside the Hyderabad bounding box
 * for performance checks. A third of the points are placed within about
 * 150 m of a handful of centres so DBSCAN has clusters to find; the rest are
 * spread uniformly.
 */
export function buildRandomIncidents(
  count: number,
  reporterIds: readonly (Types.ObjectId | string)[],
  { seed = 42, adminId = null }: RandomIncidentOptions = {},
): IncidentDocument[] {
  const random = makeRandom(seed);
  const centres = Array.from({ length: 6 }, () => ({
    lat: HYDERABAD_BBOX.minLat + random() * (HYDERABAD_BBOX.maxLat - HYDERABAD_BBOX.minLat),
    lng: HYDERABAD_BBOX.minLng + random() * (HYDERABAD_BBOX.maxLng - HYDERABAD_BBOX.minLng),
  }));
  const now = Date.now();
  const docs: IncidentDocument[] = [];

  for (let i = 0; i < count; i += 1) {
    let lat: number;
    let lng: number;
    if (i % 3 === 0) {
      const c = pick(random, centres);
      // ~0.0014 degrees is roughly 150 m
      lat = c.lat + (random() - 0.5) * 0.0028;
      lng = c.lng + (random() - 0.5) * 0.0028;
    } else {
      lat = HYDERABAD_BBOX.minLat + random() * (HYDERABAD_BBOX.maxLat - HYDERABAD_BBOX.minLat);
      lng = HYDERABAD_BBOX.minLng + random() * (HYDERABAD_BBOX.maxLng - HYDERABAD_BBOX.minLng);
    }
    const category = pick(random, CATEGORY_KEYS);
    const createdAt = new Date(now - Math.floor(random() * 180) * 86400000 - Math.floor(random() * 86400000));

    const incident = new Incident({
      title: `Load test ${category.toLowerCase().replaceAll("_", " ")} #${i + 1}`,
      description: `Generated seed incident number ${i + 1} for performance checks. Not a real report.`,
      category,
      severity: pick(random, SEVERITIES),
      location: toPoint(Number(lat.toFixed(6)), Number(lng.toFixed(6))),
      address: "Hyderabad (generated location)",
      reportedBy: pick(random, reporterIds),
      source: "seed",
      createdAt,
      updatedAt: createdAt,
    });
    // The initial SUBMITTED entry is normally added by the pre-validate hook,
    // but the lifecycle walk below appends entries before validation runs.
    incident.statusHistory.push({
      field: "status",
      from: null,
      to: "SUBMITTED",
      note: null,
      changedBy: null,
      at: createdAt,
    });

    // Walk some incidents through the lifecycle so every status is represented.
    const target = pick(random, STATUSES);
    walkTo(incident, target, adminId, createdAt);
    if (random() < 0.6 && incident.status !== "SUBMITTED") {
      applyPriorityChange(incident, { priority: pick(random, PRIORITIES), adminId });
    }
    docs.push(incident);
  }
  return docs;
}

/** The status sequence that leads from SUBMITTED to each target status. */
export const LIFECYCLE_PATHS: Readonly<Record<Status, readonly Status[]>> = {
  SUBMITTED: [],
  UNDER_REVIEW: ["UNDER_REVIEW"],
  VERIFIED: ["UNDER_REVIEW", "VERIFIED"],
  IN_PROGRESS: ["UNDER_REVIEW", "VERIFIED", "IN_PROGRESS"],
  RESOLVED: ["UNDER_REVIEW", "VERIFIED", "IN_PROGRESS", "RESOLVED"],
  REJECTED: ["UNDER_REVIEW", "REJECTED"],
};

/**
 * Move a fresh incident through the lifecycle to `target` with the seed
 * admin as actor, one hour per step after `createdAt`. Shared with the
 * curated demo set (seedIncidents.ts).
 */
export function walkTo(
  incident: IncidentDocument,
  target: Status,
  adminId: Types.ObjectId | string | null,
  createdAt: Date,
  rejectionNote = "Seed data: rejected as a duplicate report.",
): void {
  let step = 1;
  for (const status of LIFECYCLE_PATHS[target]) {
    applyStatusChange(incident, {
      status,
      note: status === "REJECTED" ? rejectionNote : null,
      adminId,
    });
    const entry = incident.statusHistory[incident.statusHistory.length - 1];
    if (entry) entry.at = new Date(createdAt.getTime() + step * 3600000);
    step += 1;
  }
}

export async function insertRandomIncidents(
  count: number,
  reporterIds: readonly (Types.ObjectId | string)[],
  options?: RandomIncidentOptions,
): Promise<number> {
  const docs = buildRandomIncidents(count, reporterIds, options);
  // validateBeforeSave keeps the pre-validate hook (initial history entry);
  // timestamps are preserved because they are set explicitly on the documents.
  await Incident.insertMany(docs, { ordered: true });
  return docs.length;
}
