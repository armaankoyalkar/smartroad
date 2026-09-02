import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bboxToPolygon, toPoint } from "../../src/lib/geo.js";
import { Incident, type IncidentAttrs } from "../../src/models/Incident.js";
import { User, type UserDocument } from "../../src/models/User.js";
import { applyStatusChange } from "../../src/services/incidentStatus.service.js";
import { clearCollections, closeTestDb, connectTestDb, mongoUri } from "../setup/db.js";

describe.skipIf(!mongoUri())("models with MongoDB", () => {
  let reporter: UserDocument;
  let admin: UserDocument;

  beforeAll(async () => {
    await connectTestDb("models");
  });

  afterAll(closeTestDb);

  beforeEach(async () => {
    await clearCollections();
    const hash = await User.hashPassword("correct horse battery");
    reporter = await User.create({ name: "Priya Sharma", email: "priya@example.com", passwordHash: hash });
    admin = await User.create({ name: "Admin One", email: "admin@example.com", passwordHash: hash, role: "admin" });
  });

  function incidentData(overrides: Partial<IncidentAttrs> = {}): Partial<IncidentAttrs> {
    return {
      title: "Deep pothole near Hitec City flyover",
      description: "About 40 cm wide pothole on the left lane just after the flyover exit.",
      category: "POTHOLE",
      severity: "HIGH",
      location: toPoint(17.4483, 78.3814),
      address: "Hitec City Main Road, Madhapur, Hyderabad",
      reportedBy: reporter._id,
      ...overrides,
    };
  }

  it("enforces unique emails case-insensitively", async () => {
    const hash = await User.hashPassword("another password");
    await expect(User.create({ name: "Dup", email: "PRIYA@example.com", passwordHash: hash })).rejects.toMatchObject({
      code: 11000,
    });
  });

  it("never selects the password hash unless asked", async () => {
    const plain = await User.findOne({ email: "priya@example.com" });
    expect(plain?.passwordHash).toBeUndefined();
    const withHash = await User.findByEmailWithPassword("  PRIYA@example.com ");
    expect(withHash?.passwordHash).toMatch(/^\$2[aby]\$/);
    await expect(withHash?.comparePassword("correct horse battery")).resolves.toBe(true);
    expect(await User.findByEmailWithPassword("")).toBeNull();
  });

  it("saves an incident with the initial SUBMITTED history entry and timestamps", async () => {
    const saved = await Incident.create(incidentData());
    const found = await Incident.findById(saved._id);
    expect(found?.status).toBe("SUBMITTED");
    expect(found?.statusHistory).toHaveLength(1);
    expect(found?.statusHistory[0]?.to).toBe("SUBMITTED");
    expect(found?.createdAt).toBeInstanceOf(Date);
    expect(found?.latitude).toBe(17.4483);
    expect(found?.riskEstimate).toBeNull();
  });

  it("persists status changes made through the service", async () => {
    const incident = await Incident.create(incidentData());
    applyStatusChange(incident, { status: "UNDER_REVIEW", adminId: admin._id });
    applyStatusChange(incident, { status: "VERIFIED", note: "Confirmed", adminId: admin._id });
    await incident.save();

    const found = await Incident.findById(incident._id).populate<{ verifiedBy: { name: string } | null }>("verifiedBy", "name");
    expect(found?.status).toBe("VERIFIED");
    expect(found?.verifiedBy?.name).toBe("Admin One");
    expect(found?.adminNote).toBe("Confirmed");
    expect(found?.statusHistory.map((h) => h.to)).toEqual(["SUBMITTED", "UNDER_REVIEW", "VERIFIED"]);
  });

  it("stores and queries the risk estimate", async () => {
    const withEstimate = await Incident.create(
      incidentData({
        riskEstimate: {
          level: "HIGH",
          probabilities: { LOW: 0.1, MEDIUM: 0.3, HIGH: 0.6 },
          modelVersion: "demo-rf-1.0.0",
          estimatedAt: new Date("2026-09-01T00:00:00Z"),
        },
      }),
    );
    const without = await Incident.create(incidentData({ title: "No estimate yet, plain report" }));

    const found = await Incident.findById(withEstimate._id);
    expect(found?.riskEstimate).toMatchObject({ level: "HIGH", modelVersion: "demo-rf-1.0.0" });
    expect(found?.riskEstimate?.probabilities.HIGH).toBe(0.6);

    const high = await Incident.find({ "riskEstimate.level": { $in: ["HIGH"] } });
    expect(high.map((i) => String(i._id))).toEqual([String(withEstimate._id)]);
    const none = await Incident.find({ "riskEstimate.level": { $in: [null] } });
    expect(none.map((i) => String(i._id))).toEqual([String(without._id)]);
  });

  it("does not allow reportedBy to change after creation", async () => {
    const incident = await Incident.create(incidentData());
    incident.reportedBy = admin._id;
    await incident.save();
    const found = await Incident.findById(incident._id);
    expect(String(found?.reportedBy)).toBe(String(reporter._id));
  });

  it("answers viewport queries through the 2dsphere index", async () => {
    await Incident.create(incidentData({ title: "Inside the box, Hitec City" }));
    await Incident.create(incidentData({ title: "Outside the box, Charminar", location: toPoint(17.3616, 78.4747) }));

    const polygon = bboxToPolygon({ minLng: 78.35, minLat: 17.42, maxLng: 78.42, maxLat: 17.47 });
    const inside = await Incident.find({ location: { $geoWithin: { $geometry: polygon } } });
    expect(inside.map((i) => i.title)).toEqual(["Inside the box, Hitec City"]);

    const near = await Incident.find({
      location: { $near: { $geometry: toPoint(17.3616, 78.4747), $maxDistance: 500 } },
    });
    expect(near.map((i) => i.title)).toEqual(["Outside the box, Charminar"]);
  });

  it("has the documented indexes", async () => {
    const indexes = await Incident.collection.indexes();
    const keys = indexes.map((i) => JSON.stringify(i.key));
    expect(keys).toContain(JSON.stringify({ location: "2dsphere" }));
    expect(keys).toContain(JSON.stringify({ status: 1, createdAt: -1 }));
    expect(keys).toContain(JSON.stringify({ reportedBy: 1, createdAt: -1 }));
    expect(keys).toContain(JSON.stringify({ "riskEstimate.level": 1 }));
    const userIndexes = await User.collection.indexes();
    expect(userIndexes.some((i) => i.key?.email === 1 && i.unique)).toBe(true);
  });
});
