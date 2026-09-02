import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../../src/config/categories.js";
import {
  BREAKDOWN_PALETTE,
  breakdownKeys,
  buildBreakdownRows,
  fillTimeline,
  resolveTimelineRange,
} from "../../src/services/analyticsCharts.service.js";
import { rangeFilter, rangeMeta, zeroStatusCounts } from "../../src/services/analytics.service.js";
import { analyticsRangeQuery, breakdownQuery, timelineQuery } from "../../src/validation/analytics.schema.js";

const IST = "Asia/Kolkata";

describe("timeline gap filling", () => {
  it("fills every day between the bounds with zero and keeps the counts found", () => {
    const buckets = new Map([
      ["2026-08-30", 2],
      ["2026-09-02", 1],
    ]);
    const points = fillTimeline(
      buckets,
      new Date("2026-08-30T00:00:00Z"),
      new Date("2026-09-02T00:00:00Z"),
      "day",
      IST,
    );
    expect(points).toEqual([
      { period: "2026-08-30", count: 2 },
      { period: "2026-08-31", count: 0 },
      { period: "2026-09-01", count: 0 },
      { period: "2026-09-02", count: 1 },
    ]);
  });

  it("uses Monday keys for weeks and YYYY-MM for months", () => {
    const weeks = fillTimeline(
      new Map([["2026-08-31", 3]]),
      new Date("2026-08-20T00:00:00Z"),
      new Date("2026-09-02T00:00:00Z"),
      "week",
      IST,
    );
    expect(weeks).toEqual([
      { period: "2026-08-17", count: 0 },
      { period: "2026-08-24", count: 0 },
      { period: "2026-08-31", count: 3 },
    ]);
    const months = fillTimeline(
      new Map([["2026-12", 4]]),
      new Date("2026-11-15T00:00:00Z"),
      new Date("2027-01-10T00:00:00Z"),
      "month",
      IST,
    );
    expect(months).toEqual([
      { period: "2026-11", count: 0 },
      { period: "2026-12", count: 4 },
      { period: "2027-01", count: 0 },
    ]);
  });

  it("buckets the day in the analytics zone, not in UTC", () => {
    // 18:30 UTC on 31 Aug is already 1 Sep in Kolkata: only that key is enumerated.
    const points = fillTimeline(
      new Map(),
      new Date("2026-08-31T18:30:00Z"),
      new Date("2026-09-01T18:29:00Z"),
      "day",
      IST,
    );
    expect(points.map((p) => p.period)).toEqual(["2026-09-01"]);
  });
});

describe("resolveTimelineRange", () => {
  const now = new Date("2026-09-02T10:00:00Z");
  const DAY = 86_400_000;

  it("defaults to 30 days, 26 weeks or 365 days ending now", () => {
    expect(resolveTimelineRange("day", undefined, undefined, now)).toEqual({
      from: new Date(now.getTime() - 30 * DAY),
      to: now,
    });
    expect(resolveTimelineRange("week", undefined, undefined, now)).toEqual({
      from: new Date(now.getTime() - 182 * DAY),
      to: now,
    });
    expect(resolveTimelineRange("month", undefined, undefined, now)).toEqual({
      from: new Date(now.getTime() - 365 * DAY),
      to: now,
    });
  });

  it("anchors the default span on the one bound given and keeps both when given", () => {
    const from = new Date("2026-08-01T00:00:00Z");
    const to = new Date("2026-08-31T00:00:00Z");
    expect(resolveTimelineRange("day", from, to, now)).toEqual({ from, to });
    expect(resolveTimelineRange("day", from, undefined, now)).toEqual({ from, to: now });
    expect(resolveTimelineRange("day", undefined, to, now)).toEqual({
      from: new Date(to.getTime() - 30 * DAY),
      to,
    });
    const future = new Date("2027-01-01T00:00:00Z");
    expect(resolveTimelineRange("week", future, undefined, now)).toEqual({
      from: future,
      to: new Date(future.getTime() + 182 * DAY),
    });
  });
});

