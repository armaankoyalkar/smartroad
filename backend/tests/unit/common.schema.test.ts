import { describe, expect, it } from "vitest";
import { z } from "zod";
import { STATUSES } from "../../src/config/enums.js";
import {
  booleanish,
  csvEnum,
  dateRangeFields,
  isoDate,
  objectId,
  objectIdParam,
  optionalBooleanish,
  paginationQuery,
  refineDateRange,
  sortQuery,
} from "../../src/validation/common.schema.js";

describe("objectIdParam", () => {
  it("accepts 24 hex characters and rejects anything else", () => {
    expect(objectIdParam.parse({ id: "66d5a2b8c2b7a4e8f1a2b3d0" })).toEqual({ id: "66d5a2b8c2b7a4e8f1a2b3d0" });
    expect(objectId.safeParse("66D5A2B8C2B7A4E8F1A2B3D0").success).toBe(true);
    for (const bad of ["123", "zzzzzzzzzzzzzzzzzzzzzzzz", "", "66d5a2b8c2b7a4e8f1a2b3d0x"]) {
      expect(objectIdParam.safeParse({ id: bad }).success).toBe(false);
    }
  });
});

describe("csvEnum", () => {
  const status = csvEnum(STATUSES);

  it("splits comma-separated strings and accepts repeated keys", () => {
    expect(status.parse("SUBMITTED,VERIFIED")).toEqual(["SUBMITTED", "VERIFIED"]);
    expect(status.parse(" SUBMITTED , VERIFIED ,")).toEqual(["SUBMITTED", "VERIFIED"]);
    expect(status.parse(["SUBMITTED", "REJECTED,RESOLVED"])).toEqual(["SUBMITTED", "REJECTED", "RESOLVED"]);
    expect(status.parse("VERIFIED,VERIFIED")).toEqual(["VERIFIED"]);
  });

  it("is undefined when absent or empty", () => {
    expect(status.parse(undefined)).toBeUndefined();
    expect(status.parse("")).toBeUndefined();
    expect(status.parse(",")).toBeUndefined();
  });

  it("rejects unknown values and non-string input", () => {
    const result = status.safeParse("SUBMITTED,REPORTED");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual([1]);
    expect(status.safeParse(42).success).toBe(false);
    expect(status.safeParse({ $ne: "x" }).success).toBe(false);
  });
});

describe("isoDate", () => {
  it("parses dates and date-times", () => {
    expect(isoDate.parse("2026-09-01")).toEqual(new Date("2026-09-01T00:00:00Z"));
    expect(isoDate.parse("2026-09-01T10:15:00Z")).toEqual(new Date("2026-09-01T10:15:00Z"));
    expect(isoDate.parse("2026-09-01T10:15:00.250+05:30")).toEqual(new Date("2026-09-01T04:45:00.250Z"));
  });

  it("rejects other formats and impossible dates", () => {
    for (const bad of ["01/09/2026", "2026-9-1", "1", "2026-13-45", "yesterday", "2026-09-01T25:00:00Z"]) {
      expect(isoDate.safeParse(bad).success).toBe(false);
    }
  });

  it("supports a from/to range with a refinement", () => {
    const schema = z.object(dateRangeFields).superRefine(refineDateRange);
    expect(schema.parse({})).toEqual({});
    expect(schema.parse({ from: "2026-08-01", to: "2026-08-31" }).to).toEqual(new Date("2026-08-31T00:00:00Z"));
    const inverted = schema.safeParse({ from: "2026-08-31", to: "2026-08-01" });
    expect(inverted.success).toBe(false);
    if (!inverted.success) expect(inverted.error.issues[0]?.path).toEqual(["to"]);
  });
});

describe("paginationQuery", () => {
  it("applies defaults and limits", () => {
    expect(paginationQuery.parse({})).toEqual({ page: 1, limit: 20 });
    expect(paginationQuery.parse({ page: "3", limit: "100" })).toEqual({ page: 3, limit: 100 });
    expect(paginationQuery.safeParse({ limit: "101" }).success).toBe(false);
    expect(paginationQuery.safeParse({ page: "0" }).success).toBe(false);
    expect(paginationQuery.safeParse({ page: "1.5" }).success).toBe(false);
    expect(paginationQuery.extend({ q: z.string().optional() }).parse({ q: "x" })).toEqual({ page: 1, limit: 20, q: "x" });
  });
});

describe("sortQuery", () => {
  const sort = sortQuery(["createdAt", "name", "email"], "-createdAt");

  it("parses into a SortSpec with the fallback when absent", () => {
    expect(sort.parse(undefined)).toEqual({ field: "createdAt", direction: -1 });
    expect(sort.parse("name")).toEqual({ field: "name", direction: 1 });
    expect(sort.parse("-email")).toEqual({ field: "email", direction: -1 });
  });

  it("rejects fields outside the allowed list", () => {
    const result = sort.safeParse("-password");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toMatch(/createdAt, name, email/);
  });
});

describe("booleanish", () => {
  it("accepts true/false/1/0 strings and booleans", () => {
    expect(booleanish.parse("true")).toBe(true);
    expect(booleanish.parse("1")).toBe(true);
    expect(booleanish.parse("FALSE")).toBe(false);
    expect(booleanish.parse("0")).toBe(false);
    expect(booleanish.parse(true)).toBe(true);
    expect(booleanish.safeParse("yes").success).toBe(false);
    expect(booleanish.safeParse(undefined).success).toBe(false);
    expect(optionalBooleanish.parse(undefined)).toBeUndefined();
    expect(optionalBooleanish.parse("")).toBeUndefined();
    expect(optionalBooleanish.parse("false")).toBe(false);
  });
});
