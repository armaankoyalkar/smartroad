import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import type { AppError } from "../../src/lib/errors.js";
import { buildIncidentFilter, escapeRegex } from "../../src/lib/incidentFilters.js";

const OWNER = new mongoose.Types.ObjectId();

describe("buildIncidentFilter", () => {
  it("admins see every status by default", () => {
    expect(buildIncidentFilter({}, { isAdmin: true })).toEqual({});
    expect(buildIncidentFilter({ status: ["REJECTED", "VERIFIED"] }, { isAdmin: true })).toEqual({
      status: { $in: ["REJECTED", "VERIFIED"] },
    });
  });

  it("never returns REJECTED incidents to non-admins listing other people's reports", () => {
    expect(buildIncidentFilter({}, { isAdmin: false })).toEqual({ status: { $ne: "REJECTED" } });
    expect(buildIncidentFilter({ status: "REJECTED,VERIFIED" }, { isAdmin: false })).toEqual({
      status: { $in: ["VERIFIED"] },
    });
    // Only REJECTED requested: reduced to an empty list, which matches nothing.
    expect(buildIncidentFilter({ status: ["REJECTED"] }, { isAdmin: false })).toEqual({ status: { $in: [] } });
  });

  it("keeps REJECTED visible when a reporter lists their own incidents", () => {
    const filter = buildIncidentFilter({ status: ["REJECTED"] }, { isAdmin: false, ownerId: OWNER });
    expect(filter).toEqual({ reportedBy: OWNER, status: { $in: ["REJECTED"] } });
    expect(buildIncidentFilter({}, { isAdmin: false, ownerId: String(OWNER) })).toEqual({ reportedBy: String(OWNER) });
  });

  it("maps UNASSIGNED priority to null", () => {
    expect(buildIncidentFilter({ priority: ["UNASSIGNED"] }, { isAdmin: true })).toEqual({ priority: { $in: [null] } });
    expect(buildIncidentFilter({ priority: "HIGH,UNASSIGNED,CRITICAL" }, { isAdmin: true })).toEqual({
      priority: { $in: ["HIGH", "CRITICAL", null] },
    });
  });

  it("maps riskLevel NONE to incidents without an estimate", () => {
    expect(buildIncidentFilter({ riskLevel: ["NONE"] }, { isAdmin: true })).toEqual({
      "riskEstimate.level": { $in: [null] },
    });
    expect(buildIncidentFilter({ riskLevel: ["HIGH", "NONE"] }, { isAdmin: true })).toEqual({
      "riskEstimate.level": { $in: ["HIGH", null] },
    });
  });

  it("accepts single values, arrays and comma-separated strings for the multi-valued filters", () => {
    const filter = buildIncidentFilter(
      { category: "POTHOLE,ACCIDENT", severity: ["HIGH"], source: "seed", status: ["VERIFIED", "VERIFIED"] },
      { isAdmin: true },
    );
    expect(filter).toEqual({
      status: { $in: ["VERIFIED"] },
      category: { $in: ["POTHOLE", "ACCIDENT"] },
      severity: { $in: ["HIGH"] },
      source: { $in: ["seed"] },
    });
  });

  it("filters createdAt by from and to", () => {
    const from = new Date("2026-08-01T00:00:00Z");
    const to = new Date("2026-08-31T23:59:59Z");
    expect(buildIncidentFilter({ from, to }, { isAdmin: true })).toEqual({ createdAt: { $gte: from, $lte: to } });
    expect(buildIncidentFilter({ from }, { isAdmin: true })).toEqual({ createdAt: { $gte: from } });
  });

  it("searches title, description and address with an escaped case-insensitive regex", () => {
    const filter = buildIncidentFilter({ q: " pothole (40%) near .* flyover " }, { isAdmin: true });
    const pattern = "pothole \\(40%\\) near \\.\\* flyover";
    expect(filter).toEqual({
      $or: [
        { title: { $regex: pattern, $options: "i" } },
        { description: { $regex: pattern, $options: "i" } },
        { address: { $regex: pattern, $options: "i" } },
      ],
    });
    expect(escapeRegex("a.b*c?d^e$f{g}h(i)j|k[l]m\\n")).toBe("a\\.b\\*c\\?d\\^e\\$f\\{g\\}h\\(i\\)j\\|k\\[l\\]m\\\\n");
    expect(buildIncidentFilter({ q: "   " }, { isAdmin: true })).toEqual({});
  });

  it("turns a bbox into a $geoWithin polygon and rejects malformed ones", () => {
    const filter = buildIncidentFilter({ bbox: "78.3,17.3,78.6,17.52" }, { isAdmin: true }) as {
      location: { $geoWithin: { $geometry: { type: string; coordinates: number[][][] } } };
    };
    expect(filter.location.$geoWithin.$geometry.type).toBe("Polygon");
    expect(filter.location.$geoWithin.$geometry.coordinates[0]).toHaveLength(5);
    const parsed = buildIncidentFilter({ bbox: { minLng: 78.3, minLat: 17.3, maxLng: 78.6, maxLat: 17.52 } }, { isAdmin: true });
    expect(parsed).toEqual(filter);
    expect(() => buildIncidentFilter({ bbox: "78.6,17.3,78.3,17.52" }, { isAdmin: true })).toThrowError(
      expect.objectContaining({ code: "VALIDATION_ERROR" }),
    );
    try {
      buildIncidentFilter({ bbox: "nope" }, { isAdmin: false });
    } catch (err) {
      expect((err as AppError).details[0]).toMatchObject({ field: "bbox" });
    }
  });

  it("combines every clause", () => {
    const filter = buildIncidentFilter(
      { status: ["VERIFIED"], category: ["POTHOLE"], priority: ["UNASSIGNED"], q: "x", from: new Date(0) },
      { isAdmin: false },
    );
    expect(Object.keys(filter).sort()).toEqual(["$or", "category", "createdAt", "priority", "status"]);
  });
});
