import { describe, expect, it } from "vitest";
import { toPoint } from "../../src/lib/geo.js";
import { toFeature, type MapIncidentSource } from "../../src/services/map.service.js";
import { mapIncidentsQuery } from "../../src/validation/map.schema.js";

const doc: MapIncidentSource = {
  _id: "66d5a2b8c2b7a4e8f1a2b3d0",
  title: "Deep pothole near Hitec City flyover",
  category: "POTHOLE",
  severity: "HIGH",
  status: "VERIFIED",
  priority: "HIGH",
  riskEstimate: { level: "MEDIUM" },
  createdAt: new Date("2026-09-01T10:00:00Z"),
  address: "Hitec City Main Road",
  source: "user",
  image: { url: "/uploads/x.jpg" },
  location: toPoint(17.4483, 78.3814),
};

describe("toFeature", () => {
  it("builds the documented GeoJSON feature for admins", () => {
    expect(toFeature(doc, true)).toEqual({
      type: "Feature",
      geometry: { type: "Point", coordinates: [78.3814, 17.4483] },
      properties: {
        id: "66d5a2b8c2b7a4e8f1a2b3d0",
        title: "Deep pothole near Hitec City flyover",
        category: "POTHOLE",
        severity: "HIGH",
        status: "VERIFIED",
        verification: "VERIFIED",
        priority: "HIGH",
        riskLevel: "MEDIUM",
        createdAt: new Date("2026-09-01T10:00:00Z"),
        address: "Hitec City Main Road",
        source: "user",
        hasImage: true,
      },
    });
  });

  it("nulls priority and riskLevel for non-admin callers and fills defaults", () => {
    const feature = toFeature(
      { ...doc, status: "REJECTED", image: null, address: undefined, source: undefined },
      false,
    );
    expect(feature?.properties).toMatchObject({
      priority: null,
      riskLevel: null,
      verification: "REJECTED",
      hasImage: false,
      address: "",
      source: "user",
    });
    expect(toFeature({ ...doc, priority: null, riskEstimate: null }, true)?.properties).toMatchObject({
      priority: null,
      riskLevel: null,
    });
  });

  it("returns null for an unreadable location", () => {
    expect(toFeature({ ...doc, location: null }, true)).toBeNull();
  });
});

describe("mapIncidentsQuery", () => {
  it("defaults the limit to 5000 and clamps its range", () => {
    expect(mapIncidentsQuery.parse({})).toEqual({ limit: 5000 });
    expect(mapIncidentsQuery.parse({ limit: "1" }).limit).toBe(1);
    expect(mapIncidentsQuery.safeParse({ limit: "0" }).success).toBe(false);
    expect(mapIncidentsQuery.safeParse({ limit: "5001" }).success).toBe(false);
    expect(mapIncidentsQuery.safeParse({ limit: "ten" }).success).toBe(false);
  });

  it("parses the bbox through lib/geo and rejects malformed boxes", () => {
    expect(mapIncidentsQuery.parse({ bbox: "78.3,17.3,78.6,17.52" }).bbox).toEqual({
      minLng: 78.3,
      minLat: 17.3,
      maxLng: 78.6,
      maxLat: 17.52,
    });
    for (const bad of ["78.3,17.3,78.6", "78.6,17.3,78.3,17.52", "a,b,c,d", "78.3,17.3,78.6,95"]) {
      const result = mapIncidentsQuery.safeParse({ bbox: bad });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(["bbox"]);
    }
  });

  it("accepts the multi-valued filters including UNASSIGNED and NONE", () => {
    const parsed = mapIncidentsQuery.parse({
      status: "SUBMITTED,VERIFIED",
      category: ["POTHOLE", "ACCIDENT"],
      severity: "HIGH",
      priority: "HIGH,UNASSIGNED",
      riskLevel: "NONE",
      source: "seed",
      from: "2026-08-01",
      to: "2026-08-31T23:59:59Z",
    });
    expect(parsed).toMatchObject({
      status: ["SUBMITTED", "VERIFIED"],
      category: ["POTHOLE", "ACCIDENT"],
      severity: ["HIGH"],
      priority: ["HIGH", "UNASSIGNED"],
      riskLevel: ["NONE"],
      source: ["seed"],
      limit: 5000,
    });
    expect(mapIncidentsQuery.safeParse({ status: "REPORTED" }).success).toBe(false);
    expect(mapIncidentsQuery.safeParse({ priority: "NONE" }).success).toBe(false);
    expect(mapIncidentsQuery.safeParse({ riskLevel: "UNASSIGNED" }).success).toBe(false);
    expect(mapIncidentsQuery.safeParse({ from: "2026-09-02", to: "2026-09-01" }).success).toBe(false);
  });
});
