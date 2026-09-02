import { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { type IncidentAttrs } from "../../src/models/Incident.js";
import { type Account, advance, bearer, createAccount, createIncident, type LifecycleStep } from "../helpers/a-fixtures.js";
import { closeTestDb, connectTestDb, mongoUri } from "../setup/db.js";

interface Row {
  title: string;
  reportedBy: { id: string; name: string; email?: string } | null;
  verifiedBy: { id: string; name: string } | null;
  statusHistory: Array<{ note?: string | null; changedBy: { id: string; name: string } | null }>;
  riskEstimate?: unknown;
  adminNote?: string | null;
}

/**
 * GET /api/incidents (admin) and GET /api/incidents/mine: filters, search,
 * rank-order sorting, pagination and the privacy variants of each list.
 */
describe.skipIf(!mongoUri())("GET /api/incidents and /mine", () => {
  let app: Express;
  let admin: Account;
  let citizenA: Account;
  let citizenB: Account;

  const day = (n: number) => new Date(Date.UTC(2026, 7, n, 12));
  const titles = (res: { body: { data: Row[] } }) => res.body.data.map((row) => row.title.split(" ")[0]);
  const list = (token: string, query = "") => request(app).get(`/api/incidents${query}`).set(bearer(token));
  const mine = (token: string, query = "") => request(app).get(`/api/incidents/mine${query}`).set(bearer(token));

  async function seed(reporter: Account, overrides: Partial<IncidentAttrs>, steps: LifecycleStep[] = []) {
    const incident = await createIncident(reporter.user, overrides);
    if (steps.length) await advance(incident, admin.user, steps);
    return incident;
  }

  beforeAll(async () => {
    await connectTestDb("a_incidents_list");
    app = createApp();
    admin = await createAccount({ name: "Admin One", role: "admin" });
    citizenA = await createAccount({ name: "Citizen A", email: "a@example.com" });
    citizenB = await createAccount({ name: "Citizen B", email: "b@example.com" });

    await seed(citizenA, { title: "Alpha pothole", category: "POTHOLE", severity: "HIGH", priority: "HIGH", createdAt: day(1) }, [
      "UNDER_REVIEW",
      ["VERIFIED", "Confirmed on site."],
    ]);
    await seed(citizenA, { title: "Bravo signal", category: "TRAFFIC_SIGNAL", severity: "LOW", priority: null, createdAt: day(2) });
    await seed(
      citizenB,
      {
        title: "Charlie waterlogging",
        category: "WATERLOGGING",
        severity: "MEDIUM",
        priority: "LOW",
        createdAt: day(3),
        riskEstimate: { level: "HIGH", probabilities: { LOW: 0.1, MEDIUM: 0.2, HIGH: 0.7 }, modelVersion: "test-model", estimatedAt: day(3) },
      },
      [["REJECTED", "Duplicate of an earlier report."]],
    );
    await seed(
      citizenB,
      { title: "Delta obstruction (approx) 40%", category: "OBSTRUCTION", severity: "HIGH", priority: "CRITICAL", source: "seed", createdAt: day(4) },
      ["UNDER_REVIEW", "VERIFIED", "IN_PROGRESS"],
    );
    await seed(
      citizenA,
      {
        title: "Echo accident",
        category: "ACCIDENT",
        severity: "MEDIUM",
        priority: "MEDIUM",
        createdAt: day(5),
        riskEstimate: { level: "LOW", probabilities: { LOW: 0.8, MEDIUM: 0.15, HIGH: 0.05 }, modelVersion: "test-model", estimatedAt: day(5) },
      },
      ["UNDER_REVIEW", "VERIFIED", "RESOLVED"],
    );
  });

  afterAll(closeTestDb);

  describe("admin list", () => {
    it("is admin only", async () => {
      const res = await list(citizenA.token);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("returns every incident newest first in the admin variant with pagination meta", async () => {
      const res = await list(admin.token);
      expect(res.status).toBe(200);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 5, totalPages: 1 });
      expect(titles(res)).toEqual(["Echo", "Delta", "Charlie", "Bravo", "Alpha"]);
      const alpha = res.body.data[4] as Row;
      expect(alpha.reportedBy).toEqual({ id: citizenA.id, name: "Citizen A", email: "a@example.com" });
      expect(alpha.verifiedBy).toEqual({ id: admin.id, name: "Admin One" });
      expect(alpha.adminNote).toBe("Confirmed on site.");
      expect(alpha.statusHistory.map((h) => h.changedBy)).toEqual([null, { id: admin.id, name: "Admin One" }, { id: admin.id, name: "Admin One" }]);
      expect(alpha.statusHistory[2]?.note).toBe("Confirmed on site.");
      expect(alpha.riskEstimate).toBeNull();
      const charlie = res.body.data[2] as Row;
      expect(charlie.riskEstimate).toEqual({
        level: "HIGH",
        probabilities: { LOW: 0.1, MEDIUM: 0.2, HIGH: 0.7 },
        modelVersion: "test-model",
        estimatedAt: day(3).toISOString(),
      });
    });

    it("applies every filter, including UNASSIGNED priority and NONE risk level", async () => {
      const cases: Array<[string, string[]]> = [
        ["?status=VERIFIED,RESOLVED", ["Echo", "Alpha"]],
        ["?status=REJECTED", ["Charlie"]],
        ["?category=POTHOLE", ["Alpha"]],
        ["?severity=HIGH", ["Delta", "Alpha"]],
        ["?priority=UNASSIGNED", ["Bravo"]],
        ["?priority=HIGH,CRITICAL", ["Delta", "Alpha"]],
        ["?source=seed", ["Delta"]],
        ["?riskLevel=NONE", ["Delta", "Bravo", "Alpha"]],
        ["?riskLevel=HIGH", ["Charlie"]],
        ["?riskLevel=LOW,NONE", ["Echo", "Delta", "Bravo", "Alpha"]],
        ["?from=2026-08-02&to=2026-08-03T23:59:59Z", ["Charlie", "Bravo"]],
        ["?from=2026-08-05", ["Echo"]],
        ["?q=" + encodeURIComponent("(approx) 40%"), ["Delta"]],
        ["?q=BRAVO", ["Bravo"]],
        ["?q=" + encodeURIComponent("Delta.obstruction"), []],
        ["?status=VERIFIED&severity=LOW", []],
      ];
      for (const [query, expected] of cases) {
        const res = await list(admin.token, query);
        expect(res.status, query).toBe(200);
        expect(titles(res), query).toEqual(expected);
        expect(res.body.meta.total, query).toBe(expected.length);
      }
    });

    it("sorts priority and severity in rank order with unassigned last, and other fields plainly", async () => {
      expect(titles(await list(admin.token, "?sort=priority"))).toEqual(["Charlie", "Echo", "Alpha", "Delta", "Bravo"]);
      expect(titles(await list(admin.token, "?sort=-priority"))).toEqual(["Delta", "Alpha", "Echo", "Charlie", "Bravo"]);
      expect(titles(await list(admin.token, "?sort=-severity"))).toEqual(["Delta", "Alpha", "Echo", "Charlie", "Bravo"]);
      expect(titles(await list(admin.token, "?sort=severity"))).toEqual(["Bravo", "Echo", "Charlie", "Delta", "Alpha"]);
      expect(titles(await list(admin.token, "?sort=status"))).toEqual(["Delta", "Charlie", "Echo", "Bravo", "Alpha"]);
      expect(titles(await list(admin.token, "?sort=createdAt"))).toEqual(["Alpha", "Bravo", "Charlie", "Delta", "Echo"]);
      const bad = await list(admin.token, "?sort=title");
      expect(bad.status).toBe(400);
      expect(bad.body.error.details[0].field).toBe("sort");
    });

    it("paginates through both the query and the aggregation paths", async () => {
      const second = await list(admin.token, "?limit=2&page=2");
      expect(second.body.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
      expect(titles(second)).toEqual(["Charlie", "Bravo"]);
      expect(titles(await list(admin.token, "?limit=2&page=3"))).toEqual(["Alpha"]);
      const ranked = await list(admin.token, "?sort=priority&limit=2&page=3");
      expect(ranked.body.meta).toEqual({ page: 3, limit: 2, total: 5, totalPages: 3 });
      expect(titles(ranked)).toEqual(["Bravo"]);
      expect((ranked.body.data[0] as Row).reportedBy).toEqual({ id: citizenA.id, name: "Citizen A", email: "a@example.com" });
      expect(titles(await list(admin.token, "?limit=2&page=9"))).toEqual([]);
      expect((await list(admin.token, "?limit=101")).status).toBe(400);
    });
  });

  describe("mine", () => {
    it("returns only the caller's reports, every status included, in the reporter variant", async () => {
      const res = await mine(citizenB.token);
      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(2);
      expect(titles(res)).toEqual(["Delta", "Charlie"]);
      const charlie = res.body.data[1] as Row;
      expect(charlie.reportedBy).toEqual({ id: citizenB.id, name: "Citizen B" });
      expect(charlie.verifiedBy).toBeNull();
      expect(charlie.adminNote).toBe("Duplicate of an earlier report.");
      expect(charlie.statusHistory[1]).toMatchObject({ note: "Duplicate of an earlier report.", changedBy: null });
      expect(charlie).not.toHaveProperty("riskEstimate");
      const delta = res.body.data[0] as Row;
      expect(delta.verifiedBy).toBeNull();
      expect(delta.statusHistory.every((h) => h.changedBy === null)).toBe(true);
      expect(titles(await mine(citizenA.token))).toEqual(["Echo", "Bravo", "Alpha"]);
    });

    it("supports the shared filters and sort but ignores q, source and riskLevel", async () => {
      expect(titles(await mine(citizenB.token, "?status=REJECTED"))).toEqual(["Charlie"]);
      expect(titles(await mine(citizenA.token, "?priority=UNASSIGNED"))).toEqual(["Bravo"]);
      expect(titles(await mine(citizenA.token, "?sort=-priority"))).toEqual(["Alpha", "Echo", "Bravo"]);
      expect(titles(await mine(citizenA.token, "?q=Echo&source=seed&riskLevel=HIGH"))).toEqual(["Echo", "Bravo", "Alpha"]);
      const page = await mine(citizenA.token, "?limit=1&page=2");
      expect(page.body.meta).toEqual({ page: 2, limit: 1, total: 3, totalPages: 3 });
      expect(titles(page)).toEqual(["Bravo"]);
    });
  });
});
