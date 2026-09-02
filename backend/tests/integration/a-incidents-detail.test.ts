import { existsSync } from "node:fs";
import path from "node:path";
import { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { UPLOAD_ROOT } from "../../src/lib/storage.js";
import { Incident, type IncidentDocument } from "../../src/models/Incident.js";
import { type Account, advance, bearer, createAccount, createIncident } from "../helpers/a-fixtures.js";
import { jpegBuffer, pngBuffer } from "../helpers/images.js";
import { clearCollections, closeTestDb, connectTestDb, mongoUri } from "../setup/db.js";

const UNKNOWN_ID = "66d5a2b8c2b7a4e8f1a2b3d0";

/** GET, PATCH and DELETE /api/incidents/:id: privacy variants, edit rules, image files. */
describe.skipIf(!mongoUri())("/api/incidents/:id", () => {
  let app: Express;
  let admin: Account;
  let reporter: Account;
  let other: Account;
  let verified: IncidentDocument;

  const get = (id: string, token: string) => request(app).get(`/api/incidents/${id}`).set(bearer(token));
  const patch = (id: string, token: string) => request(app).patch(`/api/incidents/${id}`).set(bearer(token));
  const fileOf = (url: string) => path.join(UPLOAD_ROOT, url.replace("/uploads/", ""));

  beforeAll(async () => {
    await connectTestDb("a_incidents_detail");
    app = createApp();
  });

  afterAll(closeTestDb);

  beforeEach(async () => {
    await clearCollections();
    admin = await createAccount({ name: "Admin One", role: "admin" });
    reporter = await createAccount({ name: "Priya Sharma", email: "priya@example.com" });
    other = await createAccount({ name: "Someone Else" });
    verified = await advance(await createIncident(reporter.user), admin.user, [["UNDER_REVIEW", "Looking into it."], "VERIFIED"]);
  });

  describe("GET", () => {
    it("gives the admin everything: reporter email, verifier, notes, actors and riskEstimate", async () => {
      const res = await get(String(verified._id), admin.token);
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        reportedBy: { id: reporter.id, name: "Priya Sharma", email: "priya@example.com" },
        verifiedBy: { id: admin.id, name: "Admin One" },
        adminNote: "Looking into it.",
        riskEstimate: null,
        verification: "VERIFIED",
      });
      expect(res.body.data.statusHistory[1]).toEqual({
        field: "status",
        from: "SUBMITTED",
        to: "UNDER_REVIEW",
        note: "Looking into it.",
        changedBy: { id: admin.id, name: "Admin One" },
        at: expect.any(String),
      });
    });

    it("gives the reporter the notes but no admin identity and no risk estimate", async () => {
      const res = await get(String(verified._id), reporter.token);
      expect(res.status).toBe(200);
      expect(res.body.data.reportedBy).toEqual({ id: reporter.id, name: "Priya Sharma" });
      expect(res.body.data.verifiedBy).toBeNull();
      expect(res.body.data.adminNote).toBe("Looking into it.");
      expect(res.body.data.statusHistory[1]).toMatchObject({ note: "Looking into it.", changedBy: null });
      expect(res.body.data).not.toHaveProperty("riskEstimate");
    });

    it("gives another citizen neither identities nor notes", async () => {
      const res = await get(String(verified._id), other.token);
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ reportedBy: null, verifiedBy: null, title: verified.title, verification: "VERIFIED" });
      expect(res.body.data).not.toHaveProperty("adminNote");
      expect(res.body.data).not.toHaveProperty("riskEstimate");
      expect(res.body.data.statusHistory[1]).toEqual({ field: "status", from: "SUBMITTED", to: "UNDER_REVIEW", changedBy: null, at: expect.any(String) });
    });

    it("hides a REJECTED incident from everyone but its reporter and admins", async () => {
      const rejected = await advance(await createIncident(reporter.user, { title: "Rejected duplicate" }), admin.user, [["REJECTED", "Duplicate."]]);
      const id = String(rejected._id);
      expect((await get(id, other.token)).status).toBe(404);
      expect((await get(id, reporter.token)).body.data.adminNote).toBe("Duplicate.");
      expect((await get(id, admin.token)).status).toBe(200);
    });

    it("answers 400 for a malformed id and 404 for an unknown one", async () => {
      const malformed = await get("nope", reporter.token);
      expect(malformed.status).toBe(400);
      expect(malformed.body.error.details).toEqual([{ field: "id", message: "Must be a valid id" }]);
      expect((await get(UNKNOWN_ID, admin.token)).status).toBe(404);
    });
  });

  describe("PATCH", () => {
    let submitted: IncidentDocument;

    beforeEach(async () => {
      submitted = await createIncident(reporter.user, { title: "Fresh report awaiting review" });
    });

    it("lets the reporter edit a SUBMITTED report and keeps the other coordinate", async () => {
      const res = await patch(String(submitted._id), reporter.token).send({ title: "Edited title", latitude: 17.5, severity: "LOW" });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ title: "Edited title", latitude: 17.5, longitude: 78.3814, severity: "LOW", status: "SUBMITTED" });
      expect(res.body.data.reportedBy).toEqual({ id: reporter.id, name: "Priya Sharma" });
      const stored = await Incident.findById(submitted._id);
      expect(stored?.location.coordinates).toEqual([78.3814, 17.5]);
    });

    it("answers 404 for someone else's report and 403 once it is no longer SUBMITTED", async () => {
      const stranger = await patch(String(submitted._id), other.token).send({ title: "Not my report at all" });
      expect(stranger.status).toBe(404);
      const reviewed = await patch(String(verified._id), reporter.token).send({ title: "Trying to edit later" });
      expect(reviewed.status).toBe(403);
      expect(reviewed.body.error.code).toBe("FORBIDDEN");
      expect((await patch(UNKNOWN_ID, reporter.token).send({ title: "Ghost report title" })).status).toBe(404);
    });

    it("lets an admin edit at any status, including the admin note, but not citizens", async () => {
      const res = await patch(String(verified._id), admin.token).send({ description: "Rewritten by the administrator.", adminNote: "Crew scheduled." });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ description: "Rewritten by the administrator.", adminNote: "Crew scheduled.", status: "VERIFIED" });
      expect(res.body.data.reportedBy.email).toBe("priya@example.com");
      const citizen = await patch(String(submitted._id), reporter.token).send({ adminNote: "Sneaky note" });
      expect(citizen.status).toBe(400);
      expect(citizen.body.error.details).toEqual([{ field: "adminNote", message: expect.stringMatching(/administrators/) }]);
    });

    it("points status and priority at their endpoints and rejects an empty edit", async () => {
      const res = await patch(String(submitted._id), admin.token).send({ status: "VERIFIED", priority: "HIGH" });
      expect(res.status).toBe(400);
      expect(res.body.error.details).toEqual([
        { field: "status", message: "Use PATCH /api/incidents/:id/status to change the status." },
        { field: "priority", message: "Use PATCH /api/incidents/:id/priority to change the priority." },
      ]);
      const empty = await patch(String(submitted._id), reporter.token).send({});
      expect(empty.status).toBe(400);
      expect(empty.body.error.details).toEqual([{ field: "body", message: "No changes were provided." }]);
      const bad = await patch("not-an-id", reporter.token).send({ title: "Whatever title" });
      expect(bad.status).toBe(400);
      expect(bad.body.error.details[0].field).toBe("id");
    });

    it("adds, replaces and removes the image, deleting files that are no longer referenced", async () => {
      const id = String(submitted._id);
      const added = await patch(id, reporter.token).field("address", "Near the flyover exit").attach("image", pngBuffer(32), "a.png");
      expect(added.status).toBe(200);
      expect(added.body.data.address).toBe("Near the flyover exit");
      expect(added.body.data.image).toMatchObject({ mimeType: "image/png", size: pngBuffer(32).length });
      const first = fileOf(added.body.data.image.url);
      expect(existsSync(first)).toBe(true);

      const replaced = await patch(id, reporter.token).attach("image", jpegBuffer(), "b.jpg");
      expect(replaced.status).toBe(200);
      expect(replaced.body.data.image).toMatchObject({ mimeType: "image/jpeg", url: expect.stringMatching(/\.jpg$/) });
      const second = fileOf(replaced.body.data.image.url);
      expect(existsSync(first)).toBe(false);
      expect(existsSync(second)).toBe(true);

      const removed = await patch(id, reporter.token).field("removeImage", "true");
      expect(removed.status).toBe(200);
      expect(removed.body.data.image).toBeNull();
      expect(existsSync(second)).toBe(false);
      expect((await Incident.findById(id))?.image).toBeNull();

      const nothingLeft = await patch(id, reporter.token).send({ removeImage: true });
      expect(nothingLeft.status).toBe(400);
    });
  });

  describe("DELETE", () => {
    it("is admin only, removes the document and its image, then answers 404", async () => {
      const created = await request(app)
        .post("/api/incidents")
        .set(bearer(reporter.token))
        .field("title", "Report with a photo")
        .field("description", "This one carries an image that must be deleted with it.")
        .field("category", "OBSTRUCTION")
        .field("severity", "LOW")
        .field("latitude", "17.4")
        .field("longitude", "78.4")
        .attach("image", pngBuffer(16), "photo.png");
      expect(created.status).toBe(201);
      const id = created.body.data.id as string;
      const file = fileOf(created.body.data.image.url);
      expect(existsSync(file)).toBe(true);

      const citizen = await request(app).delete(`/api/incidents/${id}`).set(bearer(reporter.token));
      expect(citizen.status).toBe(403);

      const res = await request(app).delete(`/api/incidents/${id}`).set(bearer(admin.token));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: { id } });
      expect(await Incident.findById(id)).toBeNull();
      expect(existsSync(file)).toBe(false);

      expect((await request(app).delete(`/api/incidents/${id}`).set(bearer(admin.token))).status).toBe(404);
      expect((await request(app).delete("/api/incidents/bad-id").set(bearer(admin.token))).status).toBe(400);
    });
  });
});
