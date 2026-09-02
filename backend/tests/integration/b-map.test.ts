import { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { type IncidentDocument } from "../../src/models/Incident.js";
import {
  createFixtureIncidents,
  createTestUsers,
  idOf,
  type FixtureKey,
  type FixtureUsers,
} from "../helpers/b-fixtures.js";
import { closeTestDb, connectTestDb, mongoUri } from "../setup/db.js";

interface Feature {
  type: string;
  geometry: { type: string; coordinates: [number, number] };
  properties: Record<string, unknown>;
}

describe.skipIf(!mongoUri())("GET /api/map/incidents", () => {
  let app: Express;
  let users: FixtureUsers;
  let docs: Record<FixtureKey, IncidentDocument>;
  const now = new Date();

  beforeAll(async () => {
    await connectTestDb("b_map");
    app = createApp();
    users = await createTestUsers();
    docs = await createFixtureIncidents(users, now);
  });

  afterAll(closeTestDb);

  const admin = () => ({ Authorization: `Bearer ${users.adminToken}` });
  const ids = (body: { data: { features: Feature[] } }) =>
    body.data.features.map((f) => f.properties.id as string).sort();
  const keys = (body: { data: { features: Feature[] } }, subset: FixtureKey[]) =>
    subset.map((k) => idOf(docs[k])).sort();

  it("returns a GeoJSON FeatureCollection with the documented properties", async () => {
    const res = await request(app).get("/api/map/incidents");
    expect(res.status).toBe(200);
    expect(res.body.data.type).toBe("FeatureCollection");
    const feature = (res.body.data.features as Feature[]).find((f) => f.properties.id === idOf(docs.C));
    expect(feature).toEqual({
      type: "Feature",
      geometry: { type: "Point", coordinates: [78.39, 17.44] },
      properties: {
        id: idOf(docs.C),
        title: "C accident Madhapur",
        category: "ACCIDENT",
        severity: "HIGH",
        status: "VERIFIED",
        verification: "VERIFIED",
        priority: null,
        riskLevel: null,
        createdAt: docs.C.createdAt.toISOString(),
        address: "",
        source: "user",
        hasImage: false,
      },
    });
    expect(Object.keys(feature?.properties ?? {}).sort()).toEqual(
      [
        "id",
        "title",
        "category",
        "severity",
        "status",
        "verification",
        "priority",
        "riskLevel",
        "createdAt",
        "address",
        "source",
        "hasImage",
      ].sort(),
    );
  });

  it("never gives REJECTED incidents to anonymous or citizen callers and nulls priority/riskLevel", async () => {
    const anon = await request(app).get("/api/map/incidents");
    expect(ids(anon.body)).toEqual(keys(anon.body, ["A", "B", "C", "D", "E", "G", "H", "I", "K", "L", "M"]));
    expect(anon.body.meta).toEqual({ count: 11, truncated: false, seedCount: 3 });
    expect(
      (anon.body.data.features as Feature[]).every(
        (f) => f.properties.priority === null && f.properties.riskLevel === null,
      ),
    ).toBe(true);
    const withImage = (anon.body.data.features as Feature[]).find((f) => f.properties.id === idOf(docs.I));
    expect(withImage?.properties.hasImage).toBe(true);
    expect(withImage?.properties.source).toBe("seed");

    const citizen = await request(app)
      .get("/api/map/incidents")
      .set({ Authorization: `Bearer ${users.citizenToken}` });
    expect(citizen.body.meta.count).toBe(11);
    expect(ids(citizen.body)).not.toContain(idOf(docs.F));

    const reduced = await request(app).get("/api/map/incidents?status=REJECTED,VERIFIED");
    expect(ids(reduced.body)).toEqual(keys(reduced.body, ["C", "I", "M"]));
    const onlyRejected = await request(app).get("/api/map/incidents?status=REJECTED");
    expect(onlyRejected.body.meta.count).toBe(0);
    expect(onlyRejected.body.data.features).toEqual([]);
  });

  it("gives admins every status plus priority and riskLevel", async () => {
    const res = await request(app).get("/api/map/incidents").set(admin());
    expect(res.body.meta).toEqual({ count: 13, truncated: false, seedCount: 4 });
    const features = res.body.data.features as Feature[];
    expect(features.find((f) => f.properties.id === idOf(docs.C))?.properties).toMatchObject({
      priority: "HIGH",
      riskLevel: "HIGH",
    });
    expect(features.find((f) => f.properties.id === idOf(docs.A))?.properties).toMatchObject({
      priority: null,
      riskLevel: null,
    });
    expect(features.find((f) => f.properties.id === idOf(docs.F))?.properties).toMatchObject({
      status: "REJECTED",
      verification: "REJECTED",
    });
    const rejectedOnly = await request(app).get("/api/map/incidents?status=REJECTED").set(admin());
    expect(ids(rejectedOnly.body)).toEqual(keys(rejectedOnly.body, ["F", "J"]));
  });

  it("filters by bbox using the 2dsphere index", async () => {
    const box = "78.37,17.43,78.41,17.47";
    const anon = await request(app).get(`/api/map/incidents?bbox=${box}`);
    expect(ids(anon.body)).toEqual(keys(anon.body, ["A", "B", "C", "D"]));
    const asAdmin = await request(app).get(`/api/map/incidents?bbox=${box}`).set(admin());
    expect(ids(asAdmin.body)).toEqual(keys(asAdmin.body, ["A", "B", "C", "D", "F"]));
    const bad = await request(app).get("/api/map/incidents?bbox=78.6,17.3,78.3,17.5");
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("VALIDATION_ERROR");
    expect(bad.body.error.details[0].field).toBe("bbox");
  });

  it("returns the newest `limit` incidents and flags truncation", async () => {
    const res = await request(app).get("/api/map/incidents?limit=3");
    expect(res.status).toBe(200);
    expect((res.body.data.features as Feature[]).map((f) => f.properties.id)).toEqual([
      idOf(docs.A),
      idOf(docs.B),
      idOf(docs.C),
    ]);
    expect(res.body.meta).toEqual({ count: 3, truncated: true, seedCount: 0 });
    const exact = await request(app).get("/api/map/incidents?limit=11");
    expect(exact.body.meta).toEqual({ count: 11, truncated: false, seedCount: 3 });
    for (const limit of ["0", "5001", "x"]) {
      const invalid = await request(app).get(`/api/map/incidents?limit=${limit}`);
      expect(invalid.status).toBe(400);
      expect(invalid.body.error.details[0].field).toBe("limit");
    }
  });

  it("applies the other filters; the priority filter only for admins", async () => {
    const potholes = await request(app).get("/api/map/incidents?category=POTHOLE");
    expect(ids(potholes.body)).toEqual(keys(potholes.body, ["A", "B", "G"]));
    const seed = await request(app).get("/api/map/incidents?source=seed");
    expect(ids(seed.body)).toEqual(keys(seed.body, ["G", "H", "I"]));
    const severe = await request(app).get("/api/map/incidents?severity=HIGH,LOW&status=SUBMITTED");
    expect(ids(severe.body)).toEqual(keys(severe.body, ["A", "H"]));
    const from = new Date(now.getTime() - 6 * 86_400_000).toISOString();
    const recent = await request(app).get("/api/map/incidents").query({ from });
    expect(ids(recent.body)).toEqual(keys(recent.body, ["A", "B", "C"]));
    // riskLevel is admin-only: honouring it anonymously would disclose stored estimates.
    const risky = await request(app).get("/api/map/incidents?riskLevel=HIGH,MEDIUM").set(admin());
    expect(ids(risky.body)).toEqual(keys(risky.body, ["C", "D"]));
    const riskyAnon = await request(app).get("/api/map/incidents?riskLevel=HIGH,MEDIUM");
    expect(riskyAnon.body.meta.count).toBe(11);

    const unassigned = await request(app).get("/api/map/incidents?priority=UNASSIGNED").set(admin());
    expect(ids(unassigned.body)).toEqual(keys(unassigned.body, ["A", "F", "H", "K", "M"]));
    const ignored = await request(app).get("/api/map/incidents?priority=UNASSIGNED");
    expect(ignored.body.meta.count).toBe(11);
    const unknown = await request(app).get("/api/map/incidents?status=REPORTED");
    expect(unknown.status).toBe(400);
  });

  it("rejects an invalid token instead of downgrading to anonymous", async () => {
    const res = await request(app).get("/api/map/incidents").set({ Authorization: "Bearer not-a-token" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});
