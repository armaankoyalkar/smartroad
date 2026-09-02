import { type Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

/**
 * HTTP behaviour that does not need a database: meta endpoints, the error
 * envelope, security headers and CORS. The health endpoint is exercised here
 * in its "database down" state; the "up" state is covered by the
 * integration tests.
 */
let app: Express;

beforeAll(() => {
  app = createApp();
});

/** docs/api.md section 2, exact keys, labels and colours in order. */
const DOCUMENTED_CATEGORIES = [
  ["POTHOLE", "Pothole", "#D97706"],
  ["ROAD_DAMAGE", "Road damage", "#7C3AED"],
  ["ACCIDENT", "Accident", "#DC2626"],
  ["TRAFFIC_CONGESTION", "Traffic congestion", "#EA580C"],
  ["TRAFFIC_SIGNAL", "Broken traffic signal", "#2563EB"],
  ["STREET_LIGHT", "Street-light issue", "#CA8A04"],
  ["UNSAFE_ROAD", "Unsafe road condition", "#DB2777"],
  ["OBSTRUCTION", "Obstruction", "#0891B2"],
  ["WATERLOGGING", "Waterlogging", "#0D9488"],
  ["OTHER", "Other", "#6B7280"],
];

describe("GET /api/meta/categories", () => {
  it("returns the ten documented categories in order with labels, colours and descriptions", async () => {
    const res = await request(app).get("/api/meta/categories");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const rows = res.body.data as Array<{ key: string; label: string; color: string; description: string }>;
    expect(rows.map((c) => [c.key, c.label, c.color])).toEqual(DOCUMENTED_CATEGORIES);
    expect(rows.every((c) => typeof c.description === "string" && c.description.length > 10)).toBe(true);
  });
});

describe("GET /api/meta/enums", () => {
  it("matches the shape in docs/api.md section 4", async () => {
    const res = await request(app).get("/api/meta/enums");
    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(Object.keys(data).sort()).toEqual(
      [
        "roles",
        "severities",
        "priorities",
        "statuses",
        "verificationStates",
        "riskLevels",
        "transitions",
        "labels",
        "map",
        "upload",
      ].sort(),
    );
    expect(data.roles).toEqual(["citizen", "admin"]);
    expect(data.severities).toEqual(["LOW", "MEDIUM", "HIGH"]);
    expect(data.priorities).toEqual(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
    expect(data.statuses).toEqual(["SUBMITTED", "UNDER_REVIEW", "VERIFIED", "IN_PROGRESS", "RESOLVED", "REJECTED"]);
    expect(data.verificationStates).toEqual(["PENDING", "VERIFIED", "REJECTED"]);
    expect(data.riskLevels).toEqual(["LOW", "MEDIUM", "HIGH"]);
    expect(data.transitions).toEqual({
      SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
      UNDER_REVIEW: ["VERIFIED", "REJECTED"],
      VERIFIED: ["IN_PROGRESS", "RESOLVED", "REJECTED"],
      IN_PROGRESS: ["RESOLVED"],
      RESOLVED: ["IN_PROGRESS"],
      REJECTED: ["UNDER_REVIEW"],
    });
    expect(Object.keys(data.labels).sort()).toEqual(
      ["role", "severity", "priority", "status", "verification", "riskLevel", "source"].sort(),
    );
    expect(data.labels.status.SUBMITTED).toBe("Submitted");
    expect(data.labels.status.UNDER_REVIEW).toBe("Under review");
    expect(data.labels.verification.PENDING).toBeTypeOf("string");
    expect(data.labels.riskLevel.HIGH).toBeTypeOf("string");
    expect(data.labels.source.seed).toMatch(/demo/i);
    expect(data.map).toEqual({ center: { latitude: 17.385, longitude: 78.4867 }, zoom: 12 });
    expect(data.upload).toEqual({ maxBytes: 5 * 1024 * 1024, mimeTypes: ["image/jpeg", "image/png", "image/webp"] });
  });
});

describe("GET /api/health without a database", () => {
  it("reports degraded with a 503 and never throws", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.status).toBe("degraded");
    expect(res.body.data.checks.database.status).toBe("down");
    expect(res.body.data.checks.mlService.status).toBe("down");
    expect(res.body.data.uptimeSeconds).toBeTypeOf("number");
  });
});

describe("route stubs", () => {
  it.each(["/api/auth/login"])(
    "%s answers with the NOT_FOUND envelope until its feature is mounted",
    async (path) => {
      const res = await request(app).get(path);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    },
  );

  // Analytics, map and ML are mounted: their admin routes reject a missing
  // token before touching the database (the unit tests run without one).
  it.each(["/api/analytics/summary", "/api/map/hotspots", "/api/ml/model-info"])(
    "%s is mounted and asks for a token instead of answering NOT_FOUND",
    async (path) => {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    },
  );
});

describe("error envelope", () => {
  it("returns NOT_FOUND for unknown routes", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: expect.stringContaining("/api/nope"), details: [] },
    });
  });

  it("returns VALIDATION_ERROR for malformed JSON", async () => {
    const res = await request(app).post("/api/meta/enums").set("Content-Type", "application/json").send("{ not json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details[0].field).toBe("body");
  });
});

describe("headers", () => {
  it("sets helmet security headers and hides x-powered-by", async () => {
    const res = await request(app).get("/api/meta/categories");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("allows configured origins and ignores others", async () => {
    const allowed = await request(app).get("/api/meta/categories").set("Origin", "http://localhost:5173");
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    const blocked = await request(app).get("/api/meta/categories").set("Origin", "http://evil.test");
    expect(blocked.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
