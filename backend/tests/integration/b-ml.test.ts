import { type Express } from "express";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { cache } from "../../src/lib/cache.js";
import { AppError } from "../../src/lib/errors.js";
import { toPoint } from "../../src/lib/geo.js";
import * as mlClient from "../../src/lib/mlClient.js";
import { Incident, type IncidentAttrs, type IncidentDocument } from "../../src/models/Incident.js";
import { clearCollections, closeTestDb, connectTestDb, mongoUri } from "../setup/db.js";
import { createTestUsers, idOf, type FixtureUsers } from "../helpers/b-fixtures.js";

vi.mock("../../src/lib/mlClient.js", async (importOriginal) => {
  const actual = await importOriginal<typeof mlClient>();
  return { ...actual, modelInfo: vi.fn(), estimateRisk: vi.fn(), estimateRiskBatch: vi.fn() };
});

const modelInfoMock = vi.mocked(mlClient.modelInfo);
const estimateMock = vi.mocked(mlClient.estimateRisk);
const batchMock = vi.mocked(mlClient.estimateRiskBatch);

/** snake_case body as the ML service sends it (docs/api.md section 10). */
const MODEL_INFO = {
  model_name: "RandomForestClassifier",
  model_version: "demo-rf-1.0.0",
  trained_at: "2026-09-01T00:00:00Z",
  is_demo_model: true,
  dataset: { name: "Demo dataset", is_demo_data: true, source: "generator", url: null, records: 6000 },
  preprocessing: ["one-hot"],
  features: [
    { name: "hour", label: "Hour of day", type: "integer", min: 0, max: 23 },
    { name: "day_of_week", label: "Day of week", type: "categorical", values: ["MON", "TUE"] },
  ],
  classes: ["LOW", "MEDIUM", "HIGH"],
  class_distribution: { train: { LOW: 1, MEDIUM: 2, HIGH: 3 }, test: { LOW: 1, MEDIUM: 1, HIGH: 1 } },
  metrics: {
    accuracy: 0.5,
    macro_f1: 0.4,
    weighted_f1: 0.45,
    per_class: { LOW: { precision: 0.5, recall: 0.5, f1: 0.5, support: 10 } },
  },
  confusion_matrix: {
    labels: ["LOW", "MEDIUM", "HIGH"],
    matrix: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  },
  feature_importance: [{ feature: "speed_limit", importance: 0.2, method: "permutation" }],
  comparison: [{ model: "MajorityClass", accuracy: 0.3, macro_f1: 0.2 }],
  research_model: {
    features: ["latitude"],
    metrics: { accuracy: 0.6, macro_f1: 0.5 },
    note: "not the shipped model",
  },
  hotspot_defaults: { eps_meters: 200, min_samples: 4 },
  disclaimer: "Estimate from historical data; not a prediction that an incident will occur.",
};

const ESTIMATE: mlClient.MlEstimateResponse = {
  risk_level: "HIGH",
  probabilities: { LOW: 0.12, MEDIUM: 0.33, HIGH: 0.55 },
  model_version: "demo-rf-1.0.0",
  is_demo_model: true,
  contributions: [{ feature: "speed_limit", value: 60, effect: 0.18 }],
  disclaimer: "Estimate from historical data; not a prediction that an incident will occur.",
};

const FEATURES = {
  hour: 18,
  day_of_week: "FRI",
  month: 11,
  light_conditions: "DARK_LIT",
  weather: "RAIN",
  road_surface: "WET",
  road_type: "ARTERIAL",
  speed_limit: 60,
  area_type: "URBAN",
  category: "ACCIDENT",
};

