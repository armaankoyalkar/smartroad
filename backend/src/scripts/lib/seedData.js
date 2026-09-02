import { CATEGORY_KEYS } from "../../config/categories.js";
import { PRIORITIES, ROLES, SEVERITIES, STATUSES } from "../../config/enums.js";
import { HYDERABAD_BBOX, toPoint } from "../../lib/geo.js";
import { Incident } from "../../models/Incident.js";
import { User } from "../../models/User.js";
import { applyPriorityChange, applyStatusChange } from "../../services/incidentStatus.service.js";

/**
 * Seed building blocks, shared by the CLI script and the tests. Everything
 * here is idempotent: running it twice leaves one admin, the same demo
 * citizens and a fresh copy of the seed incidents.
 */

export const DEMO_CITIZENS = Object.freeze([
  { name: "Demo Citizen One", email: "citizen1@smartroad.demo" },
  { name: "Demo Citizen Two", email: "citizen2@smartroad.demo" },
  { name: "Demo Citizen Three", email: "citizen3@smartroad.demo" },
]);

/** Create or update the first administrator from the environment. */
export async function seedAdmin({ name, email, password }) {
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env");
  }
  const passwordHash = await User.hashPassword(password);
  const admin = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { $set: { name, passwordHash, role: ROLES.ADMIN, isActive: true } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return admin;
}

/** Create the demo citizen accounts (shared password) if they do not exist. */
export async function seedDemoCitizens(password) {
  const passwordHash = await User.hashPassword(password);
  const users = [];
  for (const citizen of DEMO_CITIZENS) {
    const user = await User.findOneAndUpdate(
      { email: citizen.email },
      { $set: { name: citizen.name, passwordHash, role: ROLES.CITIZEN, isActive: true } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    users.push(user);
  }
  return users;
}

/** Remove every incident marked as seed data. User-reported incidents are never touched. */
export async function clearSeedIncidents() {
  const result = await Incident.deleteMany({ source: "seed" });
  return result.deletedCount ?? 0;
}

/**
 * Deterministic pseudo-random generator so a load run can be reproduced.
 * (mulberry32; good enough for spreading demo points on a map.)
 */
export function makeRandom(seed = 42) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (random, list) => list[Math.floor(random() * list.length)];

/**
 * Generate `count` random seed incidents inside the Hyderabad bounding box
 * for performance checks (docs/03 section 7). A third of the points are
 * placed within about 150 m of a handful of centres so DBSCAN has clusters
 * to find; the rest are spread uniformly.
 */
export function buildRandomIncidents(count, reporterIds, { seed = 42, adminId = null } = {}) {
  const random = makeRandom(seed);
  const centres = Array.from({ length: 6 }, () => ({
    lat: HYDERABAD_BBOX.minLat + random() * (HYDERABAD_BBOX.maxLat - HYDERABAD_BBOX.minLat),
    lng: HYDERABAD_BBOX.minLng + random() * (HYDERABAD_BBOX.maxLng - HYDERABAD_BBOX.minLng),
  }));
  const now = Date.now();
  const docs = [];

  for (let i = 0; i < count; i += 1) {
    let lat;
    let lng;
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
      title: `Load test ${category.toLowerCase().replace("_", " ")} #${i + 1}`,
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
    // The initial REPORTED entry is normally added by the pre-validate hook,
    // but the lifecycle walk below appends entries before validation runs.
    incident.statusHistory.push({ field: "status", from: null, to: "REPORTED", note: null, changedBy: null, at: createdAt });

    // Walk some incidents through the lifecycle so every status is represented.
    const target = pick(random, STATUSES);
    walkTo(incident, target, adminId, createdAt);
    if (random() < 0.6 && incident.status !== "REPORTED") {
      applyPriorityChange(incident, { priority: pick(random, PRIORITIES), adminId });
    }
    docs.push(incident);
  }
  return docs;
}

const PATHS = {
  REPORTED: [],
  UNDER_REVIEW: ["UNDER_REVIEW"],
  VERIFIED: ["UNDER_REVIEW", "VERIFIED"],
  IN_PROGRESS: ["UNDER_REVIEW", "VERIFIED", "IN_PROGRESS"],
  RESOLVED: ["UNDER_REVIEW", "VERIFIED", "IN_PROGRESS", "RESOLVED"],
  REJECTED: ["UNDER_REVIEW", "REJECTED"],
};

function walkTo(incident, target, adminId, createdAt) {
  let step = 1;
  for (const status of PATHS[target]) {
    applyStatusChange(incident, {
      status,
      note: status === "REJECTED" ? "Seed data: rejected as a duplicate report." : null,
      adminId,
    });
    const entry = incident.statusHistory[incident.statusHistory.length - 1];
    entry.at = new Date(createdAt.getTime() + step * 3600000);
    step += 1;
  }
}

export async function insertRandomIncidents(count, reporterIds, options) {
  const docs = buildRandomIncidents(count, reporterIds, options);
  // validateBeforeSave keeps the pre-validate hook (initial history entry);
  // timestamps are preserved because they are set explicitly on the documents.
  await Incident.insertMany(docs, { ordered: true });
  return docs.length;
}
