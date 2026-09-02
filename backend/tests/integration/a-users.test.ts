import { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { STATUSES } from "../../src/config/enums.js";
import { type Account, bearer, createAccount, createIncident, PASSWORD } from "../helpers/a-fixtures.js";
import { clearCollections, closeTestDb, connectTestDb, mongoUri } from "../setup/db.js";

describe.skipIf(!mongoUri())("/api/users", () => {
  let app: Express;
  let admin: Account;
  let citizen: Account;

  beforeAll(async () => {
    await connectTestDb("a_users");
    app = createApp();
  });

  afterAll(closeTestDb);

  beforeEach(async () => {
    await clearCollections();
    admin = await createAccount({ name: "Admin One", email: "admin@example.com", role: "admin" });
    citizen = await createAccount({ name: "Priya Sharma", email: "priya@example.com", phone: "9876543210" });
  });

  describe("PATCH /me", () => {
    it("updates the name and clears the phone with null", async () => {
      const res = await request(app).patch("/api/users/me").set(bearer(citizen.token)).send({ name: " Priya S. ", phone: null });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ id: citizen.id, name: "Priya S.", email: "priya@example.com", role: "citizen", phone: null, createdAt: expect.any(String) });
      const me = await request(app).get("/api/auth/me").set(bearer(citizen.token));
      expect(me.body.data.name).toBe("Priya S.");
    });

    it("rejects an empty update and ignores email or role changes", async () => {
      const empty = await request(app).patch("/api/users/me").set(bearer(citizen.token)).send({ email: "x@example.com", role: "admin" });
      expect(empty.status).toBe(400);
      expect(empty.body.error.details).toEqual([{ field: "body", message: "Provide at least one field to update." }]);
      const me = await request(app).get("/api/auth/me").set(bearer(citizen.token));
      expect(me.body.data).toMatchObject({ email: "priya@example.com", role: "citizen" });
    });
  });

  describe("PATCH /me/password", () => {
    it("requires the current password and makes the new one the only one that works", async () => {
      const wrong = await request(app).patch("/api/users/me/password").set(bearer(citizen.token)).send({ currentPassword: "nope nope nope", newPassword: "brand new password" });
      expect(wrong.status).toBe(401);
      expect(wrong.body.error.code).toBe("INVALID_CREDENTIALS");

      const ok = await request(app).patch("/api/users/me/password").set(bearer(citizen.token)).send({ currentPassword: PASSWORD, newPassword: "brand new password" });
      expect(ok.status).toBe(200);
      expect(ok.body.data).toMatchObject({ id: citizen.id, email: "priya@example.com" });
      expect(ok.body.data).not.toHaveProperty("passwordHash");

      const oldLogin = await request(app).post("/api/auth/login").send({ email: "priya@example.com", password: PASSWORD });
      expect(oldLogin.status).toBe(401);
      const newLogin = await request(app).post("/api/auth/login").send({ email: "priya@example.com", password: "brand new password" });
      expect(newLogin.status).toBe(200);
    });
  });

  describe("admin authorization", () => {
    it("lets admins in and keeps citizens out of every admin route", async () => {
      expect((await request(app).get("/api/users").set(bearer(citizen.token))).status).toBe(403);
      expect((await request(app).get(`/api/users/${citizen.id}`).set(bearer(citizen.token))).status).toBe(403);
      const patch = await request(app).patch(`/api/users/${citizen.id}`).set(bearer(citizen.token)).send({ role: "admin" });
      expect(patch.status).toBe(403);
      expect(patch.body.error).toEqual({ code: "FORBIDDEN", message: expect.stringMatching(/administrator/), details: [] });
      expect((await request(app).get("/api/users").set(bearer(admin.token))).status).toBe(200);
    });
  });

  describe("GET /", () => {
    beforeEach(async () => {
      const third = await createAccount({ name: "Ravi Kumar", email: "ravi@example.org", isActive: false });
      await createIncident(citizen.user);
      await createIncident(citizen.user, { title: "Second report by Priya", status: "REJECTED" });
      await createIncident(third.user);
    });

    it("lists rows with incidentCount and isActive, newest first, with pagination meta", async () => {
      const res = await request(app).get("/api/users").set(bearer(admin.token));
      expect(res.status).toBe(200);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });
      expect(res.body.data.map((u: { name: string }) => u.name)).toEqual(["Ravi Kumar", "Priya Sharma", "Admin One"]);
      expect(res.body.data[1]).toEqual({
        id: citizen.id,
        name: "Priya Sharma",
        email: "priya@example.com",
        role: "citizen",
        phone: "9876543210",
        isActive: true,
        createdAt: expect.any(String),
        incidentCount: 2,
      });
      expect(res.body.data[0]).toMatchObject({ isActive: false, incidentCount: 1 });
      expect(res.body.data[2]).toMatchObject({ role: "admin", incidentCount: 0 });
    });

    it("searches name and email case-insensitively with regex characters escaped", async () => {
      const byName = await request(app).get("/api/users?q=PRIYA").set(bearer(admin.token));
      expect(byName.body.data.map((u: { id: string }) => u.id)).toEqual([citizen.id]);
      const byEmail = await request(app).get("/api/users?q=example.org").set(bearer(admin.token));
      expect(byEmail.body.data.map((u: { name: string }) => u.name)).toEqual(["Ravi Kumar"]);
      const regex = await request(app).get("/api/users?q=" + encodeURIComponent(".*(")).set(bearer(admin.token));
      expect(regex.status).toBe(200);
      expect(regex.body.data).toEqual([]);
    });

    it("filters by role and isActive, sorts by name and paginates", async () => {
      const admins = await request(app).get("/api/users?role=admin").set(bearer(admin.token));
      expect(admins.body.data.map((u: { id: string }) => u.id)).toEqual([admin.id]);
      const inactive = await request(app).get("/api/users?isActive=false").set(bearer(admin.token));
      expect(inactive.body.data.map((u: { name: string }) => u.name)).toEqual(["Ravi Kumar"]);
      const byName = await request(app).get("/api/users?sort=name").set(bearer(admin.token));
      expect(byName.body.data.map((u: { name: string }) => u.name)).toEqual(["Admin One", "Priya Sharma", "Ravi Kumar"]);
      const page = await request(app).get("/api/users?sort=-email&limit=2&page=2").set(bearer(admin.token));
      expect(page.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
      expect(page.body.data.map((u: { email: string }) => u.email)).toEqual(["admin@example.com"]);
      const bad = await request(app).get("/api/users?sort=phone&isActive=maybe").set(bearer(admin.token));
      expect(bad.status).toBe(400);
      expect(bad.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(["isActive", "sort"]);
    });
  });

  describe("GET /:id", () => {
    it("returns the row plus incidentsByStatus with every status key", async () => {
      await createIncident(citizen.user);
      await createIncident(citizen.user, { status: "REJECTED" });
      await createIncident(citizen.user, { status: "REJECTED" });
      const res = await request(app).get(`/api/users/${citizen.id}`).set(bearer(admin.token));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: citizen.id, incidentCount: 3, isActive: true });
      expect(Object.keys(res.body.data.incidentsByStatus).sort()).toEqual([...STATUSES].sort());
      expect(res.body.data.incidentsByStatus).toMatchObject({ SUBMITTED: 1, REJECTED: 2, VERIFIED: 0 });
    });

    it("answers 400 for a malformed id and 404 for an unknown one", async () => {
      const malformed = await request(app).get("/api/users/not-an-id").set(bearer(admin.token));
      expect(malformed.status).toBe(400);
      expect(malformed.body.error.details[0].field).toBe("id");
      const unknown = await request(app).get("/api/users/66d5a2b8c2b7a4e8f1a2b3d0").set(bearer(admin.token));
      expect(unknown.status).toBe(404);
      expect(unknown.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PATCH /:id", () => {
    it("deactivates and promotes users, taking effect on their next request", async () => {
      const off = await request(app).patch(`/api/users/${citizen.id}`).set(bearer(admin.token)).send({ isActive: false });
      expect(off.status).toBe(200);
      expect(off.body.data).toMatchObject({ id: citizen.id, isActive: false, incidentCount: 0 });
      expect(off.body.data.incidentsByStatus).toBeDefined();
      expect((await request(app).get("/api/auth/me").set(bearer(citizen.token))).status).toBe(401);

      const promote = await request(app).patch(`/api/users/${citizen.id}`).set(bearer(admin.token)).send({ isActive: true, role: "admin" });
      expect(promote.body.data).toMatchObject({ isActive: true, role: "admin" });
      expect((await request(app).get("/api/users").set(bearer(citizen.token))).status).toBe(200);
    });

    it("stops an admin from changing their own role or deactivating themselves", async () => {
      const role = await request(app).patch(`/api/users/${admin.id}`).set(bearer(admin.token)).send({ role: "citizen" });
      expect(role.status).toBe(400);
      expect(role.body.error).toMatchObject({ code: "VALIDATION_ERROR", details: [{ field: "id", message: expect.stringMatching(/own role/) }] });
      const off = await request(app).patch(`/api/users/${admin.id}`).set(bearer(admin.token)).send({ isActive: false });
      expect(off.status).toBe(400);
      expect(off.body.error.details).toEqual([{ field: "id", message: expect.stringMatching(/deactivate/) }]);
      // Restating the current state is not a change and goes through.
      const same = await request(app).patch(`/api/users/${admin.id}`).set(bearer(admin.token)).send({ isActive: true, role: "admin" });
      expect(same.status).toBe(200);
      const empty = await request(app).patch(`/api/users/${citizen.id}`).set(bearer(admin.token)).send({});
      expect(empty.status).toBe(400);
    });
  });
});
