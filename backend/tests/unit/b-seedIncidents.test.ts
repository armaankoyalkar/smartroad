import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { CATEGORY_KEYS } from "../../src/config/categories.js";
import { SEVERITIES, STATUSES } from "../../src/config/enums.js";
import { haversineMeters, HYDERABAD_BBOX } from "../../src/lib/geo.js";
import { zoneParts } from "../../src/lib/time.js";
import { buildCuratedIncidents, curatedCreatedAt, DEMO_SUFFIX } from "../../src/scripts/lib/seedIncidents.js";
import { CURATED_INCIDENTS, SEED_CLUSTERS } from "../../src/scripts/lib/seedIncidentsData.js";

/** The curated demo set is checked without a database; insertion is covered by the integration test. */
describe("curated seed data", () => {
  it("has about 80 entries, every category, severity and status, inside the Hyderabad bbox", () => {
    expect(CURATED_INCIDENTS.length).toBeGreaterThanOrEqual(75);
    expect(CURATED_INCIDENTS.length).toBeLessThanOrEqual(90);
    for (const entry of CURATED_INCIDENTS) {
      expect(entry.latitude).toBeGreaterThanOrEqual(HYDERABAD_BBOX.minLat);
      expect(entry.latitude).toBeLessThanOrEqual(HYDERABAD_BBOX.maxLat);
      expect(entry.longitude).toBeGreaterThanOrEqual(HYDERABAD_BBOX.minLng);
      expect(entry.longitude).toBeLessThanOrEqual(HYDERABAD_BBOX.maxLng);
      expect(entry.daysAgo).toBeGreaterThanOrEqual(1);
      expect(entry.daysAgo).toBeLessThanOrEqual(179);
      expect(entry.hour).toBeGreaterThanOrEqual(0);
      expect(entry.hour).toBeLessThanOrEqual(23);
      expect(entry.title.length).toBeGreaterThanOrEqual(5);
      expect(entry.title.length).toBeLessThanOrEqual(120);
      expect(entry.description.length).toBeGreaterThanOrEqual(10);
    }
    const categories = new Set(CURATED_INCIDENTS.map((e) => e.category));
    for (const key of CATEGORY_KEYS) expect(categories.has(key)).toBe(true);
    const severities = new Set(CURATED_INCIDENTS.map((e) => e.severity));
    for (const key of SEVERITIES) expect(severities.has(key)).toBe(true);
    const statuses = new Set(CURATED_INCIDENTS.map((e) => e.status));
    for (const key of STATUSES) expect(statuses.has(key)).toBe(true);
    // Most reviewed incidents carry a priority; new ones never do.
    const reviewed = CURATED_INCIDENTS.filter((e) => e.status !== "SUBMITTED");
    expect(reviewed.filter((e) => e.priority !== null).length / reviewed.length).toBeGreaterThan(0.8);
    expect(CURATED_INCIDENTS.filter((e) => e.status === "SUBMITTED").every((e) => e.priority === null)).toBe(
      true,
    );
    // Night and day reports both exist so the light feature varies.
    expect(CURATED_INCIDENTS.some((e) => e.hour < 6 || e.hour >= 18)).toBe(true);
    expect(CURATED_INCIDENTS.some((e) => e.hour >= 6 && e.hour < 18)).toBe(true);
  });

  it("places at least four clusters of 5 to 9 incidents within 150 m of their centre", () => {
    const clusterNames = Object.keys(SEED_CLUSTERS);
    expect(clusterNames.length).toBeGreaterThanOrEqual(4);
    for (const name of clusterNames) {
      const centre = SEED_CLUSTERS[name];
      if (!centre) throw new Error(`missing centre for ${name}`);
      const members = CURATED_INCIDENTS.filter((e) => e.cluster === name);
      expect(members.length).toBeGreaterThanOrEqual(5);
      expect(members.length).toBeLessThanOrEqual(9);
      for (const member of members) {
        expect(haversineMeters(member, centre)).toBeLessThanOrEqual(150);
      }
    }
    expect(CURATED_INCIDENTS.every((e) => e.cluster === null || e.cluster in SEED_CLUSTERS)).toBe(true);
  });

  it("keeps the isolated points more than 200 m from every other point (DBSCAN noise)", () => {
    const isolated = CURATED_INCIDENTS.filter((e) => e.cluster === null);
    expect(isolated.length).toBeGreaterThanOrEqual(8);
    for (const point of isolated) {
      const nearest = Math.min(
        ...CURATED_INCIDENTS.filter((other) => other !== point).map((other) => haversineMeters(point, other)),
      );
      expect(nearest, `${point.title} has a neighbour within ${Math.round(nearest)} m`).toBeGreaterThan(200);
    }
  });
});

