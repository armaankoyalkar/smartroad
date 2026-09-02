import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CATEGORY_KEYS } from "../../src/config/categories.js";
import { STATUSES } from "../../src/config/enums.js";
import { HYDERABAD_BBOX } from "../../src/lib/geo.js";
import { Incident } from "../../src/models/Incident.js";
import { User } from "../../src/models/User.js";
import { clearSeedIncidents, seedAdmin, seedDemoCitizens } from "../../src/scripts/lib/seedData.js";
import { DEMO_SUFFIX, insertCuratedIncidents } from "../../src/scripts/lib/seedIncidents.js";
import { CURATED_INCIDENTS } from "../../src/scripts/lib/seedIncidentsData.js";
import { closeTestDb, connectTestDb, mongoUri } from "../setup/db.js";

/** The curated demo set through the real seed building blocks (what `npm run seed` does). */
describe.skipIf(!mongoUri())("curated seed incidents", () => {
  beforeAll(async () => {
    await connectTestDb("b_seed");
  });

  afterAll(closeTestDb);

  it("inserts the curated set for the demo citizens with the seed admin as actor, and is idempotent", async () => {
    const admin = await seedAdmin({
      name: "Admin",
      email: "admin@test.local",
      password: "admin-test-password",
    });
    const citizens = await seedDemoCitizens("demo-citizen-password");
    const reporterIds = citizens.map((c) => c._id);
    const userIncident = await Incident.create({
      title: "A real report that must survive",
      description: "Reported by a user, not seed data, so re-seeding must not remove it.",
      category: "OTHER",
      severity: "LOW",
      location: { type: "Point", coordinates: [78.4867, 17.385] },
      reportedBy: reporterIds[0],
    });

    const runSeed = async () => {
      await clearSeedIncidents();
      return insertCuratedIncidents(reporterIds, { adminId: admin._id });
    };

    expect(await runSeed()).toBe(CURATED_INCIDENTS.length);
    expect(await Incident.countDocuments({ source: "seed" })).toBe(CURATED_INCIDENTS.length);
    expect(await runSeed()).toBe(CURATED_INCIDENTS.length);
    expect(await Incident.countDocuments({ source: "seed" })).toBe(CURATED_INCIDENTS.length);
    expect(await Incident.countDocuments()).toBe(CURATED_INCIDENTS.length + 1);
    expect(await Incident.findById(userIncident._id)).not.toBeNull();

    const docs = await Incident.find({ source: "seed" });
    const categories = new Set<string>();
    const statuses = new Set<string>();
    const reporters = new Set<string>();
    const now = Date.now();
    for (const doc of docs) {
      expect(doc.latitude).toBeGreaterThanOrEqual(HYDERABAD_BBOX.minLat);
      expect(doc.latitude).toBeLessThanOrEqual(HYDERABAD_BBOX.maxLat);
      expect(doc.longitude).toBeGreaterThanOrEqual(HYDERABAD_BBOX.minLng);
      expect(doc.longitude).toBeLessThanOrEqual(HYDERABAD_BBOX.maxLng);
      expect(doc.description.endsWith(DEMO_SUFFIX)).toBe(true);
      expect(doc.createdAt.getTime()).toBeLessThan(now);
      expect(doc.createdAt.getTime()).toBeGreaterThan(now - 180 * 86_400_000);
      expect(doc.statusHistory[0]?.to).toBe("SUBMITTED");
      if (doc.statusHistory.length > 1)
        expect(String(doc.statusHistory[1]?.changedBy)).toBe(String(admin._id));
      if (doc.status === "RESOLVED") expect(doc.resolvedAt).toBeInstanceOf(Date);
      categories.add(doc.category);
      statuses.add(doc.status);
      reporters.add(String(doc.reportedBy));
    }
    for (const key of CATEGORY_KEYS) expect(categories.has(key)).toBe(true);
    for (const status of STATUSES) expect(statuses.has(status)).toBe(true);
    expect(reporters.size).toBe(citizens.length);
    expect(await User.countDocuments()).toBe(citizens.length + 1);

    // The 2dsphere index answers a bounding-box query over the whole set.
    const inBox = await Incident.countDocuments({
      source: "seed",
      location: {
        $geoWithin: {
          $geometry: {
            type: "Polygon",
            coordinates: [
              [
                [HYDERABAD_BBOX.minLng, HYDERABAD_BBOX.minLat],
                [HYDERABAD_BBOX.maxLng, HYDERABAD_BBOX.minLat],
                [HYDERABAD_BBOX.maxLng, HYDERABAD_BBOX.maxLat],
                [HYDERABAD_BBOX.minLng, HYDERABAD_BBOX.maxLat],
                [HYDERABAD_BBOX.minLng, HYDERABAD_BBOX.minLat],
              ],
            ],
          },
        },
      },
    });
    expect(inBox).toBe(CURATED_INCIDENTS.length);

    expect(await clearSeedIncidents()).toBe(CURATED_INCIDENTS.length);
    expect(await Incident.countDocuments()).toBe(1);
  });
});
