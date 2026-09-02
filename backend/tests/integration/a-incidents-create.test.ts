import { existsSync } from "node:fs";
import path from "node:path";
import { type Express } from "express";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// A small upload limit for this file only (read by src/config/env.ts at import, hence hoisted above the imports).
vi.hoisted(() => {
  process.env.MAX_UPLOAD_MB = "0.05";
});

import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { storage, UPLOAD_ROOT } from "../../src/lib/storage.js";
import { Incident } from "../../src/models/Incident.js";
import { type Account, bearer, createAccount, INCIDENT_BODY } from "../helpers/a-fixtures.js";
import { gifBuffer, pngBuffer } from "../helpers/images.js";
import { clearCollections, closeTestDb, connectTestDb, mongoUri } from "../setup/db.js";

describe.skipIf(!mongoUri())("POST /api/incidents", () => {
  let app: Express;
  let reporter: Account;

  beforeAll(async () => {
    await connectTestDb("a_incidents_create");
    app = createApp();
  });

  afterAll(closeTestDb);

  beforeEach(async () => {
    await clearCollections();
    reporter = await createAccount({ name: "Priya Sharma" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const multipart = (token: string, overrides: Record<string, string> = {}) => {
    const req = request(app).post("/api/incidents").set(bearer(token));
    const fields: Record<string, string> = {
      title: INCIDENT_BODY.title,
      description: INCIDENT_BODY.description,
      category: INCIDENT_BODY.category,
      severity: INCIDENT_BODY.severity,
      latitude: String(INCIDENT_BODY.latitude),
      longitude: String(INCIDENT_BODY.longitude),
      address: INCIDENT_BODY.address,
      ...overrides,
    };
    for (const [key, value] of Object.entries(fields)) req.field(key, value);
    return req;
  };

  it("creates a SUBMITTED user report from JSON and returns the reporter variant", async () => {
    const res = await request(app)
      .post("/api/incidents")
      .set(bearer(reporter.token))
      .send({ ...INCIDENT_BODY, status: "VERIFIED", priority: "HIGH", source: "seed", reportedBy: "66d5a2b8c2b7a4e8f1a2b3d0" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      id: expect.stringMatching(/^[a-f\d]{24}$/),
      title: INCIDENT_BODY.title,
      description: INCIDENT_BODY.description,
      category: "POTHOLE",
      severity: "HIGH",
      priority: null,
      status: "SUBMITTED",
      verification: "PENDING",
      latitude: 17.4483,
      longitude: 78.3814,
      address: INCIDENT_BODY.address,
      image: null,
      reportedBy: { id: reporter.id, name: "Priya Sharma" },
      verifiedBy: null,
      adminNote: null,
      statusHistory: [{ field: "status", from: null, to: "SUBMITTED", note: null, changedBy: null, at: expect.any(String) }],
      source: "user",
      resolvedAt: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(res.body.data).not.toHaveProperty("riskEstimate");
    expect(res.body.data.reportedBy).not.toHaveProperty("email");
    const stored = await Incident.findById(res.body.data.id);
    expect(stored?.location).toMatchObject({ type: "Point", coordinates: [78.3814, 17.4483] });
    expect(String(stored?.reportedBy)).toBe(reporter.id);
  });

  it("accepts multipart with an image and numeric strings, storing the file under /uploads", async () => {
    const res = await multipart(reporter.token, { latitude: "17.44", longitude: "78.38" }).attach("image", pngBuffer(64), "photo.png");
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ latitude: 17.44, longitude: 78.38, status: "SUBMITTED" });
    expect(res.body.data.image).toEqual({
      url: expect.stringMatching(/^\/uploads\/[a-f0-9]{32}\.png$/),
      mimeType: "image/png",
      size: pngBuffer(64).length,
    });
    const filename = res.body.data.image.url.replace("/uploads/", "");
    expect(existsSync(path.join(UPLOAD_ROOT, filename))).toBe(true);
    const served = await request(app).get(res.body.data.image.url);
    expect(served.status).toBe(200);
    expect(served.headers["content-type"]).toMatch(/^image\/png/);
  });

  it("rejects invalid fields with 400 and writes no file when the body is bad", async () => {
    const save = vi.spyOn(storage, "saveImage");
    const res = await multipart(reporter.token, { latitude: "95", category: "HAZARD", title: "Tiny" }).attach("image", pngBuffer(), "photo.png");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        { field: "latitude", message: "Must be between -90 and 90" },
        { field: "title", message: "Must be between 5 and 120 characters" },
        { field: "category", message: expect.stringMatching(/Must be one of/) },
      ]),
    );
    expect(save).not.toHaveBeenCalled();
    expect(await Incident.countDocuments()).toBe(0);
    const text = await multipart(reporter.token, { latitude: "north" });
    expect(text.body.error.details).toEqual([{ field: "latitude", message: "Must be a number" }]);
  });

  it("answers 415 for a GIF and 413 above MAX_UPLOAD_MB, without storing anything", async () => {
    const save = vi.spyOn(storage, "saveImage");
    const gif = await multipart(reporter.token).attach("image", gifBuffer(), "animation.gif");
    expect(gif.status).toBe(415);
    expect(gif.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
    expect(gif.body.error.details[0]).toEqual({ field: "image", detected: "image/gif" });

    expect(env.maxUploadBytes).toBe(Math.round(0.05 * 1024 * 1024));
    const big = await multipart(reporter.token).attach("image", pngBuffer(env.maxUploadBytes + 1), "huge.png");
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe("UPLOAD_TOO_LARGE");
    expect(save).not.toHaveBeenCalled();
    expect(await Incident.countDocuments()).toBe(0);

    const fits = await multipart(reporter.token).attach("image", pngBuffer(env.maxUploadBytes - 200), "fits.png");
    expect(fits.status).toBe(201);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("requires a signed-in user", async () => {
    const res = await request(app).post("/api/incidents").send(INCIDENT_BODY);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});