describe.skipIf(!mongoUri())("/api/ml/*", () => {
  let app: Express;
  let users: FixtureUsers;

  beforeAll(async () => {
    await connectTestDb("b_ml");
    app = createApp();
    users = await createTestUsers();
  });

  afterAll(closeTestDb);

  beforeEach(() => {
    cache.clear();
    modelInfoMock.mockReset();
    estimateMock.mockReset();
    batchMock.mockReset();
  });

  const admin = () => ({ Authorization: `Bearer ${users.adminToken}` });
  const citizen = () => ({ Authorization: `Bearer ${users.citizenToken}` });

  function incidentData(overrides: Partial<IncidentAttrs> = {}): Partial<IncidentAttrs> {
    return {
      title: "Waterlogging after the night rain",
      description: "ML fixture record for the integration tests; not a real report.",
      category: "WATERLOGGING",
      severity: "MEDIUM",
      location: toPoint(17.4483, 78.3814),
      reportedBy: users.citizen._id,
      createdAt: new Date("2026-08-31T18:30:00Z"), // Tuesday 2026-09-01 00:00 in Asia/Kolkata
      ...overrides,
    };
  }

  describe("access", () => {
    it.each([
      ["get", "/api/ml/model-info"],
      ["post", "/api/ml/estimate-risk"],
      ["get", "/api/ml/incidents/66d5a2b8c2b7a4e8f1a2b3d0/risk"],
      ["post", "/api/ml/risk/refresh"],
      ["get", "/api/ml/risk/distribution"],
    ] as const)("%s %s needs an admin token", async (method, path) => {
      expect((await request(app)[method](path)).status).toBe(401);
      const res = await request(app)[method](path).set(citizen());
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("GET /model-info", () => {
    it("returns the service body in camelCase and caches it for ten minutes", async () => {
      modelInfoMock.mockResolvedValue(MODEL_INFO);
      const res = await request(app).get("/api/ml/model-info").set(admin());
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        modelName: "RandomForestClassifier",
        modelVersion: "demo-rf-1.0.0",
        trainedAt: "2026-09-01T00:00:00Z",
        isDemoModel: true,
        dataset: { name: "Demo dataset", isDemoData: true, url: null, records: 6000 },
        features: [
          { name: "hour", label: "Hour of day", type: "integer", min: 0, max: 23 },
          { name: "day_of_week", label: "Day of week", type: "categorical", values: ["MON", "TUE"] },
        ],
        classDistribution: { train: { LOW: 1, MEDIUM: 2, HIGH: 3 } },
        metrics: { macroF1: 0.4, weightedF1: 0.45, perClass: { LOW: { f1: 0.5, support: 10 } } },
        confusionMatrix: { labels: ["LOW", "MEDIUM", "HIGH"] },
        featureImportance: [{ feature: "speed_limit", importance: 0.2, method: "permutation" }],
        researchModel: { features: ["latitude"], metrics: { macroF1: 0.5 } },
        hotspotDefaults: { epsMeters: 200, minSamples: 4 },
      });
      expect(res.body.data.features[1].name).toBe("day_of_week"); // feature names are values, not keys
      expect(JSON.stringify(res.body.data)).not.toMatch(/"[a-z]+_[a-z_]+":/);
      expect(res.body.meta).toEqual({ cached: false });

      const again = await request(app).get("/api/ml/model-info").set(admin());
      expect(again.body.meta).toEqual({ cached: true });
      expect(modelInfoMock).toHaveBeenCalledTimes(1);
    });

    it("reports ML failures instead of serving stale or invented data", async () => {
      modelInfoMock.mockRejectedValueOnce(new AppError("ML_UNAVAILABLE", "The ML service is not reachable."));
      const down = await request(app).get("/api/ml/model-info").set(admin());
      expect(down.status).toBe(503);
      expect(down.body.error.code).toBe("ML_UNAVAILABLE");

      modelInfoMock.mockRejectedValueOnce(
        new AppError("ML_ERROR", "The ML service returned an error.", [
          { status: 503, detail: "Model artifacts not found." },
        ]),
      );
      const noModel = await request(app).get("/api/ml/model-info").set(admin());
      expect(noModel.status).toBe(502);
      expect(noModel.body.error.details[0]).toMatchObject({ status: 503 });

      modelInfoMock.mockResolvedValueOnce({ model_name: "x" });
      const malformed = await request(app).get("/api/ml/model-info").set(admin());
      expect(malformed.status).toBe(502);
      expect(malformed.body.error.code).toBe("ML_ERROR");
      expect(malformed.body.error.message).toMatch(/malformed model information/);
      expect(cache.has("ml:model-info")).toBe(false);
    });
  });

  describe("POST /estimate-risk", () => {
    it("validates the ten features and proxies the estimate in camelCase", async () => {
      estimateMock.mockResolvedValue(ESTIMATE);
      const res = await request(app).post("/api/ml/estimate-risk").set(admin()).send({ features: FEATURES });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        riskLevel: "HIGH",
        probabilities: { LOW: 0.12, MEDIUM: 0.33, HIGH: 0.55 },
        modelVersion: "demo-rf-1.0.0",
        isDemoModel: true,
        contributions: [{ feature: "speed_limit", value: 60, effect: 0.18 }],
        disclaimer: ESTIMATE.disclaimer,
      });
      expect(estimateMock).toHaveBeenCalledWith(FEATURES);
    });

    it("rejects bad feature values with field paths before calling the service", async () => {
      const res = await request(app)
        .post("/api/ml/estimate-risk")
        .set(admin())
        .send({ features: { ...FEATURES, hour: 24, weather: "SNOW", speed_limit: "60" } });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      const fields = (res.body.error.details as Array<{ field: string }>).map((d) => d.field).sort();
      expect(fields).toEqual(["features.hour", "features.speed_limit", "features.weather"]);
      const missing = await request(app).post("/api/ml/estimate-risk").set(admin()).send({});
      expect(missing.status).toBe(400);
      expect(missing.body.error.details[0].field).toBe("features");
      expect(estimateMock).not.toHaveBeenCalled();
    });

    it("maps a malformed service body to ML_ERROR", async () => {
      estimateMock.mockResolvedValueOnce({ risk_level: "EXTREME" } as unknown as mlClient.MlEstimateResponse);
      const res = await request(app).post("/api/ml/estimate-risk").set(admin()).send({ features: FEATURES });
      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe("ML_ERROR");
    });
  });

  describe("GET /incidents/:id/risk", () => {
    let incident: IncidentDocument;

    beforeEach(async () => {
      await Incident.deleteMany({});
      incident = await Incident.create(incidentData());
    });

    it("derives the features, stores the estimate and lists the assumed inputs", async () => {
      estimateMock.mockResolvedValue(ESTIMATE);
      const res = await request(app)
        .get(`/api/ml/incidents/${idOf(incident)}/risk`)
        .set(admin());
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        riskLevel: "HIGH",
        probabilities: { LOW: 0.12, MEDIUM: 0.33, HIGH: 0.55 },
        modelVersion: "demo-rf-1.0.0",
        isDemoModel: true,
        contributions: [{ feature: "speed_limit", value: 60, effect: 0.18 }],
        disclaimer: ESTIMATE.disclaimer,
        features: {
          hour: 0,
          day_of_week: "TUE",
          month: 9,
          light_conditions: "DARK_LIT",
          weather: "CLEAR",
          road_surface: "FLOODED",
          road_type: "LOCAL",
          speed_limit: 40,
          area_type: "URBAN",
          category: "WATERLOGGING",
        },
        assumedFeatures: ["light_conditions", "weather", "road_type", "speed_limit", "area_type"],
        stored: true,
      });
      expect(estimateMock).toHaveBeenCalledWith(res.body.data.features);

      const stored = await Incident.findById(incident._id);
      expect(stored?.riskEstimate).toMatchObject({
        level: "HIGH",
        probabilities: { LOW: 0.12, MEDIUM: 0.33, HIGH: 0.55 },
        modelVersion: "demo-rf-1.0.0",
      });
      expect(stored?.riskEstimate?.estimatedAt.toISOString()).toBe(res.body.data.estimatedAt);
      expect(stored?.updatedAt.getTime()).toBe(incident.updatedAt.getTime());
    });

    it("serves the stored estimate until refresh=true is given", async () => {
      estimateMock.mockResolvedValue(ESTIMATE);
      const url = `/api/ml/incidents/${idOf(incident)}/risk`;
      await request(app).get(url).set(admin());
      const stored = await request(app).get(url).set(admin());
      expect(stored.status).toBe(200);
      expect(stored.body.data).toMatchObject({
        riskLevel: "HIGH",
        modelVersion: "demo-rf-1.0.0",
        contributions: [],
        stored: true,
        isDemoModel: null, // model info not fetched yet in this test
        disclaimer: "Estimate from historical data; not a prediction that an incident will occur.",
        features: { category: "WATERLOGGING", road_surface: "FLOODED" },
      });
      expect(estimateMock).toHaveBeenCalledTimes(1);

      modelInfoMock.mockResolvedValue(MODEL_INFO);
      await request(app).get("/api/ml/model-info").set(admin());
      const withInfo = await request(app).get(url).set(admin());
      expect(withInfo.body.data.isDemoModel).toBe(true);

      estimateMock.mockResolvedValueOnce({ ...ESTIMATE, risk_level: "LOW", model_version: "demo-rf-1.0.1" });
      const refreshed = await request(app).get(`${url}?refresh=true`).set(admin());
      expect(refreshed.body.data).toMatchObject({
        riskLevel: "LOW",
        modelVersion: "demo-rf-1.0.1",
        stored: true,
      });
      expect(estimateMock).toHaveBeenCalledTimes(2);
      expect((await Incident.findById(incident._id))?.riskEstimate?.level).toBe("LOW");
    });

    it("applies query overrides without storing the result", async () => {
      estimateMock.mockResolvedValue(ESTIMATE);
      const res = await request(app)
        .get(`/api/ml/incidents/${idOf(incident)}/risk?weather=RAIN&speed_limit=60&road_type=HIGHWAY`)
        .set(admin());
      expect(res.status).toBe(200);
      expect(res.body.data.features).toMatchObject({
        weather: "RAIN",
        speed_limit: 60,
        road_type: "HIGHWAY",
        hour: 0,
      });
      expect(res.body.data.assumedFeatures).toEqual(["light_conditions", "area_type"]);
      expect(res.body.data.stored).toBe(false);
      expect(estimateMock).toHaveBeenCalledWith(
        expect.objectContaining({ weather: "RAIN", speed_limit: 60 }),
      );
      expect((await Incident.findById(incident._id))?.riskEstimate).toBeNull();

      const bad = await request(app)
        .get(`/api/ml/incidents/${idOf(incident)}/risk?speed_limit=500`)
        .set(admin());
      expect(bad.status).toBe(400);
      expect(bad.body.error.details[0].field).toBe("speed_limit");
    });

    it("returns 404 for an unknown id and 400 for a malformed one", async () => {
      const unknown = await request(app)
        .get(`/api/ml/incidents/${new mongoose.Types.ObjectId()}/risk`)
        .set(admin());
      expect(unknown.status).toBe(404);
      expect(unknown.body.error.code).toBe("NOT_FOUND");
      const malformed = await request(app).get("/api/ml/incidents/nope/risk").set(admin());
      expect(malformed.status).toBe(400);
      expect(malformed.body.error.details[0].field).toBe("id");
      expect(estimateMock).not.toHaveBeenCalled();
    });

    it("propagates ML_UNAVAILABLE as the 503 envelope", async () => {
      estimateMock.mockRejectedValueOnce(new AppError("ML_UNAVAILABLE", "The ML service is not reachable."));
      const res = await request(app)
        .get(`/api/ml/incidents/${idOf(incident)}/risk`)
        .set(admin());
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe("ML_UNAVAILABLE");
    });
  });

  describe("POST /risk/refresh and GET /risk/distribution", () => {
    beforeEach(async () => {
      await clearCollections();
      users = await createTestUsers();
    });

    it("batch-estimates non-rejected incidents, stores the results and reports skipped ones", async () => {
      const a = await Incident.create(incidentData({ title: "Refresh A pothole", category: "POTHOLE" }));
      const b = await Incident.create(
        incidentData({
          title: "Refresh B accident",
          category: "ACCIDENT",
          createdAt: new Date("2026-08-30T10:00:00Z"),
        }),
      );
      const c = await Incident.create(
        incidentData({
          title: "Refresh C unknown to ML",
          category: "OTHER",
          createdAt: new Date("2026-08-29T10:00:00Z"),
        }),
      );
      const rejected = await Incident.create(
        incidentData({
          title: "Refresh rejected",
          status: "REJECTED",
          createdAt: new Date("2026-08-28T10:00:00Z"),
        }),
      );

      batchMock.mockImplementation(async (items) => ({
        model_version: "demo-rf-1.0.0",
        is_demo_model: true,
        results: items
          .filter((item) => item.id !== idOf(c))
          .map((item) => ({
            id: item.id,
            risk_level: item.features.category === "ACCIDENT" ? ("HIGH" as const) : ("LOW" as const),
            probabilities: { LOW: 0.6, MEDIUM: 0.3, HIGH: 0.1 },
          })),
      }));

      const res = await request(app).post("/api/ml/risk/refresh").set(admin());
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        estimated: 2,
        skipped: 1,
        modelVersion: "demo-rf-1.0.0",
        byLevel: { LOW: 1, MEDIUM: 0, HIGH: 1 },
      });
      expect(res.body.data.finishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(batchMock).toHaveBeenCalledTimes(1);
      const items = batchMock.mock.calls[0]?.[0] ?? [];
      expect(items.map((i) => i.id)).toEqual([a, b, c].map(idOf)); // newest first, rejected excluded
      expect(items[0]?.features).toMatchObject({
        hour: 0,
        day_of_week: "TUE",
        category: "POTHOLE",
        road_surface: "DRY",
      });

      expect((await Incident.findById(a._id))?.riskEstimate).toMatchObject({
        level: "LOW",
        modelVersion: "demo-rf-1.0.0",
      });
      expect((await Incident.findById(b._id))?.riskEstimate).toMatchObject({ level: "HIGH" });
      expect((await Incident.findById(c._id))?.riskEstimate).toBeNull();
      expect((await Incident.findById(rejected._id))?.riskEstimate).toBeNull();

      const distribution = await request(app).get("/api/ml/risk/distribution").set(admin());
      expect(distribution.status).toBe(200);
      expect(distribution.body.data).toMatchObject({
        byLevel: { LOW: 1, MEDIUM: 0, HIGH: 1, NONE: 2 },
        total: 4,
        estimated: 2,
        modelVersions: ["demo-rf-1.0.0"],
        isDemoModel: null,
      });
      expect(new Date(distribution.body.data.lastEstimatedAt).getTime()).toBeGreaterThan(Date.now() - 60_000);
    });

    it("sends chunks of at most 500 items and caps at 5000", async () => {
      const raw = Array.from({ length: 620 }, (_, i) => ({
        title: `Bulk incident ${i}`,
        description: "Bulk ML fixture record; not a real report.",
        category: "POTHOLE",
        severity: "LOW",
        priority: null,
        status: "SUBMITTED",
        location: toPoint(17.4, 78.4),
        address: "",
        image: null,
        reportedBy: users.citizen._id,
        verifiedBy: null,
        adminNote: null,
        statusHistory: [],
        riskEstimate: null,
        source: "seed",
        resolvedAt: null,
        createdAt: new Date(Date.UTC(2026, 7, 1, 0, i)),
        updatedAt: new Date(Date.UTC(2026, 7, 1, 0, i)),
      }));
      await Incident.collection.insertMany(raw);
      batchMock.mockImplementation(async (items) => ({
        model_version: "demo-rf-1.0.0",
        is_demo_model: true,
        results: items.map((item) => ({
          id: item.id,
          risk_level: "MEDIUM" as const,
          probabilities: { LOW: 0.2, MEDIUM: 0.6, HIGH: 0.2 },
        })),
      }));
      const res = await request(app).post("/api/ml/risk/refresh").set(admin());
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        estimated: 620,
        skipped: 0,
        byLevel: { LOW: 0, MEDIUM: 620, HIGH: 0 },
      });
      expect(batchMock).toHaveBeenCalledTimes(2);
      expect(batchMock.mock.calls.map((call) => call[0].length)).toEqual([500, 120]);
      expect(await Incident.countDocuments({ "riskEstimate.level": "MEDIUM" })).toBe(620);
    });

    it("returns zeros with no ML call when nothing needs an estimate", async () => {
      const res = await request(app).post("/api/ml/risk/refresh").set(admin());
      expect(res.body.data).toMatchObject({
        estimated: 0,
        skipped: 0,
        modelVersion: null,
        byLevel: { LOW: 0, MEDIUM: 0, HIGH: 0 },
      });
      expect(batchMock).not.toHaveBeenCalled();
      const distribution = await request(app).get("/api/ml/risk/distribution").set(admin());
      expect(distribution.body.data).toEqual({
        byLevel: { LOW: 0, MEDIUM: 0, HIGH: 0, NONE: 0 },
        total: 0,
        estimated: 0,
        modelVersions: [],
        lastEstimatedAt: null,
        isDemoModel: null,
      });
    });

    it("distribution counts stored estimates across versions and takes isDemoModel from cached model info", async () => {
      const at = (iso: string) => new Date(iso);
      await Incident.create(
        incidentData({
          title: "Dist one",
          riskEstimate: {
            level: "LOW",
            probabilities: { LOW: 0.7, MEDIUM: 0.2, HIGH: 0.1 },
            modelVersion: "v1",
            estimatedAt: at("2026-08-01T00:00:00Z"),
          },
        }),
      );
      await Incident.create(
        incidentData({
          title: "Dist two",
          riskEstimate: {
            level: "LOW",
            probabilities: { LOW: 0.7, MEDIUM: 0.2, HIGH: 0.1 },
            modelVersion: "v2",
            estimatedAt: at("2026-08-03T00:00:00Z"),
          },
        }),
      );
      await Incident.create(
        incidentData({
          title: "Dist three",
          status: "REJECTED",
          riskEstimate: {
            level: "HIGH",
            probabilities: { LOW: 0.1, MEDIUM: 0.2, HIGH: 0.7 },
            modelVersion: "v1",
            estimatedAt: at("2026-08-02T00:00:00Z"),
          },
        }),
      );
      await Incident.create(incidentData({ title: "Dist none" }));

      const before = await request(app).get("/api/ml/risk/distribution").set(admin());
      expect(before.body.data).toEqual({
        byLevel: { LOW: 2, MEDIUM: 0, HIGH: 1, NONE: 1 },
        total: 4,
        estimated: 3,
        modelVersions: ["v1", "v2"],
        lastEstimatedAt: "2026-08-03T00:00:00.000Z",
        isDemoModel: null,
      });

      modelInfoMock.mockResolvedValue(MODEL_INFO);
      await request(app).get("/api/ml/model-info").set(admin());
      const after = await request(app).get("/api/ml/risk/distribution").set(admin());
      expect(after.body.data.isDemoModel).toBe(true);
      expect(modelInfoMock).toHaveBeenCalledTimes(1);
    });
  });
});
