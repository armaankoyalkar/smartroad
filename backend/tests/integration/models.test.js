import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bboxToPolygon, toPoint } from "../../src/lib/geo.js";
import { Incident } from "../../src/models/Incident.js";
import { User } from "../../src/models/User.js";
import { applyStatusChange } from "../../src/services/incidentStatus.service.js";
import { clearCollections, closeTestDb, connectTestDb, mongoUri } from "../setup/db.js";

describe.skipIf(!mongoUri())("models with MongoDB", () => {
  let reporter;
  let admin;

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

  function incidentData(overrides = {}) {
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
    expect(plain.passwordHash).toBeUndefined();
    const withHash = await User.findByEmailWithPassword("  PRIYA@example.com ");
    expect(withHash.passwordHash).toMatch(/^\$2[aby]\$/);
    await expect(withHash.comparePassword("correct horse battery")).resolves.toBe(true);
  });

  it("saves an incident with the initial history entry and timestamps", async () => {
    const saved = await Incident.create(incidentData());
    const found = await Incident.findById(saved._id);
    expect(found.status).toBe("REPORTED");
    expect(found.statusHistory).toHaveLength(1);
    expect(found.statusHistory[0].to).toBe("REPORTED");
    expect(found.createdAt).toBeInstanceOf(Date);
    expect(found.latitude).toBe(17.4483);
  });

  it("persists status changes made through the service", async () => {
    const incident = await Incident.create(incidentData());
    applyStatusChange(incident, { status: "UNDER_REVIEW", adminId: admin._id });
    applyStatusChange(incident, { status: "VERIFIED", note: "Confirmed", adminId: admin._id });
    await incident.save();

    const found = await Incident.findById(incident._id).populate("verifiedBy", "name");
    expect(found.status).toBe("VERIFIED");
    expect(found.verifiedBy.name).toBe("Admin One");
    expect(found.adminNote).toBe("Confirmed");
    expect(found.statusHistory.map((h) => h.to)).toEqual(["REPORTED", "UNDER_REVIEW", "VERIFIED"]);
  });

  it("does not allow reportedBy to change after creation", async () => {
    const incident = await Incident.create(incidentData());
    incident.reportedBy = admin._id;
    await incident.save();
    const found = await Incident.findById(incident._id);
    expect(String(found.reportedBy)).toBe(String(reporter._id));
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
    const userIndexes = await User.collection.indexes();
    expect(userIndexes.some((i) => i.key.email === 1 && i.unique)).toBe(true);
  });
});
