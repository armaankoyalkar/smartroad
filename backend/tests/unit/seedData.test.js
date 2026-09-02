import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { STATUSES } from "../../src/config/enums.js";
import { HYDERABAD_BBOX } from "../../src/lib/geo.js";
import { buildRandomIncidents, makeRandom } from "../../src/scripts/lib/seedData.js";

/** The generator is checked without a database; insertion is covered by the integration test. */
describe("buildRandomIncidents", () => {
  const reporters = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
  const admin = new mongoose.Types.ObjectId();

  it("is deterministic for a given seed", () => {
    const a = buildRandomIncidents(20, reporters, { seed: 3, adminId: admin }).map((d) => d.title + d.status);
    const b = buildRandomIncidents(20, reporters, { seed: 3, adminId: admin }).map((d) => d.title + d.status);
    expect(a).toEqual(b);
    const r1 = makeRandom(1);
    const r2 = makeRandom(1);
    expect([r1(), r1()]).toEqual([r2(), r2()]);
  });

  it("produces valid documents inside Hyderabad with consistent histories", async () => {
    const docs = buildRandomIncidents(200, reporters, { seed: 11, adminId: admin });
    expect(docs).toHaveLength(200);
    const statuses = new Set();
    for (const doc of docs) {
      await doc.validate();
      statuses.add(doc.status);
      expect(doc.source).toBe("seed");
      expect(doc.latitude).toBeGreaterThan(HYDERABAD_BBOX.minLat - 0.01);
      expect(doc.latitude).toBeLessThan(HYDERABAD_BBOX.maxLat + 0.01);
      expect(doc.longitude).toBeGreaterThan(HYDERABAD_BBOX.minLng - 0.01);
      expect(doc.longitude).toBeLessThan(HYDERABAD_BBOX.maxLng + 0.01);
      expect(doc.statusHistory[0]).toMatchObject({ field: "status", from: null, to: "REPORTED" });
      expect(doc.statusHistory.filter((h) => h.field === "status").at(-1).to).toBe(doc.status);
      if (doc.status === "RESOLVED") expect(doc.resolvedAt).toBeInstanceOf(Date);
      if (doc.status === "REJECTED") expect(doc.adminNote).toMatch(/duplicate/i);
      // history timestamps never precede the report itself
      for (const entry of doc.statusHistory) expect(entry.at.getTime()).toBeGreaterThanOrEqual(doc.createdAt.getTime());
    }
    for (const status of STATUSES) expect(statuses.has(status)).toBe(true);
    expect(docs.some((d) => d.priority !== null)).toBe(true);
  });
});
