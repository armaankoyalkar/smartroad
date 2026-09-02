import { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { cache } from "../../src/lib/cache.js";
import { type IncidentFilter } from "../../src/lib/incidentFilters.js";
import { formatDay } from "../../src/lib/time.js";
import { Incident, type IncidentDocument } from "../../src/models/Incident.js";
import {
  createFixtureIncidents,
  createTestUsers,
  type FixtureKey,
  type FixtureUsers,
} from "../helpers/b-fixtures.js";
import { closeTestDb, connectTestDb, mongoUri } from "../setup/db.js";

/**
 * /api/analytics against MongoDB with the fixture table in tests/helpers/b-fixtures.ts.
 * Expected numbers are derived by hand from that table.
 */
describe.skipIf(!mongoUri())("GET /api/analytics/*", () => {
  let app: Express;
  let users: FixtureUsers;
  let docs: Record<FixtureKey, IncidentDocument>;
  const now = new Date();

  beforeAll(async () => {
    await connectTestDb("b_analytics");
    app = createApp();
    users = await createTestUsers();
    docs = await createFixtureIncidents(users, now);
  });

  afterAll(closeTestDb);

  beforeEach(() => cache.clear());

  const admin = () => ({ Authorization: `Bearer ${users.adminToken}` });
  const citizen = () => ({ Authorization: `Bearer ${users.citizenToken}` });

  describe("/public", () => {
    it("counts real, non-rejected reports only and caches the answer", async () => {
      const first = await request(app).get("/api/analytics/public");
      expect(first.status).toBe(200);
      // A B C D E K L M filed; E K resolved; A B C D E in the last 30 days; E resolved in the last 30 days.
      expect(first.body.data).toMatchObject({
        reportsFiled: 8,
        reportsResolved: 2,
        reportsLast30Days: 5,
        resolvedLast30Days: 1,
      });
      expect(first.body.data.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(first.body.meta).toEqual({ cached: false });

      await Incident.create({
        title: "Another real report",
        description: "Created after the first public call; the cached figures must not change yet.",
        category: "OTHER",
        severity: "LOW",
        location: { type: "Point", coordinates: [78.4867, 17.385] },
        reportedBy: users.citizen._id,
      });
      const second = await request(app).get("/api/analytics/public");
      expect(second.body.data.reportsFiled).toBe(8);
      expect(second.body.meta).toEqual({ cached: true });

      cache.clear();
      const third = await request(app).get("/api/analytics/public");
      expect(third.body.data.reportsFiled).toBe(9);
      await Incident.deleteOne({ title: "Another real report" });
    });

    it("cross-checks the figures against direct queries", async () => {
      const res = await request(app).get("/api/analytics/public");
      const real: IncidentFilter = { status: { $ne: "REJECTED" }, source: { $ne: "seed" } };
      expect(res.body.data.reportsFiled).toBe(await Incident.countDocuments(real));
      expect(res.body.data.reportsResolved).toBe(
        await Incident.countDocuments({ ...real, status: "RESOLVED" }),
      );
    });
  });

  describe("/mine", () => {
    it("requires a token and counts the caller's own reports including rejected ones", async () => {
      expect((await request(app).get("/api/analytics/mine")).status).toBe(401);
      const res = await request(app).get("/api/analytics/mine").set(citizen());
      expect(res.status).toBe(200);
      // citizen: A B C F G J K -> pending A B; active C; resolved G K; rejected F J
      expect(res.body.data).toEqual({ total: 7, pending: 2, active: 1, resolved: 2, rejected: 2 });
      const other = await request(app)
        .get("/api/analytics/mine")
        .set({ Authorization: `Bearer ${users.otherToken}` });
      // other: D E H I L M -> pending H; active D I L M; resolved E
      expect(other.body.data).toEqual({ total: 6, pending: 1, active: 4, resolved: 1, rejected: 0 });
      const mine = await Incident.countDocuments({ reportedBy: users.citizen._id });
      expect(res.body.data.total).toBe(mine);
    });
  });

  describe("/summary", () => {
    it("is admin only", async () => {
      expect((await request(app).get("/api/analytics/summary")).status).toBe(401);
      const res = await request(app).get("/api/analytics/summary").set(citizen());
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("returns every count with all status keys and the seed count", async () => {
      const res = await request(app).get("/api/analytics/summary").set(admin());
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        total: 13,
        pendingVerification: 3,
        verified: 3,
        active: 5,
        resolved: 3,
        rejected: 2,
        highPriorityOpen: 4,
        byStatus: { SUBMITTED: 2, UNDER_REVIEW: 1, VERIFIED: 3, IN_PROGRESS: 2, RESOLVED: 3, REJECTED: 2 },
        seedCount: 4,
      });
      expect(res.body.meta).toEqual({ from: null, to: null, includeSeed: true });
      expect(res.body.data.total).toBe(await Incident.countDocuments());
      expect(res.body.data.seedCount).toBe(await Incident.countDocuments({ source: "seed" }));
    });

    it("excludes seed records with includeSeed=false and honours the date range", async () => {
      const noSeed = await request(app).get("/api/analytics/summary?includeSeed=false").set(admin());
      expect(noSeed.body.data).toMatchObject({
        total: 9,
        verified: 2,
        highPriorityOpen: 3,
        seedCount: 0,
        byStatus: { SUBMITTED: 1, UNDER_REVIEW: 1, VERIFIED: 2, IN_PROGRESS: 2, RESOLVED: 2, REJECTED: 1 },
      });
      expect(noSeed.body.meta.includeSeed).toBe(false);

      const from = new Date(now.getTime() - 6 * 86_400_000).toISOString();
      const recent = await request(app).get("/api/analytics/summary").query({ from }).set(admin());
      expect(recent.status).toBe(200);
      // A(1d) B(3d) C(5d) F(2d)
      expect(recent.body.data).toMatchObject({
        total: 4,
        pendingVerification: 2,
        verified: 1,
        rejected: 1,
        seedCount: 0,
      });
      expect(recent.body.meta.from).toBe(from);

      const bad = await request(app).get("/api/analytics/summary?from=2026-09-02&to=2026-09-01").set(admin());
      expect(bad.status).toBe(400);
      expect(bad.body.error.details[0].field).toBe("to");
    });
  });

  describe("/breakdown", () => {
    it("requires `by`", async () => {
      const res = await request(app).get("/api/analytics/breakdown").set(admin());
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe("by");
    });

    it("by=category lists all ten categories with colours, sorted by count then category order", async () => {
      const res = await request(app).get("/api/analytics/breakdown?by=category").set(admin());
      expect(res.status).toBe(200);
      const rows = res.body.data as Array<{ key: string; label: string; count: number; color: string }>;
      expect(rows.map((r) => [r.key, r.count])).toEqual([
        ["POTHOLE", 3],
        ["ACCIDENT", 2],
        ["ROAD_DAMAGE", 1],
        ["TRAFFIC_CONGESTION", 1],
        ["TRAFFIC_SIGNAL", 1],
        ["STREET_LIGHT", 1],
        ["UNSAFE_ROAD", 1],
        ["OBSTRUCTION", 1],
        ["WATERLOGGING", 1],
        ["OTHER", 1],
      ]);
      expect(rows[0]).toMatchObject({ label: "Pothole", color: "#D97706" });
      expect(res.body.meta).toEqual({ by: "category", from: null, to: null, includeSeed: true });
    });

    it("by=status, priority, severity and riskLevel map nulls to UNASSIGNED / NONE", async () => {
      const status = await request(app).get("/api/analytics/breakdown?by=status").set(admin());
      expect(status.body.data.map((r: { key: string; count: number }) => [r.key, r.count])).toEqual([
        ["VERIFIED", 3],
        ["RESOLVED", 3],
        ["SUBMITTED", 2],
        ["IN_PROGRESS", 2],
        ["REJECTED", 2],
        ["UNDER_REVIEW", 1],
      ]);
      expect(status.body.data[0].color).toMatch(/^#[0-9A-F]{6}$/i);

      const priority = await request(app).get("/api/analytics/breakdown?by=priority").set(admin());
      expect(priority.body.data.map((r: { key: string; count: number }) => [r.key, r.count])).toEqual([
        ["UNASSIGNED", 5],
        ["HIGH", 4],
        ["MEDIUM", 2],
        ["LOW", 1],
        ["CRITICAL", 1],
      ]);
      expect(priority.body.data[0].label).toBe("Unassigned");

      const severity = await request(app).get("/api/analytics/breakdown?by=severity").set(admin());
      expect(severity.body.data.map((r: { key: string; count: number }) => [r.key, r.count])).toEqual([
        ["MEDIUM", 5],
        ["LOW", 4],
        ["HIGH", 4],
      ]);

      const risk = await request(app).get("/api/analytics/breakdown?by=riskLevel").set(admin());
      expect(risk.body.data.map((r: { key: string; count: number }) => [r.key, r.count])).toEqual([
        ["NONE", 10],
        ["LOW", 1],
        ["MEDIUM", 1],
        ["HIGH", 1],
      ]);
      expect(risk.body.data[0].label).toBe("No estimate");

      const noSeed = await request(app)
        .get("/api/analytics/breakdown?by=category&includeSeed=false")
        .set(admin());
      expect(noSeed.body.data.find((r: { key: string }) => r.key === "POTHOLE").count).toBe(2);
      expect(noSeed.body.data.find((r: { key: string }) => r.key === "STREET_LIGHT").count).toBe(0);
    });
  });

  describe("/timeline", () => {
    it("fills the default 30-day window with one point per day", async () => {
      const res = await request(app).get("/api/analytics/timeline").set(admin());
      expect(res.status).toBe(200);
      const points = res.body.data as Array<{ period: string; count: number }>;
      expect(points).toHaveLength(31);
      expect(points.every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.period))).toBe(true);
      // A B C D E F J were reported in the last 30 days.
      expect(points.reduce((sum, p) => sum + p.count, 0)).toBe(7);
      expect(points.find((p) => p.period === formatDay(docs.A.createdAt))?.count).toBeGreaterThanOrEqual(1);
      expect(res.body.meta).toMatchObject({
        granularity: "day",
        timezone: "Asia/Kolkata",
        includeSeed: true,
      });
      expect(new Date(res.body.meta.to).getTime() - new Date(res.body.meta.from).getTime()).toBe(
        30 * 86_400_000,
      );
    });

    it("uses Monday keys for 26 weeks and YYYY-MM for 12 months", async () => {
      const weeks = await request(app).get("/api/analytics/timeline?granularity=week").set(admin());
      const weekPoints = weeks.body.data as Array<{ period: string; count: number }>;
      expect(weekPoints).toHaveLength(27);
      expect(weekPoints.every((p) => new Date(`${p.period}T00:00:00Z`).getUTCDay() === 1)).toBe(true);
      expect(weekPoints.reduce((sum, p) => sum + p.count, 0)).toBe(12); // everything but M
      const months = await request(app)
        .get("/api/analytics/timeline?granularity=month&includeSeed=false")
        .set(admin());
      const monthPoints = months.body.data as Array<{ period: string; count: number }>;
      expect(monthPoints.length).toBeGreaterThanOrEqual(12);
      expect(monthPoints.length).toBeLessThanOrEqual(13);
      expect(monthPoints.every((p) => /^\d{4}-\d{2}$/.test(p.period))).toBe(true);
      expect(monthPoints.reduce((sum, p) => sum + p.count, 0)).toBe(8); // 12 minus the four seed records
      expect(months.body.meta.includeSeed).toBe(false);
    });

    it("buckets in Asia/Kolkata with an explicit range (M is 18:30 UTC on 31 March = 1 April IST)", async () => {
      const day = await request(app)
        .get("/api/analytics/timeline?granularity=day&from=2024-03-31&to=2024-04-01")
        .set(admin());
      expect(day.body.data).toEqual([
        { period: "2024-03-31", count: 0 },
        { period: "2024-04-01", count: 1 },
      ]);
      expect(day.body.meta).toMatchObject({
        from: "2024-03-31T00:00:00.000Z",
        to: "2024-04-01T00:00:00.000Z",
      });

      const week = await request(app)
        .get("/api/analytics/timeline?granularity=week&from=2024-03-25&to=2024-04-01")
        .set(admin());
      expect(week.body.data).toEqual([
        { period: "2024-03-25", count: 0 },
        { period: "2024-04-01", count: 1 },
      ]);

      const month = await request(app)
        .get("/api/analytics/timeline?granularity=month&from=2024-03-01&to=2024-04-30")
        .set(admin());
      expect(month.body.data).toEqual([
        { period: "2024-03", count: 0 },
        { period: "2024-04", count: 1 },
      ]);
    });

    it("validates the granularity and is admin only", async () => {
      expect((await request(app).get("/api/analytics/timeline?granularity=hour").set(admin())).status).toBe(
        400,
      );
      expect((await request(app).get("/api/analytics/timeline").set(citizen())).status).toBe(403);
    });
  });
});