describe("breakdown rows", () => {
  it("sorts by count descending and breaks ties in category order, with the config colours", () => {
    const rows = buildBreakdownRows(
      "category",
      new Map([
        ["ACCIDENT", 2],
        ["OTHER", 2],
        ["POTHOLE", 5],
        ["WATERLOGGING", 2],
      ]),
    );
    expect(rows).toHaveLength(10);
    expect(rows.slice(0, 4).map((r) => r.key)).toEqual(["POTHOLE", "ACCIDENT", "WATERLOGGING", "OTHER"]);
    expect(rows.slice(4).every((r) => r.count === 0)).toBe(true);
    expect(rows.slice(4).map((r) => r.key)).toEqual([
      "ROAD_DAMAGE",
      "TRAFFIC_CONGESTION",
      "TRAFFIC_SIGNAL",
      "STREET_LIGHT",
      "UNSAFE_ROAD",
      "OBSTRUCTION",
    ]);
    for (const row of rows) {
      const category = CATEGORIES.find((c) => c.key === row.key);
      expect(row.label).toBe(category?.label);
      expect(row.color).toBe(category?.color);
    }
  });

  it("keeps the enum order for status ties and colours every status", () => {
    const rows = buildBreakdownRows(
      "status",
      new Map([
        ["REJECTED", 3],
        ["SUBMITTED", 3],
        ["VERIFIED", 3],
        ["RESOLVED", 9],
      ]),
    );
    expect(rows.map((r) => [r.key, r.count])).toEqual([
      ["RESOLVED", 9],
      ["SUBMITTED", 3],
      ["VERIFIED", 3],
      ["REJECTED", 3],
      ["UNDER_REVIEW", 0],
      ["IN_PROGRESS", 0],
    ]);
    expect(rows.find((r) => r.key === "UNDER_REVIEW")?.label).toBe("Under review");
    expect(rows.every((r) => r.color === BREAKDOWN_PALETTE.status[r.key])).toBe(true);
  });

  it("reports UNASSIGNED and NONE last among ties and labels them", () => {
    const priority = buildBreakdownRows(
      "priority",
      new Map([
        ["UNASSIGNED", 4],
        ["HIGH", 4],
        ["LOW", 1],
      ]),
    );
    expect(priority.map((r) => r.key)).toEqual(["HIGH", "UNASSIGNED", "LOW", "MEDIUM", "CRITICAL"]);
    expect(priority[1]).toMatchObject({ key: "UNASSIGNED", label: "Unassigned", count: 4, color: "#6B7280" });

    const risk = buildBreakdownRows(
      "riskLevel",
      new Map([
        ["NONE", 7],
        ["HIGH", 1],
      ]),
    );
    expect(risk.map((r) => r.key)).toEqual(["NONE", "HIGH", "LOW", "MEDIUM"]);
    expect(risk[0]).toMatchObject({ label: "No estimate" });
    expect(risk.find((r) => r.key === "HIGH")).toMatchObject({ label: "High risk", color: "#DC2626" });

    expect(buildBreakdownRows("severity", new Map()).map((r) => r.key)).toEqual(["LOW", "MEDIUM", "HIGH"]);
  });

  it("appends unknown values after the known keys instead of dropping them", () => {
    const rows = buildBreakdownRows("severity", new Map([["EXTREME", 1]]));
    expect(rows.map((r) => r.key)).toEqual(["EXTREME", "LOW", "MEDIUM", "HIGH"]);
    expect(rows[0]).toEqual({ key: "EXTREME", label: "EXTREME", count: 1 });
  });

  it("knows every key per field", () => {
    expect(breakdownKeys("priority")).toEqual(["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNASSIGNED"]);
    expect(breakdownKeys("riskLevel")).toEqual(["LOW", "MEDIUM", "HIGH", "NONE"]);
    expect(breakdownKeys("category")).toHaveLength(10);
  });
});

describe("range helpers", () => {
  it("builds the createdAt range and the seed exclusion", () => {
    const from = new Date("2026-08-01T00:00:00Z");
    const to = new Date("2026-08-31T00:00:00Z");
    expect(rangeFilter({ includeSeed: true })).toEqual({});
    expect(rangeFilter({ from, to, includeSeed: true })).toEqual({ createdAt: { $gte: from, $lte: to } });
    expect(rangeFilter({ from, includeSeed: false })).toEqual({
      createdAt: { $gte: from },
      source: { $ne: "seed" },
    });
    expect(rangeMeta({ from, includeSeed: false })).toEqual({
      from: from.toISOString(),
      to: null,
      includeSeed: false,
    });
    expect(Object.values(zeroStatusCounts())).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe("analytics query schemas", () => {
  it("defaults includeSeed to true and parses booleanish values and dates", () => {
    expect(analyticsRangeQuery.parse({})).toEqual({ includeSeed: true });
    expect(analyticsRangeQuery.parse({ includeSeed: "false", from: "2026-08-01" })).toEqual({
      includeSeed: false,
      from: new Date("2026-08-01T00:00:00Z"),
    });
    expect(analyticsRangeQuery.parse({ includeSeed: "0" }).includeSeed).toBe(false);
    expect(analyticsRangeQuery.safeParse({ includeSeed: "maybe" }).success).toBe(false);
    const inverted = analyticsRangeQuery.safeParse({ from: "2026-09-02", to: "2026-09-01" });
    expect(inverted.success).toBe(false);
    expect(inverted.error?.issues[0]?.path).toEqual(["to"]);
  });

  it("requires a valid `by` and defaults the granularity to day", () => {
    expect(breakdownQuery.safeParse({}).success).toBe(false);
    expect(breakdownQuery.safeParse({ by: "reporter" }).success).toBe(false);
    expect(breakdownQuery.parse({ by: "riskLevel" })).toEqual({ by: "riskLevel", includeSeed: true });
    expect(timelineQuery.parse({})).toEqual({ granularity: "day", includeSeed: true });
    expect(timelineQuery.parse({ granularity: "month" }).granularity).toBe("month");
    expect(timelineQuery.safeParse({ granularity: "hour" }).success).toBe(false);
  });
});
