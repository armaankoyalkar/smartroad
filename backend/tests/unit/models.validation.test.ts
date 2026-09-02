import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { toPoint } from "../../src/lib/geo.js";
import { Incident, type IncidentDocument } from "../../src/models/Incident.js";
import { User } from "../../src/models/User.js";

/**
 * Schema rules checked with document validation only (no database). The
 * database-backed behaviour (unique index, geo queries, persistence) is in
 * tests/integration/models.test.ts.
 */

const REPORTER = new mongoose.Types.ObjectId();

function validIncident(overrides: Record<string, unknown> = {}): IncidentDocument {
  return new Incident({
    title: "Deep pothole near Hitec City flyover",
    description: "About 40 cm wide pothole on the left lane just after the flyover exit.",
    category: "POTHOLE",
    severity: "HIGH",
    location: toPoint(17.4483, 78.3814),
    reportedBy: REPORTER,
    ...overrides,
  });
}

async function validationErrors(doc: mongoose.Document): Promise<Record<string, { message: string }>> {
  try {
    await doc.validate();
    return {};
  } catch (err) {
    return (err as mongoose.Error.ValidationError).errors ?? {};
  }
}

describe("Incident schema", () => {
  it("accepts a valid incident and creates the initial SUBMITTED history entry", async () => {
    const doc = validIncident();
    await doc.validate();
    expect(doc.status).toBe("SUBMITTED");
    expect(doc.priority).toBeNull();
    expect(doc.source).toBe("user");
    expect(doc.riskEstimate).toBeNull();
    expect(doc.statusHistory).toHaveLength(1);
    expect(doc.statusHistory[0]).toMatchObject({ field: "status", from: null, to: "SUBMITTED", changedBy: null });
    expect(doc.latitude).toBe(17.4483);
    expect(doc.longitude).toBe(78.3814);
  });

  it("does not add a second initial entry when history already exists", async () => {
    const doc = validIncident({ statusHistory: [{ field: "status", from: null, to: "SUBMITTED" }] });
    await doc.validate();
    expect(doc.statusHistory).toHaveLength(1);
  });

  it("enforces title and description lengths", async () => {
    const errors = await validationErrors(validIncident({ title: "Tiny", description: "Too short" }));
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(["title", "description"]));
  });

  it("rejects unknown categories, severities, priorities and statuses", async () => {
    const errors = await validationErrors(
      validIncident({ category: "HAZARD", severity: "EXTREME", priority: "URGENT", status: "REPORTED" }),
    );
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(["category", "severity", "priority", "status"]));
    expect(errors.category?.message).toMatch(/not a known category/);
  });

  it("accepts every one of the ten categories", async () => {
    for (const category of ["TRAFFIC_CONGESTION", "STREET_LIGHT", "UNSAFE_ROAD", "OTHER"]) {
      await expect(validIncident({ category }).validate()).resolves.toBeUndefined();
    }
  });

  it("allows priority to be null", async () => {
    const doc = validIncident({ priority: null });
    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it("rejects coordinates out of range or in the wrong shape", async () => {
    const bad = validIncident({ location: { type: "Point", coordinates: [17.4483, 178.3814] } });
    const errors = await validationErrors(bad);
    expect(Object.keys(errors).some((k) => k.startsWith("location"))).toBe(true);

    const short = validIncident({ location: { type: "Point", coordinates: [78.38] } });
    expect(Object.keys(await validationErrors(short)).some((k) => k.startsWith("location"))).toBe(true);
  });

  it("requires reportedBy and a location", async () => {
    const errors = await validationErrors(validIncident({ reportedBy: undefined, location: undefined }));
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(["reportedBy"]));
    expect(Object.keys(errors).some((k) => k.startsWith("location"))).toBe(true);
  });

  it("validates image sub-documents", async () => {
    const errors = await validationErrors(
      validIncident({ image: { filename: "x.gif", url: "/uploads/x.gif", mimeType: "image/gif", size: 10 } }),
    );
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(["image.mimeType"]));
  });

  it("validates the riskEstimate sub-document", async () => {
    const good = validIncident({
      riskEstimate: {
        level: "MEDIUM",
        probabilities: { LOW: 0.31, MEDIUM: 0.52, HIGH: 0.17 },
        modelVersion: "demo-rf-1.0.0",
        estimatedAt: new Date(),
      },
    });
    await expect(good.validate()).resolves.toBeUndefined();
    expect(good.riskEstimate?.level).toBe("MEDIUM");
    expect(good.riskEstimate?.probabilities.MEDIUM).toBe(0.52);

    const badLevel = await validationErrors(
      validIncident({
        riskEstimate: { level: "EXTREME", probabilities: { LOW: 1, MEDIUM: 0, HIGH: 0 }, modelVersion: "v" },
      }),
    );
    expect(Object.keys(badLevel)).toContain("riskEstimate.level");

    const badProbability = await validationErrors(
      validIncident({
        riskEstimate: { level: "LOW", probabilities: { LOW: 1.5, MEDIUM: 0, HIGH: 0 }, modelVersion: "v" },
      }),
    );
    expect(Object.keys(badProbability)).toContain("riskEstimate.probabilities.LOW");

    const missing = await validationErrors(
      validIncident({ riskEstimate: { level: "LOW", probabilities: { LOW: 1 }, modelVersion: "v" } }),
    );
    expect(Object.keys(missing).some((k) => k.startsWith("riskEstimate.probabilities"))).toBe(true);
  });

  it("serialises to JSON with id, latitude and longitude and without location", () => {
    const json = validIncident().toJSON() as unknown as Record<string, unknown>;
    expect(json.id).toBeTypeOf("string");
    expect(json.latitude).toBe(17.4483);
    expect(json.longitude).toBe(78.3814);
    expect(json).not.toHaveProperty("location");
    expect(json).not.toHaveProperty("_id");
    expect(json).not.toHaveProperty("__v");
  });
});

describe("User schema", () => {
  it("normalises the email and hides the password hash", async () => {
    const hash = await User.hashPassword("correct horse battery");
    const user = new User({ name: "Priya Sharma", email: "  Priya@Example.com ", passwordHash: hash });
    await user.validate();
    expect(user.email).toBe("priya@example.com");
    expect(user.role).toBe("citizen");
    expect(user.isActive).toBe(true);
    const json = user.toJSON() as unknown as Record<string, unknown>;
    expect(json).not.toHaveProperty("passwordHash");
    expect(json.id).toBeTypeOf("string");
    expect(user.toProfile()).toMatchObject({ name: "Priya Sharma", email: "priya@example.com", role: "citizen", phone: null });
  });

  it("hashes and compares passwords with bcrypt", async () => {
    const hash = await User.hashPassword("correct horse battery");
    expect(hash).toMatch(/^\$2[aby]\$/);
    const user = new User({ name: "Priya Sharma", email: "priya@example.com", passwordHash: hash });
    await expect(user.comparePassword("correct horse battery")).resolves.toBe(true);
    await expect(user.comparePassword("wrong")).resolves.toBe(false);
  });

  it("refuses passwords outside 8 to 72 characters before hashing", () => {
    expect(() => User.hashPassword("short")).toThrow(RangeError);
    expect(() => User.hashPassword("x".repeat(73))).toThrow(RangeError);
  });

  it("rejects bad emails, phones, roles and names", async () => {
    const user = new User({ name: "P", email: "not-an-email", passwordHash: "h", role: "root", phone: "12" });
    const errors = await validationErrors(user);
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(["name", "email", "role", "phone"]));
  });
});
