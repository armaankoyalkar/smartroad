import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_KEYS, getCategory, isCategoryKey } from "../../src/config/categories.js";
import {
  ACTIVE_STATUSES,
  isOneOf,
  isStatus,
  LABELS,
  OPEN_STATUSES,
  PENDING_STATUSES,
  PRIORITIES,
  PRIORITY_RANK,
  RISK_LEVELS,
  ROLE_VALUES,
  SEVERITIES,
  SEVERITY_RANK,
  SOURCES,
  STATUSES,
  TRANSITIONS,
  VERIFICATION_STATES,
  VERIFICATION_STATUSES,
  verificationOf,
} from "../../src/config/enums.js";

describe("domain vocabulary", () => {
  it("defines a transition entry for every status and only targets known statuses", () => {
    for (const status of STATUSES) {
      expect(TRANSITIONS).toHaveProperty(status);
      for (const target of TRANSITIONS[status]) {
        expect(STATUSES).toContain(target);
        expect(target).not.toBe(status);
      }
    }
  });

  it("matches the transition table in docs/api.md section 2", () => {
    expect(TRANSITIONS).toEqual({
      SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
      UNDER_REVIEW: ["VERIFIED", "REJECTED"],
      VERIFIED: ["IN_PROGRESS", "RESOLVED", "REJECTED"],
      IN_PROGRESS: ["RESOLVED"],
      RESOLVED: ["IN_PROGRESS"],
      REJECTED: ["UNDER_REVIEW"],
    });
  });

  it("derives the verification state from the status", () => {
    expect(VERIFICATION_STATES).toEqual(["PENDING", "VERIFIED", "REJECTED"]);
    expect(verificationOf("SUBMITTED")).toBe("PENDING");
    expect(verificationOf("UNDER_REVIEW")).toBe("PENDING");
    expect(verificationOf("VERIFIED")).toBe("VERIFIED");
    expect(verificationOf("IN_PROGRESS")).toBe("VERIFIED");
    expect(verificationOf("RESOLVED")).toBe("VERIFIED");
    expect(verificationOf("REJECTED")).toBe("REJECTED");
    // Every status belongs to exactly one verification state.
    const covered = Object.values(VERIFICATION_STATUSES).flat();
    expect([...covered].sort()).toEqual([...STATUSES].sort());
    for (const status of STATUSES) expect(VERIFICATION_STATUSES[verificationOf(status)]).toContain(status);
  });

  it("groups statuses for the analytics count definitions", () => {
    expect(PENDING_STATUSES).toEqual(["SUBMITTED", "UNDER_REVIEW"]);
    expect(ACTIVE_STATUSES).toEqual(["VERIFIED", "IN_PROGRESS"]);
    expect(OPEN_STATUSES).toEqual(["SUBMITTED", "UNDER_REVIEW", "VERIFIED", "IN_PROGRESS"]);
    expect(RISK_LEVELS).toEqual(["LOW", "MEDIUM", "HIGH"]);
    expect(SOURCES).toEqual(["user", "seed"]);
    expect(ROLE_VALUES).toEqual(["citizen", "admin"]);
  });

  it("has a label for every enum value", () => {
    for (const s of STATUSES) expect(LABELS.status[s]).toBeTypeOf("string");
    for (const s of SEVERITIES) expect(LABELS.severity[s]).toBeTypeOf("string");
    for (const p of PRIORITIES) expect(LABELS.priority[p]).toBeTypeOf("string");
    for (const v of VERIFICATION_STATES) expect(LABELS.verification[v]).toBeTypeOf("string");
    for (const r of RISK_LEVELS) expect(LABELS.riskLevel[r]).toBeTypeOf("string");
    for (const s of SOURCES) expect(LABELS.source[s]).toBeTypeOf("string");
    for (const r of ROLE_VALUES) expect(LABELS.role[r]).toBeTypeOf("string");
  });

  it("ranks priority and severity in the documented order", () => {
    expect(PRIORITIES.map((p) => PRIORITY_RANK[p])).toEqual([1, 2, 3, 4]);
    expect(SEVERITIES.map((s) => SEVERITY_RANK[s])).toEqual([1, 2, 3]);
  });

  it("has ten unique, well-formed categories in the documented order", () => {
    expect(CATEGORY_KEYS).toEqual([
      "POTHOLE",
      "ROAD_DAMAGE",
      "ACCIDENT",
      "TRAFFIC_CONGESTION",
      "TRAFFIC_SIGNAL",
      "STREET_LIGHT",
      "UNSAFE_ROAD",
      "OBSTRUCTION",
      "WATERLOGGING",
      "OTHER",
    ]);
    const colors = new Set<string>();
    for (const c of CATEGORIES) {
      expect(c.color).toMatch(/^#[0-9A-F]{6}$/);
      expect(c.label.length).toBeGreaterThan(2);
      colors.add(c.color);
    }
    expect(colors.size).toBe(CATEGORIES.length);
    expect(isCategoryKey("POTHOLE")).toBe(true);
    expect(isCategoryKey("pothole")).toBe(false);
    expect(isCategoryKey("HAZARD")).toBe(false);
    expect(getCategory("UNSAFE_ROAD")?.label).toBe("Unsafe road condition");
    expect(getCategory("NOPE")).toBeNull();
  });

  it("narrows unknown values with the type guards", () => {
    expect(isStatus("SUBMITTED")).toBe(true);
    expect(isStatus("REPORTED")).toBe(false);
    expect(isOneOf(SEVERITIES, "HIGH")).toBe(true);
    expect(isOneOf(SEVERITIES, 3)).toBe(false);
  });

  it("is frozen so nothing can mutate the vocabulary at runtime", () => {
    expect(Object.isFrozen(STATUSES)).toBe(true);
    expect(Object.isFrozen(TRANSITIONS)).toBe(true);
    expect(Object.isFrozen(CATEGORIES)).toBe(true);
    expect(Object.isFrozen(LABELS.status)).toBe(true);
  });
});
