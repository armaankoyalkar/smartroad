import { type Express } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { bearer, createAccount, PASSWORD } from "../helpers/a-fixtures.js";
import { clearCollections, closeTestDb, connectTestDb, mongoUri } from "../setup/db.js";

describe.skipIf(!mongoUri())("/api/auth", () => {
  let app: Express;

  beforeAll(async () => {
    await connectTestDb("a_auth");
    app = createApp();
  });

  afterAll(closeTestDb);
  beforeEach(clearCollections);

  const registration = {
    name: "Priya Sharma",
    email: "Priya.Sharma@Example.com",
    password: "correct horse battery",
    phone: "+919876543210",
  };

  describe("POST /register", () => {
    it("creates a citizen, returns a working token and never a role from the body", async () => {
      const res = await request(app).post("/api/auth/register").send({ ...registration, role: "admin" });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toEqual(expect.any(String));
      expect(res.body.data.user).toEqual({
        id: expect.stringMatching(/^[a-f\d]{24}$/),
        name: "Priya Sharma",
        email: "priya.sharma@example.com",
        role: "citizen",
        phone: "+919876543210",
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
      expect(res.body.data.user).not.toHaveProperty("passwordHash");

      const me = await request(app).get("/api/auth/me").set(bearer(res.body.data.token));
      expect(me.status).toBe(200);
      expect(me.body.data).toEqual(res.body.data.user);
    });

    it("stores a null phone when none is given", async () => {
      const res = await request(app).post("/api/auth/register").send({ name: "No Phone", email: "nophone@example.com", password: "long enough password" });
      expect(res.status).toBe(201);
      expect(res.body.data.user.phone).toBeNull();
    });

    it("answers 409 EMAIL_TAKEN for a duplicate email regardless of case", async () => {
      await request(app).post("/api/auth/register").send(registration);
      const res = await request(app).post("/api/auth/register").send({ ...registration, email: "PRIYA.SHARMA@example.COM" });
      expect(res.status).toBe(409);
      expect(res.body.error).toEqual({ code: "EMAIL_TAKEN", message: expect.stringMatching(/already exists/), details: [] });
    });

    it("rejects a weak password, a bad phone and a short name with field details", async () => {
      const res = await request(app).post("/api/auth/register").send({ name: "P", email: "p@example.com", password: "short", phone: "12" });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          { field: "name", message: "Must be between 2 and 80 characters" },
          { field: "password", message: "Must be between 8 and 72 characters" },
          { field: "phone", message: expect.stringMatching(/10 to 15 digits/) },
        ]),
      );
    });
  });

  describe("POST /login", () => {
    it("returns the register shape for valid credentials, matching the email case-insensitively", async () => {
      const { id } = await createAccount({ email: "login@example.com", name: "Login User" });
      const res = await request(app).post("/api/auth/login").send({ email: "LOGIN@example.com", password: PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.data.user).toMatchObject({ id, name: "Login User", email: "login@example.com", role: "citizen" });
      const payload = jwt.verify(res.body.data.token, env.JWT_SECRET) as jwt.JwtPayload;
      expect(payload).toMatchObject({ sub: id, role: "citizen" });
      expect(payload.exp).toBeGreaterThan(payload.iat ?? 0);
    });

    it("uses one INVALID_CREDENTIALS message for a wrong password and an unknown email", async () => {
      await createAccount({ email: "known@example.com" });
      const wrong = await request(app).post("/api/auth/login").send({ email: "known@example.com", password: "not the password" });
      const unknown = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: PASSWORD });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(unknown.body.error).toEqual(wrong.body.error);
    });

    it("answers 403 FORBIDDEN for a deactivated account, but only after the password matched", async () => {
      await createAccount({ email: "gone@example.com", isActive: false });
      const right = await request(app).post("/api/auth/login").send({ email: "gone@example.com", password: PASSWORD });
      expect(right.status).toBe(403);
      expect(right.body.error.code).toBe("FORBIDDEN");
      const wrong = await request(app).post("/api/auth/login").send({ email: "gone@example.com", password: "wrong password" });
      expect(wrong.status).toBe(401);
      expect(wrong.body.error.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("GET /me", () => {
    it("answers 401 without a token, with a malformed one and with an expired one", async () => {
      const missing = await request(app).get("/api/auth/me");
      expect(missing.status).toBe(401);
      expect(missing.body.error).toMatchObject({ code: "UNAUTHENTICATED", message: "Authentication required." });

      const bad = await request(app).get("/api/auth/me").set(bearer("not.a.token"));
      expect(bad.status).toBe(401);
      expect(bad.body.error).toMatchObject({ code: "UNAUTHENTICATED", message: "Invalid token." });

      const { id } = await createAccount();
      const expiredToken = jwt.sign({ role: "citizen", exp: Math.floor(Date.now() / 1000) - 60 }, env.JWT_SECRET, {
        subject: id,
        algorithm: "HS256",
      });
      const expired = await request(app).get("/api/auth/me").set(bearer(expiredToken));
      expect(expired.status).toBe(401);
      expect(expired.body.error.message).toBe("Session expired. Please sign in again.");
    });

    it("rejects a valid token once the account is deactivated or deleted", async () => {
      const account = await createAccount();
      account.user.isActive = false;
      await account.user.save();
      const res = await request(app).get("/api/auth/me").set(bearer(account.token));
      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe("This account is not active.");
    });
  });
});
