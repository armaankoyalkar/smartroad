import { describe, expect, it } from "vitest";
import { camelizeKeys, snakeToCamel } from "../../src/lib/case.js";

describe("snakeToCamel", () => {
  it("converts lower-case snake_case keys only", () => {
    expect(snakeToCamel("model_version")).toBe("modelVersion");
    expect(snakeToCamel("day_of_week")).toBe("dayOfWeek");
    expect(snakeToCamel("radius_m")).toBe("radiusM");
    expect(snakeToCamel("macro_f1")).toBe("macroF1");
    expect(snakeToCamel("hour")).toBe("hour");
    expect(snakeToCamel("alreadyCamel")).toBe("alreadyCamel");
    // Enum-like keys are values used as keys and must survive untouched.
    expect(snakeToCamel("LOW")).toBe("LOW");
    expect(snakeToCamel("ROAD_DAMAGE")).toBe("ROAD_DAMAGE");
    expect(snakeToCamel("MON")).toBe("MON");
    expect(snakeToCamel("_private")).toBe("_private");
  });
});

describe("camelizeKeys", () => {
  it("deep-converts plain objects and arrays, preserving values and special objects", () => {
    const when = new Date("2026-09-01T00:00:00Z");
    const input = {
      model_version: "demo-rf-1.0.0",
      is_demo_model: true,
      class_distribution: { train: { LOW: 1, MEDIUM: 2, HIGH: 3 } },
      category_counts: { POTHOLE: 5, ROAD_DAMAGE: 2 },
      feature_importance: [{ feature: "speed_limit", importance: 0.1, method: "permutation" }],
      metrics: { per_class: { HIGH: { precision: 0, recall: 0, f1: 0, support: 0 } } },
      trained_at: when,
      nothing: null,
      values: ["day_of_week", 1, null],
    };
    expect(camelizeKeys(input)).toEqual({
      modelVersion: "demo-rf-1.0.0",
      isDemoModel: true,
      classDistribution: { train: { LOW: 1, MEDIUM: 2, HIGH: 3 } },
      categoryCounts: { POTHOLE: 5, ROAD_DAMAGE: 2 },
      featureImportance: [{ feature: "speed_limit", importance: 0.1, method: "permutation" }],
      metrics: { perClass: { HIGH: { precision: 0, recall: 0, f1: 0, support: 0 } } },
      trainedAt: when,
      nothing: null,
      values: ["day_of_week", 1, null],
    });
    expect((camelizeKeys(input) as { trainedAt: Date }).trainedAt).toBeInstanceOf(Date);
  });

  it("returns primitives and arrays at the top level unchanged in shape", () => {
    expect(camelizeKeys("x")).toBe("x");
    expect(camelizeKeys(3)).toBe(3);
    expect(camelizeKeys(null)).toBeNull();
    expect(camelizeKeys([{ noise_ids: [] }])).toEqual([{ noiseIds: [] }]);
  });

  it("does not mutate the input", () => {
    const input = { risk_level: "HIGH", nested: { eps_m: 200 } };
    camelizeKeys(input);
    expect(input).toEqual({ risk_level: "HIGH", nested: { eps_m: 200 } });
  });
});
