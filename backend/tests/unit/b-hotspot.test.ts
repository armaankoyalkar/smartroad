import { describe, expect, it } from "vitest";
import { hotspotCacheKey, hotspotFilter, summariseCategories } from "../../src/services/hotspot.service.js";
import { hotspotsQuery } from "../../src/validation/map.schema.js";

describe("summariseCategories", () => {
  const categories = new Map([
    ["a", "POTHOLE"],
    ["b", "POTHOLE"],
    ["c", "ROAD_DAMAGE"],
    ["d", "ACCIDENT"],
    ["e", "ACCIDENT"],
  ]);

  it("counts the members' categories and picks the most frequent one", () => {
    expect(summariseCategories(["a", "b", "c"], categories)).toEqual({
      dominantCategory: "POTHOLE",
      categoryCounts: { POTHOLE: 2, ROAD_DAMAGE: 1 },
    });
  });

  it("breaks ties in category order and orders the counts by size then category", () => {
    const summary = summariseCategories(["d", "e", "a", "b", "c"], categories);
    expect(summary.dominantCategory).toBe("POTHOLE"); // POTHOLE precedes ACCIDENT in the category list
    expect(Object.keys(summary.categoryCounts)).toEqual(["POTHOLE", "ACCIDENT", "ROAD_DAMAGE"]);
  });

  it("ignores member ids it does not know and handles empty clusters", () => {
    expect(summariseCategories(["zzz", "c"], categories)).toEqual({
      dominantCategory: "ROAD_DAMAGE",
      categoryCounts: { ROAD_DAMAGE: 1 },
    });
    expect(summariseCategories([], categories)).toEqual({ dominantCategory: null, categoryCounts: {} });
  });
});

describe("hotspotCacheKey", () => {
  it("is independent of list order and includes every parameter", () => {
    const from = new Date("2026-08-01T00:00:00Z");
    const a = hotspotCacheKey({ eps: 200, minSamples: 4, category: ["POTHOLE", "ACCIDENT"], from });
    const b = hotspotCacheKey({ eps: 200, minSamples: 4, category: ["ACCIDENT", "POTHOLE"], from });
    expect(a).toBe(b);
    expect(a.startsWith("hotspots:")).toBe(true);
    expect(hotspotCacheKey({ eps: 250, minSamples: 4, category: ["POTHOLE", "ACCIDENT"], from })).not.toBe(a);
    expect(hotspotCacheKey({ eps: 200, minSamples: 5, category: ["POTHOLE", "ACCIDENT"], from })).not.toBe(a);
    expect(hotspotCacheKey({ eps: 200, minSamples: 4, category: ["POTHOLE", "ACCIDENT"] })).not.toBe(a);
    expect(hotspotCacheKey({ eps: 200, minSamples: 4, status: ["VERIFIED"] })).not.toBe(
      hotspotCacheKey({ eps: 200, minSamples: 4 }),
    );
  });
});

describe("hotspotFilter", () => {
  it("uses non-rejected incidents unless a status filter is given", () => {
    expect(hotspotFilter({ eps: 200, minSamples: 4 })).toEqual({ status: { $ne: "REJECTED" } });
    expect(hotspotFilter({ eps: 200, minSamples: 4, status: ["REJECTED"] })).toEqual({
      status: { $in: ["REJECTED"] },
    });
    const from = new Date("2026-08-01T00:00:00Z");
    expect(hotspotFilter({ eps: 200, minSamples: 4, category: ["POTHOLE"], from })).toEqual({
      status: { $ne: "REJECTED" },
      category: { $in: ["POTHOLE"] },
      createdAt: { $gte: from },
    });
  });
});

describe("hotspotsQuery", () => {
  it("applies the documented defaults and ranges", () => {
    expect(hotspotsQuery.parse({})).toEqual({ eps: 200, minSamples: 4 });
    expect(hotspotsQuery.parse({ eps: "50", minSamples: "20" })).toMatchObject({ eps: 50, minSamples: 20 });
    expect(hotspotsQuery.parse({ eps: "2000", minSamples: "3" })).toMatchObject({ eps: 2000, minSamples: 3 });
    expect(hotspotsQuery.safeParse({ eps: "49" }).success).toBe(false);
    expect(hotspotsQuery.safeParse({ eps: "2001" }).success).toBe(false);
    expect(hotspotsQuery.safeParse({ minSamples: "2" }).success).toBe(false);
    expect(hotspotsQuery.safeParse({ minSamples: "21" }).success).toBe(false);
    expect(hotspotsQuery.safeParse({ minSamples: "4.5" }).success).toBe(false);
    expect(hotspotsQuery.safeParse({ eps: "abc" }).success).toBe(false);
  });

  it("accepts comma-separated category and status lists and a date range", () => {
    const parsed = hotspotsQuery.parse({
      category: "POTHOLE,ACCIDENT",
      status: "VERIFIED",
      from: "2026-08-01",
      to: "2026-08-31",
    });
    expect(parsed.category).toEqual(["POTHOLE", "ACCIDENT"]);
    expect(parsed.status).toEqual(["VERIFIED"]);
    expect(parsed.from).toEqual(new Date("2026-08-01T00:00:00Z"));
    expect(hotspotsQuery.safeParse({ category: "BOGUS" }).success).toBe(false);
    expect(hotspotsQuery.safeParse({ from: "2026-09-02", to: "2026-09-01" }).success).toBe(false);
  });
});
