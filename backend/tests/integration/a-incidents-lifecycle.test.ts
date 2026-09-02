import { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { type Account, bearer, createAccount, createIncident } from "../helpers/a-fixtures.js";
import { clearCollections, closeTestDb, connectTestDb, mongoUri } from "../setup/db.js";

interface HistoryEntry {
  field: string;
  from: string | null;
  to: string;
  note: string | null;
  changedBy: { id: string; name: string } | null;
}

/** PATCH /api/incidents/:id/status and /priority: the lifecycle rules over HTTP. */
describe.skipIf(!mongoUri())("incident status and priority endpoints", () => {
  let app: Express;
  let admin: Account;
  let admin2: Account;
  let reporter: Account;
  let id: string;

  const setStatus = (token: string, body: Record<string, unknown>) => request(app).patch(`/api/incidents/${id}/status`).set(bearer(token)).send(body);
  const setPriority = (token: string, body: Record<string, unknown>) => request(app).patch(`/api/incidents/${id}/priority`).set(bearer(token)).send(body);

  beforeAll(async () => {
    await connectTestDb("a_incidents_lifecycle");
    app = createApp();
  });

  afterAll(closeTestDb);

  beforeEach(async () => {
    await clearCollections();
    admin = await createAccount({ name: "Admin One", role: "admin" });
    admin2 = await createAccount({ name: "Admin Two", role: "admin" });
    reporter = await createAccount({ name: "Priya Sharma" });
    id = String((await createIncident(reporter.user))._id);
  });

  it("is admin only", async () => {
    expect((await setStatus(reporter.token, { status: "UNDER_REVIEW" })).status).toBe(403);
    expect((await setPriority(reporter.token, { priority: "HIGH" })).status).toBe(403);
  });

  it("walks the valid chain, setting verifiedBy, resolvedAt and the history as it goes", async () => {
    const review = await setStatus(admin.token, { status: "UNDER_REVIEW" });
    expect(review.status).toBe(200);
    expect(review.body.data).toMatchObject({ status: "UNDER_REVIEW", verification: "PENDING", verifiedBy: null, resolvedAt: null });
    expect(review.body.data.statusHistory).toHaveLength(2);
    expect(review.body.data.statusHistory[1]).toMatchObject({
      field: "status",
      from: "SUBMITTED",
      to: "UNDER_REVIEW",
      note: null,
      changedBy: { id: admin.id, name: "Admin One" },
    });

    const verified = await setStatus(admin.token, { status: "VERIFIED", note: "Confirmed by site photo." });
    expect(verified.body.data).toMatchObject({
      status: "VERIFIED",
      verification: "VERIFIED",
      verifiedBy: { id: admin.id, name: "Admin One" },
      adminNote: "Confirmed by site photo.",
      reportedBy: { id: reporter.id, name: "Priya Sharma" },
    });

    expect((await setStatus(admin.token, { status: "IN_PROGRESS" })).body.data.status).toBe("IN_PROGRESS");

    const resolved = await setStatus(admin.token, { status: "RESOLVED" });
    expect(resolved.body.data.status).toBe("RESOLVED");
    expect(resolved.body.data.resolvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const reopened = await setStatus(admin.token, { status: "IN_PROGRESS" });
    expect(reopened.body.data).toMatchObject({ status: "IN_PROGRESS", resolvedAt: null });
    expect(reopened.body.data.statusHistory.map((h: HistoryEntry) => h.to)).toEqual([
      "SUBMITTED",
      "UNDER_REVIEW",
      "VERIFIED",
      "IN_PROGRESS",
      "RESOLVED",
      "IN_PROGRESS",
    ]);
  });

  it("answers 409 INVALID_TRANSITION with the allowed moves and 400 for unknown statuses", async () => {
    const res = await setStatus(admin.token, { status: "RESOLVED" });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: "INVALID_TRANSITION",
      message: "Cannot move an incident from SUBMITTED to RESOLVED.",
      details: [{ from: "SUBMITTED", to: "RESOLVED", allowed: ["UNDER_REVIEW", "REJECTED"] }],
    });
    const unknown = await setStatus(admin.token, { status: "DONE" });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.details[0].field).toBe("status");
    const missing = await request(app).patch("/api/incidents/66d5a2b8c2b7a4e8f1a2b3d0/status").set(bearer(admin.token)).send({ status: "UNDER_REVIEW" });
    expect(missing.status).toBe(404);
  });

  it("requires a note to reject, shows the reason to the reporter and clears it on reconsideration", async () => {
    const bare = await setStatus(admin.token, { status: "REJECTED" });
    expect(bare.status).toBe(400);
    expect(bare.body.error.code).toBe("NOTE_REQUIRED");
    expect((await setStatus(admin.token, { status: "REJECTED", note: "   " })).body.error.code).toBe("NOTE_REQUIRED");

    const rejected = await setStatus(admin.token, { status: "REJECTED", note: "Duplicate of an earlier report." });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data).toMatchObject({ status: "REJECTED", verification: "REJECTED", adminNote: "Duplicate of an earlier report." });

    const seen = await request(app).get(`/api/incidents/${id}`).set(bearer(reporter.token));
    expect(seen.status).toBe(200);
    expect(seen.body.data.adminNote).toBe("Duplicate of an earlier report.");
    expect(seen.body.data.statusHistory[1]).toMatchObject({ to: "REJECTED", note: "Duplicate of an earlier report.", changedBy: null });

    const reconsidered = await setStatus(admin.token, { status: "UNDER_REVIEW" });
    expect(reconsidered.body.data.adminNote).toBeNull();
    expect(reconsidered.body.data.statusHistory[1].note).toBe("Duplicate of an earlier report.");
  });

  it("keeps the first verifier even when another admin verifies again later", async () => {
    await setStatus(admin.token, { status: "UNDER_REVIEW" });
    await setStatus(admin.token, { status: "VERIFIED" });
    await setStatus(admin2.token, { status: "REJECTED", note: "Wrong location, needs another look." });
    await setStatus(admin2.token, { status: "UNDER_REVIEW" });
    const again = await setStatus(admin2.token, { status: "VERIFIED" });
    expect(again.body.data.verifiedBy).toEqual({ id: admin.id, name: "Admin One" });
    const actors = again.body.data.statusHistory.map((h: HistoryEntry) => h.changedBy?.name ?? null);
    expect(actors).toEqual([null, "Admin One", "Admin One", "Admin Two", "Admin Two", "Admin Two"]);
  });

  it("sets and clears the priority with history entries, at any status", async () => {
    const set = await setPriority(admin.token, { priority: "HIGH", note: "Blocked lane on a main road." });
    expect(set.status).toBe(200);
    expect(set.body.data).toMatchObject({ priority: "HIGH", status: "SUBMITTED", adminNote: "Blocked lane on a main road." });
    expect(set.body.data.statusHistory[1]).toMatchObject({
      field: "priority",
      from: null,
      to: "HIGH",
      note: "Blocked lane on a main road.",
      changedBy: { id: admin.id, name: "Admin One" },
    });

    const cleared = await setPriority(admin2.token, { priority: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.priority).toBeNull();
    expect(cleared.body.data.statusHistory[2]).toMatchObject({ field: "priority", from: "HIGH", to: "UNASSIGNED", note: null, changedBy: { id: admin2.id } });

    expect((await setPriority(admin.token, {})).status).toBe(400);
    const bad = await setPriority(admin.token, { priority: "URGENT" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.details[0]).toEqual({ field: "priority", message: "Must be one of LOW, MEDIUM, HIGH, CRITICAL or null" });
  });
});
