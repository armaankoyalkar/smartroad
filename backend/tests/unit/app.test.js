import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

/**
 * HTTP behaviour that does not need a database: meta endpoints, the error
 * envelope, security headers and CORS. The health endpoint is exercised here
 * in its "database down" state; the "up" state is covered by the
 * integration tests.
 */
let app;

beforeAll(() => {
  app = createApp();
});

describe("GET /api/meta/categories", () => {
  it("returns the eight categories with labels and colours", async () => {
    const res = await request(app).get("/api/meta/categories");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(8);
    expect(res.body.data[0]).toMatchObject({ key: "ACCIDENT", label: "Accident" });
    expect(res.body.data.every((c) => /^#[0-9A-F]{6}$/i.test(c.color))).toBe(true);
  });
});

describe("GET /api/meta/enums", () => {
  it("returns enums, transitions, map defaults and upload limits", async () => {
    const res = await request(app).get("/api/meta/enums");
    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(data.severities).toEqual(["LOW", "MEDIUM", "HIGH"]);
    expect(data.priorities).toEqual(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
    expect(data.statuses).toEqual(["REPORTED", "UNDER_REVIEW", "VERIFIED", "IN_PROGRESS", "RESOLVED", "REJECTED"]);
    expect(data.transitions.VERIFIED).toEqual(["IN_PROGRESS", "RESOLVED", "REJECTED"]);
    expect(data.map).toEqual({ center: { latitude: 17.385, longitude: 78.4867 }, zoom: 12 });
    expect(data.upload).toEqual({ maxBytes: 5 * 1024 * 1024, mimeTypes: ["image/jpeg", "image/png", "image/webp"] });
    expect(data.labels.status.UNDER_REVIEW).toBe("Under review");
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
    const res = await request(app)
      .post("/api/meta/enums")
      .set("Content-Type", "application/json")
      .send("{ not json");
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