describe("buildCuratedIncidents", () => {
  const reporters = [
    new mongoose.Types.ObjectId(),
    new mongoose.Types.ObjectId(),
    new mongoose.Types.ObjectId(),
  ];
  const admin = new mongoose.Types.ObjectId();
  const now = new Date("2026-09-02T10:00:00Z");

  it("reports at the entry's local hour in Asia/Kolkata on the right day", () => {
    const entry = CURATED_INCIDENTS[0];
    if (!entry) throw new Error("no entries");
    const createdAt = curatedCreatedAt({ ...entry, daysAgo: 3, hour: 1 }, now, 0);
    const parts = zoneParts(createdAt, "Asia/Kolkata");
    expect(parts).toMatchObject({ year: 2026, month: 8, day: 30, hour: 1 });
    expect(
      zoneParts(curatedCreatedAt({ ...entry, daysAgo: 1, hour: 23 }, now, 4), "Asia/Kolkata"),
    ).toMatchObject({
      day: 1,
      month: 9,
      hour: 23,
    });
  });

  it("produces valid seed documents with realistic histories spread over the demo reporters", async () => {
    const docs = buildCuratedIncidents(reporters, { adminId: admin, now });
    expect(docs).toHaveLength(CURATED_INCIDENTS.length);
    const reporterCounts = new Map<string, number>();
    for (const [index, doc] of docs.entries()) {
      const entry = CURATED_INCIDENTS[index];
      if (!entry) throw new Error("entry missing");
      await doc.validate();
      expect(doc.source).toBe("seed");
      expect(doc.description.endsWith(DEMO_SUFFIX)).toBe(true);
      expect(doc.riskEstimate).toBeNull();
      expect(doc.status).toBe(entry.status);
      expect(doc.priority).toBe(entry.priority);
      expect(doc.latitude).toBeCloseTo(entry.latitude, 6);
      expect(doc.longitude).toBeCloseTo(entry.longitude, 6);
      expect(doc.createdAt.getTime()).toBeLessThan(now.getTime());
      expect(doc.createdAt.getTime()).toBeGreaterThan(now.getTime() - 180 * 86_400_000);
      expect(doc.statusHistory[0]).toMatchObject({
        field: "status",
        from: null,
        to: "SUBMITTED",
        changedBy: null,
      });
      const statusEntries = doc.statusHistory.filter((h) => h.field === "status");
      expect(statusEntries.at(-1)?.to).toBe(doc.status);
      for (const [i, h] of doc.statusHistory.entries()) {
        expect(h.at.getTime()).toBeGreaterThanOrEqual(doc.createdAt.getTime());
        if (i > 0) expect(String(h.changedBy)).toBe(String(admin));
      }
      if (doc.status === "RESOLVED")
        expect(doc.resolvedAt?.getTime()).toBe(statusEntries.at(-1)?.at.getTime());
      else expect(doc.resolvedAt).toBeNull();
      if (doc.status === "REJECTED") expect(doc.adminNote).toMatch(/seed data/i);
      if (["VERIFIED", "IN_PROGRESS", "RESOLVED"].includes(doc.status))
        expect(String(doc.verifiedBy)).toBe(String(admin));
      if (entry.priority)
        expect(doc.statusHistory.at(-1)).toMatchObject({ field: "priority", to: entry.priority });
      const reporter = String(doc.reportedBy);
      reporterCounts.set(reporter, (reporterCounts.get(reporter) ?? 0) + 1);
    }
    expect(reporterCounts.size).toBe(3);
    const counts = [...reporterCounts.values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it("refuses to build without reporters", () => {
    expect(() => buildCuratedIncidents([], { adminId: admin })).toThrow(/reporter/);
  });
});
