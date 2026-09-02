import { describe, expect, it } from "vitest";
import { AppError } from "../../src/lib/errors.js";
import {
  buildMeta,
  isRankField,
  needsAggregation,
  parsePagination,
  parseSort,
  rankExpression,
  sortStages,
  toMongoSort,
  tryParseSort,
} from "../../src/lib/pagination.js";

describe("parsePagination", () => {
  it("applies the documented defaults", () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20, skip: 0 });
    expect(parsePagination(undefined)).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it("reads strings and numbers and computes skip", () => {
    expect(parsePagination({ page: "3", limit: "50" })).toEqual({ page: 3, limit: 50, skip: 100 });
    expect(parsePagination({ page: 2, limit: 10 })).toEqual({ page: 2, limit: 10, skip: 10 });
  });

  it("clamps out-of-range values instead of failing", () => {
    expect(parsePagination({ page: "0", limit: "1000" })).toEqual({ page: 1, limit: 100, skip: 0 });
    expect(parsePagination({ page: "-4", limit: "0" })).toEqual({ page: 1, limit: 1, skip: 0 });
    expect(parsePagination({ page: "abc", limit: "1.5" })).toEqual({ page: 1, limit: 20, skip: 0 });
    expect(parsePagination({ limit: "30" }, { maxLimit: 25, defaultLimit: 5 })).toEqual({ page: 1, limit: 25, skip: 0 });
    expect(parsePagination({}, { defaultLimit: 5000, maxLimit: 5000 }).limit).toBe(5000);
  });
});

describe("buildMeta", () => {
  it("computes totalPages", () => {
    expect(buildMeta(2, 20, 45)).toEqual({ page: 2, limit: 20, total: 45, totalPages: 3 });
    expect(buildMeta(1, 20, 0)).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
    expect(buildMeta(1, 20, 20).totalPages).toBe(1);
  });
});

describe("parseSort", () => {
  const allowed = ["createdAt", "updatedAt", "priority", "status", "severity"];

  it("parses direction and field, falling back to the default", () => {
    expect(parseSort("-createdAt", allowed, "-createdAt")).toEqual({ field: "createdAt", direction: -1 });
    expect(parseSort("status", allowed, "-createdAt")).toEqual({ field: "status", direction: 1 });
    expect(parseSort(undefined, allowed, "-createdAt")).toEqual({ field: "createdAt", direction: -1 });
    expect(parseSort("  ", allowed, "updatedAt")).toEqual({ field: "updatedAt", direction: 1 });
    expect(parseSort("+priority", allowed, "-createdAt")).toEqual({ field: "priority", direction: 1 });
  });

  it("rejects fields outside the allowed list with VALIDATION_ERROR", () => {
    expect(tryParseSort("-title", allowed, "-createdAt")).toBeNull();
    let caught: unknown;
    try {
      parseSort("-title", allowed, "-createdAt");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe("VALIDATION_ERROR");
    expect((caught as AppError).details[0]).toMatchObject({ field: "sort" });
  });
});

describe("rank-order sorting", () => {
  it("recognises the rank fields", () => {
    expect(isRankField("priority")).toBe(true);
    expect(isRankField("severity")).toBe(true);
    expect(isRankField("createdAt")).toBe(false);
    expect(needsAggregation({ field: "priority", direction: 1 })).toBe(true);
    expect(needsAggregation({ field: "createdAt", direction: 1 })).toBe(false);
  });

  it("builds a plain sort object for ordinary fields with an _id tie-breaker", () => {
    expect(toMongoSort({ field: "createdAt", direction: -1 })).toEqual({ createdAt: -1, _id: -1 });
    expect(toMongoSort({ field: "status", direction: 1 })).toEqual({ status: 1, _id: -1 });
    expect(() => toMongoSort({ field: "priority", direction: 1 })).toThrow(/rank order/);
    expect(sortStages({ field: "updatedAt", direction: 1 })).toEqual([{ $sort: { updatedAt: 1, _id: -1, createdAt: -1 } }]);
  });

  it("maps priority and severity to numbers with $switch", () => {
    const expr = rankExpression("priority") as { $switch: { branches: unknown[]; default: number } };
    expect(expr.$switch.branches).toHaveLength(4);
    expect(expr.$switch.branches[3]).toEqual({ case: { $eq: ["$priority", "CRITICAL"] }, then: 4 });
    expect(expr.$switch.default).toBe(0);
    const severity = rankExpression("severity") as { $switch: { branches: unknown[] } };
    expect(severity.$switch.branches).toHaveLength(3);
  });

  it("puts unassigned priority last in both directions", () => {
    const desc = sortStages({ field: "priority", direction: -1 });
    expect(desc).toHaveLength(3);
    expect(desc[0]).toHaveProperty("$addFields");
    expect(desc[1]).toEqual({ $sort: { __rankMissing: 1, __rank: -1, createdAt: -1, _id: -1 } });
    expect(desc[2]).toEqual({ $unset: ["__rank", "__rankMissing"] });

    const asc = sortStages({ field: "severity", direction: 1 }, { updatedAt: 1 });
    expect(asc[1]).toEqual({ $sort: { __rankMissing: 1, __rank: 1, updatedAt: 1, _id: -1 } });
    const addFields = (asc[0] as { $addFields: Record<string, unknown> }).$addFields;
    expect(addFields.__rankMissing).toEqual({ $cond: [{ $in: ["$severity", ["LOW", "MEDIUM", "HIGH"]] }, 0, 1] });
  });
});
