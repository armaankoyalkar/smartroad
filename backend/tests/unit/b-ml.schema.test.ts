import { describe, expect, it } from "vitest";
import {
  estimateRiskBody,
  incidentRiskQuery,
  mlBatchResponseSchema,
  mlEstimateResponseSchema,
  mlHotspotsResponseSchema,
  modelInfoSchema,
  riskFeaturesSchema,
} from "../../src/validation/ml.schema.js";

/** The example from docs/api.md section 9. */
const FEATURES = {
  hour: 18,
  day_of_week: "FRI",
  month: 11,
  light_conditions: "DARK_LIT",
  weather: "RAIN",
  road_surface: "WET",
  road_type: "ARTERIAL",
  speed_limit: 60,
  area_type: "URBAN",
  category: "ACCIDENT",
};

describe("riskFeaturesSchema", () => {
  it("accepts the documented example and strips unknown keys", () => {
    expect(riskFeaturesSchema.parse({ ...FEATURES, extra: 1 })).toEqual(FEATURES);
    expect(estimateRiskBody.parse({ features: FEATURES })).toEqual({ features: FEATURES });
  });

  it("requires all ten features with the documented ranges and values", () => {
    const fields = (input: unknown) => {
      const result = riskFeaturesSchema.safeParse(input);
      return result.success ? [] : [...new Set(result.error.issues.map((i) => i.path.join(".")))].sort();
    };
    expect(fields({})).toHaveLength(10);
    expect(fields({ ...FEATURES, hour: 24 })).toEqual(["hour"]);
    expect(fields({ ...FEATURES, hour: -1 })).toEqual(["hour"]);
    expect(fields({ ...FEATURES, hour: 17.5 })).toEqual(["hour"]);
    expect(fields({ ...FEATURES, month: 0 })).toEqual(["month"]);
    expect(fields({ ...FEATURES, month: 13 })).toEqual(["month"]);
    expect(fields({ ...FEATURES, speed_limit: 19 })).toEqual(["speed_limit"]);
    expect(fields({ ...FEATURES, speed_limit: 121 })).toEqual(["speed_limit"]);
    expect(fields({ ...FEATURES, day_of_week: "Friday" })).toEqual(["day_of_week"]);
    expect(fields({ ...FEATURES, light_conditions: "DARK" })).toEqual(["light_conditions"]);
    expect(fields({ ...FEATURES, weather: "SNOW" })).toEqual(["weather"]);
    expect(fields({ ...FEATURES, road_surface: "ICY" })).toEqual(["road_surface"]);
    expect(fields({ ...FEATURES, road_type: "MOTORWAY" })).toEqual(["road_type"]);
    expect(fields({ ...FEATURES, area_type: "SUBURBAN" })).toEqual(["area_type"]);
    expect(fields({ ...FEATURES, category: "HAZARD" })).toEqual(["category"]);
    // JSON bodies carry numbers as numbers; strings are not coerced.
    expect(fields({ ...FEATURES, hour: "18" })).toEqual(["hour"]);
    expect(fields({ ...FEATURES, hour: { $gt: 0 } })).toEqual(["hour"]);
  });

  it("accepts every boundary value", () => {
    expect(riskFeaturesSchema.safeParse({ ...FEATURES, hour: 0, month: 1, speed_limit: 20 }).success).toBe(
      true,
    );
    expect(riskFeaturesSchema.safeParse({ ...FEATURES, hour: 23, month: 12, speed_limit: 120 }).success).toBe(
      true,
    );
  });
});

