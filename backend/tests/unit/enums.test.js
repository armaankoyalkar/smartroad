import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_KEYS, getCategory, isCategoryKey } from "../../src/config/categories.js";
import { LABELS, PRIORITIES, PRIORITY_RANK, SEVERITIES, SEVERITY_RANK, STATUSES, TRANSITIONS } from "../../src/config/enums.js";

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

  it("matches the transition table in docs/01 section 8", () => {
    expect(TRANSITIONS).toEqual({
      REPORTED: ["UNDER_REVIEW", "REJECTED"],
      UNDER_REVIEW: ["VERIFIED", "REJECTED"],
      VERIFIED: ["IN_PROGRESS", "RESOLVED", "REJECTED"],
      IN_PROGRESS: ["RESOLVED"],
      RESOLVED: ["IN_PROGRESS"],
      REJECTED: ["UNDER_REVIEW"],
    });
  });

  it("has a label for every enum value", () => {
    for (const s of STATUSES) expect(LABELS.status[s]).toBeTypeOf("string");
    for (const s of SEVERITIES) expect(LABELS.severity[s]).toBeTypeOf("string");
    for (const p of PRIORITIES) expect(LABELS.priority[p]).toBeTypeOf("string");
  });

  it("ranks priority and severity in the documented order", () => {
    expect(PRIORITIES.map((p) => PRIORITY_RANK[p])).toEqual([1, 2, 3, 4]);
    expect(SEVERITIES.map((s) => SEVERITY_RANK[s])).toEqual([1, 2, 3]);
  });

  it("has eight unique, well-formed categories including the brief's list", () => {
    expect(CATEGORY_KEYS).toEqual([
      "ACCIDENT",
      "POTHOLE",
      "ROAD_DAMAGE",
      "TRAFFIC_SIGNAL",
      "OBSTRUCTION",
      "WATERLOGGING",
      "HAZARD",
      "OTHER",
    ]);
    const colors = new Set();
    for (const c of CATEGORIES) {
      expect(c.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(c.label.length).toBeGreaterThan(2);
      colors.add(c.color);
    }
    expect(colors.size).toBe(CATEGORIES.length);
    expect(isCategoryKey("POTHOLE")).toBe(true);
    expect(isCategoryKey("pothole")).toBe(false);
    expect(getCategory("HAZARD").label).toBe("Hazardous condition");
    expect(getCategory("NOPE")).toBeNull();
  });

  it("is frozen so nothing can mutate the vocabulary at runtime", () => {
    expect(Object.isFrozen(STATUSES)).toBe(true);
    expect(Object.isFrozen(TRANSITIONS)).toBe(true);
    expect(Object.isFrozen(CATEGORIES)).toBe(true);
  });
});
