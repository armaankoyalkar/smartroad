import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { toPoint } from "../../src/lib/geo.js";
import { buildIncidentFilter } from "../../src/lib/incidentFilters.js";
import { sortStages, toMongoSort } from "../../src/lib/pagination.js";
import { Incident, type IncidentAttrs } from "../../src/models/Incident.js";
import { closeTestDb, connectTestDb, mongoUri } from "../setup/db.js";

/**
 * The shared query helpers against a real MongoDB: rank-order sorting with
 * unassigned priority last, and the filter clauses that depend on server
 * semantics (null matching a missing sub-document, regex escaping, bbox).
 */
describe.skipIf(!mongoUri())("query helpers with MongoDB", () => {
  const reporter = new mongoose.Types.ObjectId();
  const other = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    await connectTestDb("query");
    const base: Partial<IncidentAttrs> = {
      description: "Generated for the query helper tests; not a real report.",
      category: "POTHOLE",
      severity: "MEDIUM",
      reportedBy: reporter,
    };
    const day = (n: number) => new Date(Date.UTC(2026, 7, n, 12));
    const docs: Partial<IncidentAttrs>[] = [
      { ...base, title: "P1 high priority (approx) 40%", priority: "HIGH", location: toPoint(17.44, 78.38), createdAt: day(1) },
      { ...base, title: "P2 unassigned priority", priority: null, location: toPoint(17.45, 78.39), createdAt: day(2) },
      { ...base, title: "P3 low priority", priority: "LOW", severity: "LOW", location: toPoint(17.3, 78.5), createdAt: day(3) },
      {
        ...base,
        title: "P4 critical priority with estimate",
        priority: "CRITICAL",
        severity: "HIGH",
        location: toPoint(17.46, 78.4),
        createdAt: day(4),
        riskEstimate: { level: "HIGH", probabilities: { LOW: 0.1, MEDIUM: 0.2, HIGH: 0.7 }, modelVersion: "t", estimatedAt: day(4) },
      },
      {
        ...base,
        title: "P5 rejected report",
        status: "REJECTED",
        priority: "MEDIUM",
        reportedBy: other,
        address: "Charminar, Hyderabad",
        location: toPoint(17.36, 78.47),
        createdAt: day(5),
      },
    ];
    await Incident.create(docs);
  });

  afterAll(closeTestDb);

  async function titles(stages: mongoose.PipelineStage[]): Promise<string[]> {
    const rows = await Incident.aggregate<{ title: string }>(stages);
    return rows.map((r) => r.title.slice(0, 2));
  }

  it("sorts priority in rank order with unassigned last in both directions", async () => {
    expect(await titles(sortStages({ field: "priority", direction: -1 }))).toEqual(["P4", "P1", "P5", "P3", "P2"]);
    expect(await titles(sortStages({ field: "priority", direction: 1 }))).toEqual(["P3", "P5", "P1", "P4", "P2"]);
    const rows = await Incident.aggregate<Record<string, unknown>>(sortStages({ field: "priority", direction: 1 }));
    expect(rows[0]).not.toHaveProperty("__rank");
    expect(rows[0]).not.toHaveProperty("__rankMissing");
  });

  it("sorts severity in rank order and ordinary fields with find().sort()", async () => {
    expect(await titles(sortStages({ field: "severity", direction: -1 }))).toEqual(["P4", "P5", "P2", "P1", "P3"]);
    const newest = await Incident.find({}).sort(toMongoSort({ field: "createdAt", direction: -1 }));
    expect(newest.map((i) => i.title.slice(0, 2))).toEqual(["P5", "P4", "P3", "P2", "P1"]);
  });

  it("applies the privacy rule and the UNASSIGNED / NONE mappings", async () => {
    const visible = await Incident.find(buildIncidentFilter({}, { isAdmin: false }));
    expect(visible.map((i) => i.title.slice(0, 2)).sort()).toEqual(["P1", "P2", "P3", "P4"]);
    const own = await Incident.find(buildIncidentFilter({}, { isAdmin: false, ownerId: other }));
    expect(own.map((i) => i.title.slice(0, 2))).toEqual(["P5"]);
    const all = await Incident.find(buildIncidentFilter({}, { isAdmin: true }));
    expect(all).toHaveLength(5);

    const unassigned = await Incident.find(buildIncidentFilter({ priority: ["UNASSIGNED"] }, { isAdmin: true }));
    expect(unassigned.map((i) => i.title.slice(0, 2))).toEqual(["P2"]);
    const highOrNone = await Incident.find(buildIncidentFilter({ priority: "HIGH,UNASSIGNED" }, { isAdmin: true }));
    expect(highOrNone.map((i) => i.title.slice(0, 2)).sort()).toEqual(["P1", "P2"]);

    const noEstimate = await Incident.find(buildIncidentFilter({ riskLevel: ["NONE"] }, { isAdmin: true }));
    expect(noEstimate).toHaveLength(4);
    const highRisk = await Incident.find(buildIncidentFilter({ riskLevel: ["HIGH"] }, { isAdmin: true }));
    expect(highRisk.map((i) => i.title.slice(0, 2))).toEqual(["P4"]);
  });

  it("searches with an escaped regex over title, description and address", async () => {
    const parens = await Incident.find(buildIncidentFilter({ q: "(approx) 40%" }, { isAdmin: true }));
    expect(parens.map((i) => i.title.slice(0, 2))).toEqual(["P1"]);
    const dot = await Incident.find(buildIncidentFilter({ q: "P.1" }, { isAdmin: true }));
    expect(dot).toHaveLength(0);
    const address = await Incident.find(buildIncidentFilter({ q: "charminar" }, { isAdmin: true }));
    expect(address.map((i) => i.title.slice(0, 2))).toEqual(["P5"]);
    const description = await Incident.find(buildIncidentFilter({ q: "QUERY HELPER" }, { isAdmin: true }));
    expect(description).toHaveLength(5);
  });

  it("filters by bbox and date range", async () => {
    const box = await Incident.find(buildIncidentFilter({ bbox: "78.37,17.43,78.41,17.47" }, { isAdmin: true }));
    expect(box.map((i) => i.title.slice(0, 2)).sort()).toEqual(["P1", "P2", "P4"]);
    const range = await Incident.find(
      buildIncidentFilter({ from: new Date(Date.UTC(2026, 7, 2)), to: new Date(Date.UTC(2026, 7, 3, 23)) }, { isAdmin: true }),
    );
    expect(range.map((i) => i.title.slice(0, 2)).sort()).toEqual(["P2", "P3"]);
  });
});