describe("incidentRiskQuery", () => {
  it("coerces query-string overrides, ignores blanks and defaults refresh to false", () => {
    expect(incidentRiskQuery.parse({})).toEqual({ refresh: false });
    expect(
      incidentRiskQuery.parse({ hour: "5", speed_limit: "60", weather: "RAIN", refresh: "true", month: "" }),
    ).toEqual({
      hour: 5,
      speed_limit: 60,
      weather: "RAIN",
      refresh: true,
    });
    expect(incidentRiskQuery.parse({ refresh: "1" }).refresh).toBe(true);
    expect(incidentRiskQuery.parse({ refresh: "" }).refresh).toBe(false);
  });

  it("rejects out-of-range or unknown override values", () => {
    expect(incidentRiskQuery.safeParse({ hour: "24" }).success).toBe(false);
    expect(incidentRiskQuery.safeParse({ speed_limit: "500" }).success).toBe(false);
    expect(incidentRiskQuery.safeParse({ speed_limit: "60.5" }).success).toBe(false);
    expect(incidentRiskQuery.safeParse({ road_type: "MOTORWAY" }).success).toBe(false);
    expect(incidentRiskQuery.safeParse({ category: "HAZARD" }).success).toBe(false);
    expect(incidentRiskQuery.safeParse({ refresh: "maybe" }).success).toBe(false);
  });
});

describe("ML service response schemas", () => {
  it("accept the documented bodies", () => {
    expect(
      mlEstimateResponseSchema.safeParse({
        risk_level: "HIGH",
        probabilities: { LOW: 0.12, MEDIUM: 0.33, HIGH: 0.55 },
        model_version: "demo-rf-1.0.0",
        is_demo_model: true,
        contributions: [
          { feature: "speed_limit", value: 60, effect: 0.18 },
          { feature: "weather", value: "RAIN", effect: -0.02 },
        ],
        disclaimer: "Estimate from historical data.",
      }).success,
    ).toBe(true);
    expect(
      mlBatchResponseSchema.safeParse({
        model_version: "demo-rf-1.0.0",
        is_demo_model: true,
        results: [{ id: "a", risk_level: "LOW", probabilities: { LOW: 0.7, MEDIUM: 0.2, HIGH: 0.1 } }],
      }).success,
    ).toBe(true);
    expect(
      mlHotspotsResponseSchema.safeParse({
        clusters: [
          {
            id: 0,
            centroid: { lat: 17.4479, lng: 78.3821 },
            radius_m: 140,
            count: 7,
            member_ids: ["a", "b"],
          },
        ],
        noise_ids: ["c"],
        params: { eps_m: 200, min_samples: 4, algorithm: "DBSCAN (haversine)" },
        total_points: 3,
      }).success,
    ).toBe(true);
  });

  it("reject malformed bodies", () => {
    expect(mlEstimateResponseSchema.safeParse({ risk_level: "EXTREME" }).success).toBe(false);
    expect(
      mlEstimateResponseSchema.safeParse({
        risk_level: "HIGH",
        probabilities: { LOW: 0.5, HIGH: 0.5 },
        model_version: "v",
        is_demo_model: true,
        contributions: [],
        disclaimer: "d",
      }).success,
    ).toBe(false);
    expect(
      mlBatchResponseSchema.safeParse({ model_version: "v", is_demo_model: false, results: "none" }).success,
    ).toBe(false);
    expect(mlHotspotsResponseSchema.safeParse({ clusters: [], noise_ids: [] }).success).toBe(false);
  });

  it("checks the parts of model info the API relies on and passes the rest through", () => {
    const info = {
      modelName: "RandomForestClassifier",
      modelVersion: "demo-rf-1.0.0",
      trainedAt: "2026-09-01T00:00:00Z",
      isDemoModel: true,
      features: [{ name: "hour", label: "Hour of day", type: "integer", min: 0, max: 23 }],
      classes: ["LOW", "MEDIUM", "HIGH"],
      metrics: { accuracy: 0.5 },
      hotspotDefaults: { epsMeters: 200, minSamples: 4 },
      disclaimer: "Estimate from historical data.",
    };
    const parsed = modelInfoSchema.parse(info);
    expect(parsed).toEqual(info);
    expect(modelInfoSchema.safeParse({ ...info, isDemoModel: "yes" }).success).toBe(false);
    expect(modelInfoSchema.safeParse({ ...info, features: undefined }).success).toBe(false);
    expect(modelInfoSchema.safeParse({ ...info, modelVersion: "" }).success).toBe(false);
  });
});
