import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { STATUSES } from "../../src/config/enums.js";
import { HYDERABAD_BBOX } from "../../src/lib/geo.js";
import { Incident } from "../../src/models/Incident.js";
import { User } from "../../src/models/User.js";
import {
  DEMO_CITIZENS,
  clearSeedIncidents,
  insertRandomIncidents,
  seedAdmin,
  seedDemoCitizens,
} from "../../src/scripts/lib/seedData.js";
import { closeTestDb, connectTestDb, mongoUri } from "../setup/db.js";

describe.skipIf(!mongoUri())("seed building blocks", () => {
  beforeAll(async () => {
    await connectTestDb("seed");
  });

  afterAll(closeTestDb);

  it("creates the admin once and updates it on the second run", async () => {
    const first = await seedAdmin({ name: "Admin", email: "Admin@Test.local", password: "admin-test-password" });
    const second = await seedAdmin({ name: "Admin Renamed", email: "admin@test.local", password: "another-password-1" });
    expect(String(second._id)).toBe(String(first._id));
    expect(await User.countDocuments({ role: "admin" })).toBe(1);
    const stored = await User.findByEmailWithPassword("admin@test.local");
    expect(stored?.name).toBe("Admin Renamed");
    await expect(stored?.comparePassword("another-password-1")).resolves.toBe(true);
  });

  it("refuses to run without admin credentials", async () => {
    await expect(seedAdmin({ name: "x", email: "", password: "" })).rejects.toThrow(/SEED_ADMIN_EMAIL/);
  });

  it("creates the demo citizens idempotently", async () => {
    await seedDemoCitizens("demo-citizen-password");
    const citizens = await seedDemoCitizens("demo-citizen-password");
    expect(citizens).toHaveLength(DEMO_CITIZENS.length);
    expect(await User.countDocuments({ role: "citizen" })).toBe(DEMO_CITIZENS.length);
  });

  it("generates seed incidents inside Hyderabad with every status represented, and clears only seed data", async () => {
    const citizens = await User.find({ role: "citizen" });
    const admin = await User.findOne({ role: "admin" });
    const first = citizens[0];
    if (!first || !admin) throw new Error("seed accounts missing");
    const userIncident = await Incident.create({
      title: "A real report that must survive",
      description: "Reported by a user, not seed data, so clearing seeds must not remove it.",
      category: "OTHER",
      severity: "LOW",
      location: { type: "Point", coordinates: [78.4867, 17.385] },
      reportedBy: first._id,
    });

    const inserted = await insertRandomIncidents(
      300,
      citizens.map((c) => c._id),
      { adminId: admin._id, seed: 7 },
    );
    expect(inserted).toBe(300);
    expect(await Incident.countDocuments({ source: "seed" })).toBe(300);

    const sample = await Incident.find({ source: "seed" }).limit(300);
    for (const doc of sample) {
      expect(doc.latitude).toBeGreaterThanOrEqual(HYDERABAD_BBOX.minLat - 0.01);
      expect(doc.latitude).toBeLessThanOrEqual(HYDERABAD_BBOX.maxLat + 0.01);
      expect(doc.longitude).toBeGreaterThanOrEqual(HYDERABAD_BBOX.minLng - 0.01);
      expect(doc.longitude).toBeLessThanOrEqual(HYDERABAD_BBOX.maxLng + 0.01);
      expect(doc.statusHistory[0]?.to).toBe("SUBMITTED");
      expect(doc.createdAt.getTime()).toBeLessThan(Date.now());
    }
    const statuses = new Set(sample.map((d) => d.status));
    for (const status of STATUSES) expect(statuses.has(status)).toBe(true);
    expect(sample.some((d) => d.priority !== null)).toBe(true);
    expect(sample.filter((d) => d.status === "RESOLVED").every((d) => d.resolvedAt instanceof Date)).toBe(true);

    const removed = await clearSeedIncidents();
    expect(removed).toBe(300);
    expect(await Incident.countDocuments()).toBe(1);
    expect(await Incident.findById(userIncident._id)).not.toBeNull();
  });
});
