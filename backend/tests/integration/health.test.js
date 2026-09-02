import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { closeTestDb, connectTestDb, mongoUri } from "../setup/db.js";

describe.skipIf(!mongoUri())("GET /api/health with a database", () => {
  let app;

  beforeAll(async () => {
    await connectTestDb("health");
    app = createApp();
  });

  afterAll(closeTestDb);

  it("reports ok with the database up and the ML service down", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.checks.database).toMatchObject({ status: "up", error: null });
    expect(res.body.data.checks.database.latencyMs).toBeTypeOf("number");
    expect(res.body.data.checks.mlService.status).toBe("down");
  });
});
