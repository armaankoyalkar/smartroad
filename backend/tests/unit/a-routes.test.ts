import { type Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

/**
 * The auth, users and incidents routers are mounted and guarded before any
 * database work happens: these checks need no MongoDB.
 */
let app: Express;

beforeAll(() => {
  app = createApp();
});

describe("mounted auth/users/incidents routes without a token", () => {
  it.each([
    ["get", "/api/auth/me"],
    ["patch", "/api/users/me"],
    ["patch", "/api/users/me/password"],
    ["get", "/api/users"],
    ["get", "/api/users/66d5a2b8c2b7a4e8f1a2b3d0"],
    ["patch", "/api/users/66d5a2b8c2b7a4e8f1a2b3d0"],
    ["post", "/api/incidents"],
    ["get", "/api/incidents"],
    ["get", "/api/incidents/mine"],
    ["get", "/api/incidents/66d5a2b8c2b7a4e8f1a2b3d0"],
    ["patch", "/api/incidents/66d5a2b8c2b7a4e8f1a2b3d0"],
    ["delete", "/api/incidents/66d5a2b8c2b7a4e8f1a2b3d0"],
    ["patch", "/api/incidents/66d5a2b8c2b7a4e8f1a2b3d0/status"],
    ["patch", "/api/incidents/66d5a2b8c2b7a4e8f1a2b3d0/priority"],
  ] as const)("%s %s answers 401 UNAUTHENTICATED", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Authentication required.", details: [] },
    });
  });

  it("still answers 404 for a GET on the login and register paths", async () => {
    for (const path of ["/api/auth/login", "/api/auth/register"]) {
      const res = await request(app).get(path);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    }
  });
});

describe("register and login validation runs before any database access", () => {
  it("lists every missing registration field", async () => {
    const res = await request(app).post("/api/auth/register").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(["email", "name", "password"]);
  });

  it("rejects a malformed login body", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "", password: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([
      { field: "email", message: "Email is required" },
      { field: "password", message: "Password is required" },
    ]);
  });
});
