import { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { cache } from "../../src/lib/cache.js";
import { AppError } from "../../src/lib/errors.js";
import { toPoint } from "../../src/lib/geo.js";
import * as mlClient from "../../src/lib/mlClient.js";
import { Incident, type IncidentDocument } from "../../src/models/Incident.js";
import { createTestUsers, idOf, type FixtureUsers } from "../helpers/b-fixtures.js";
import { closeTestDb, connectTestDb, mongoUri } from "../setup/db.js";

vi.mock("../../src/lib/mlClient.js", async (importOriginal) => {
  const actual = await importOriginal<typeof mlClient>();
  return { ...actual, hotspots: vi.fn() };
});

const hotspotsMock = vi.mocked(mlClient.hotspots);

/** The ML service is replaced by a mock returning the documented shapes (docs/api.md section 10). */
describe.skipIf(!mongoUri())("GET /api/map/hotspots", () => {
  let app: Express;
  let users: FixtureUsers;
  const points: IncidentDocument[] = [];
  let rejected: IncidentDocument;
  let far: IncidentDocument;

  beforeAll(async () => {
    await connectTestDb("b_hotspots");
    app = createApp();
    users = await createTestUsers();
    const base = {
      description: "Hotspot fixture record for the integration tests; not a real report.",
      severity: "MEDIUM" as const,
      reportedBy: users.citizen._id,
    };
    // Four incidents within ~60 m of the Cyber Towers junction, one rejected one there, one far away.
    const cluster: Array<[number, number, "POTHOLE" | "ROAD_DAMAGE"]> = [
      [17.4504, 78.3808, "POTHOLE"],
      [17.4508, 78.3811, "POTHOLE"],
      [17.4501, 78.3804, "POTHOLE"],
      [17.4507, 78.3803, "ROAD_DAMAGE"],
    ];
    for (const [lat, lng, category] of cluster) {
      points.push(
        await Incident.create({
          ...base,
          title: `Cluster ${category} ${lat}`,
          category,
          location: toPoint(lat, lng),
        }),
      );
    }
    rejected = await Incident.create({
      ...base,
      title: "Rejected duplicate",
      category: "POTHOLE",
      status: "REJECTED",
      location: toPoint(17.4503, 78.3809),
    });
    far = await Incident.create({
      ...base,
      title: "Far away accident",
      category: "ACCIDENT",
      location: toPoint(17.3616, 78.4747),
    });
  });

  afterAll(closeTestDb);

  beforeEach(() => {
    cache.clear();
    hotspotsMock.mockReset();
  });

  const admin = () => ({ Authorization: `Bearer ${users.adminToken}` });

  function mlAnswer(): mlClient.MlHotspotsResponse {
    return {
      clusters: [
        {
          id: 0,
          centroid: { lat: 17.4505, lng: 78.38065 },
          radius_m: 62.5,
          count: 4,
          member_ids: points.map(idOf),
        },
      ],
      noise_ids: [idOf(far)],
      params: { eps_m: 200, min_samples: 4, algorithm: "DBSCAN (haversine)" },
      total_points: 5,
    };
  }

  it("is admin only", async () => {
    expect((await request(app).get("/api/map/hotspots")).status).toBe(401);
    const res = await request(app)
      .get("/api/map/hotspots")
      .set({ Authorization: `Bearer ${users.citizenToken}` });
    expect(res.status).toBe(403);
    expect(hotspotsMock).not.toHaveBeenCalled();
  });

  it("sends non-rejected points to the ML service and adds dominantCategory and categoryCounts", async () => {
    hotspotsMock.mockResolvedValue(mlAnswer());
    const res = await request(app).get("/api/map/hotspots").set(admin());
    expect(res.status).toBe(200);

    expect(hotspotsMock).toHaveBeenCalledTimes(1);
    const [sent, eps, minSamples] = hotspotsMock.mock.calls[0] ?? [];
    expect(eps).toBe(200);
    expect(minSamples).toBe(4);
    expect(sent?.map((p) => p.id).sort()).toEqual([...points, far].map(idOf).sort());
    expect(sent?.map((p) => p.id)).not.toContain(idOf(rejected));
    const first = sent?.find((p) => p.id === idOf(points[0] as IncidentDocument));
    expect(first).toMatchObject({ lat: 17.4504, lng: 78.3808 });

    expect(res.body.data).toEqual({
      clusters: [
        {
          id: 0,
          centroid: { latitude: 17.4505, longitude: 78.38065 },
          radiusMeters: 62.5,
          count: 4,
          dominantCategory: "POTHOLE",
          categoryCounts: { POTHOLE: 3, ROAD_DAMAGE: 1 },
          memberIds: points.map(idOf),
        },
      ],
      noiseIds: [idOf(far)],
      totalPoints: 5,
    });
    expect(res.body.meta).toMatchObject({
      eps: 200,
      minSamples: 4,
      cached: false,
      algorithm: "DBSCAN (haversine)",
    });
    expect(res.body.meta.computedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("caches per parameter set for ten minutes", async () => {
    hotspotsMock.mockResolvedValue(mlAnswer());
    const first = await request(app).get("/api/map/hotspots?eps=300&minSamples=4").set(admin());
    const second = await request(app).get("/api/map/hotspots?minSamples=4&eps=300").set(admin());
    expect(first.body.meta.cached).toBe(false);
    expect(second.body.meta.cached).toBe(true);
    expect(second.body.meta.computedAt).toBe(first.body.meta.computedAt);
    expect(second.body.data).toEqual(first.body.data);
    expect(hotspotsMock).toHaveBeenCalledTimes(1);

    const other = await request(app).get("/api/map/hotspots?eps=300&minSamples=5").set(admin());
    expect(other.body.meta).toMatchObject({ cached: false, eps: 300, minSamples: 5 });
    expect(hotspotsMock).toHaveBeenCalledTimes(2);
    expect(hotspotsMock.mock.calls[1]?.[2]).toBe(5);
  });

  it("applies category, status and date filters to the points it collects", async () => {
    hotspotsMock.mockResolvedValue({ ...mlAnswer(), clusters: [], noise_ids: [], total_points: 3 });
    const res = await request(app).get("/api/map/hotspots?category=POTHOLE&minSamples=3").set(admin());
    expect(res.status).toBe(200);
    const sent = hotspotsMock.mock.calls[0]?.[0] ?? [];
    expect(sent.map((p) => p.id).sort()).toEqual(
      points
        .filter((p) => p.category === "POTHOLE")
        .map(idOf)
        .sort(),
    );

    const future = await request(app).get("/api/map/hotspots?from=2099-01-01").set(admin());
    expect(future.status).toBe(200);
    expect(future.body.data).toEqual({ clusters: [], noiseIds: [], totalPoints: 0 });
  });

  it("answers with zero clusters and no ML call when fewer than minSamples points match", async () => {
    const res = await request(app).get("/api/map/hotspots?status=REJECTED").set(admin());
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ clusters: [], noiseIds: [idOf(rejected)], totalPoints: 1 });
    expect(res.body.meta).toMatchObject({
      eps: 200,
      minSamples: 4,
      cached: false,
      algorithm: "DBSCAN (haversine)",
    });
    expect(hotspotsMock).not.toHaveBeenCalled();
  });

  it("validates eps and minSamples", async () => {
    for (const query of ["eps=10", "eps=5000", "minSamples=1", "minSamples=99", "eps=abc", "category=NOPE"]) {
      const res = await request(app).get(`/api/map/hotspots?${query}`).set(admin());
      expect(res.status, query).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
    expect(hotspotsMock).not.toHaveBeenCalled();
  });

  it("propagates ML_UNAVAILABLE and ML_ERROR without caching the failure", async () => {
    hotspotsMock.mockRejectedValueOnce(
      new AppError(
        "ML_UNAVAILABLE",
        "The ML service is not reachable. Reporting and management continue to work.",
      ),
    );
    const down = await request(app).get("/api/map/hotspots").set(admin());
    expect(down.status).toBe(503);
    expect(down.body).toEqual({
      success: false,
      error: {
        code: "ML_UNAVAILABLE",
        message: "The ML service is not reachable. Reporting and management continue to work.",
        details: [],
      },
    });

    hotspotsMock.mockResolvedValueOnce({ clusters: "nope" } as unknown as mlClient.MlHotspotsResponse);
    const malformed = await request(app).get("/api/map/hotspots").set(admin());
    expect(malformed.status).toBe(502);
    expect(malformed.body.error.code).toBe("ML_ERROR");
    expect(malformed.body.error.message).toMatch(/malformed/);

    hotspotsMock.mockResolvedValueOnce(mlAnswer());
    const recovered = await request(app).get("/api/map/hotspots").set(admin());
    expect(recovered.status).toBe(200);
    expect(recovered.body.meta.cached).toBe(false);
    expect(hotspotsMock).toHaveBeenCalledTimes(3);
  });
});
