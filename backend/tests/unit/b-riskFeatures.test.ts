import { describe, expect, it } from "vitest";
import { RISK_FEATURE_NAMES } from "../../src/config/mlFeatures.js";
import {
  ASSUMED_DEFAULTS,
  deriveIncidentFeatures,
  hasOverrides,
  pickOverrides,
} from "../../src/services/riskFeatures.service.js";

const IST = "Asia/Kolkata";

describe("deriveIncidentFeatures", () => {
  it("derives hour, day and month in Asia/Kolkata and assumes the rest (night, non-waterlogging)", () => {
    // 2026-08-31 18:30 UTC is Tuesday 2026-09-01 00:00 in Kolkata.
    const { features, assumedFeatures } = deriveIncidentFeatures(
      { createdAt: new Date("2026-08-31T18:30:00Z"), category: "POTHOLE" },
      IST,
    );
    expect(features).toEqual({
      hour: 0,
      day_of_week: "TUE",
      month: 9,
      light_conditions: "DARK_LIT",
      weather: "CLEAR",
      road_surface: "DRY",
      road_type: "LOCAL",
      speed_limit: 40,
      area_type: "URBAN",
      category: "POTHOLE",
    });
    expect(assumedFeatures).toEqual([
      "light_conditions",
      "weather",
      "road_surface",
      "road_type",
      "speed_limit",
      "area_type",
    ]);
    expect(ASSUMED_DEFAULTS).toEqual({
      weather: "CLEAR",
      road_type: "LOCAL",
      speed_limit: 40,
      area_type: "URBAN",
    });
  });

  it("reports DAYLIGHT (not assumed) between 6:00 and 18:00 local time", () => {
    const noon = deriveIncidentFeatures(
      { createdAt: new Date("2026-09-01T06:30:00Z"), category: "ACCIDENT" },
      IST,
    );
    expect(noon.features.hour).toBe(12);
    expect(noon.features.light_conditions).toBe("DAYLIGHT");
    expect(noon.assumedFeatures).not.toContain("light_conditions");

    const six = deriveIncidentFeatures(
      { createdAt: new Date("2026-09-01T00:30:00Z"), category: "ACCIDENT" },
      IST,
    );
    expect(six.features.hour).toBe(6);
    expect(six.features.light_conditions).toBe("DAYLIGHT");

    const eighteen = deriveIncidentFeatures(
      { createdAt: new Date("2026-09-01T12:30:00Z"), category: "ACCIDENT" },
      IST,
    );
    expect(eighteen.features.hour).toBe(18);
    expect(eighteen.features.light_conditions).toBe("DARK_LIT");
    expect(eighteen.assumedFeatures).toContain("light_conditions");
  });

  it("uses FLOODED for WATERLOGGING without marking the surface as assumed", () => {
    const { features, assumedFeatures } = deriveIncidentFeatures(
      { createdAt: new Date("2026-07-15T04:00:00Z"), category: "WATERLOGGING" },
      IST,
    );
    expect(features.road_surface).toBe("FLOODED");
    expect(features.category).toBe("WATERLOGGING");
    expect(assumedFeatures).toEqual(["weather", "road_type", "speed_limit", "area_type"]);
  });

  it("applies overrides and removes them from the assumed list", () => {
    const { features, assumedFeatures } = deriveIncidentFeatures(
      { createdAt: new Date("2026-08-31T18:30:00Z"), category: "POTHOLE" },
      IST,
      { weather: "RAIN", speed_limit: 60, road_type: "HIGHWAY", hour: 5, category: "ACCIDENT" },
    );
    expect(features).toMatchObject({
      hour: 5,
      day_of_week: "TUE",
      weather: "RAIN",
      speed_limit: 60,
      road_type: "HIGHWAY",
      category: "ACCIDENT",
      // light is derived from the report time, not from an hour override
      light_conditions: "DARK_LIT",
    });
    expect(assumedFeatures).toEqual(["light_conditions", "road_surface", "area_type"]);
  });

  it("honours the requested time zone", () => {
    const utc = deriveIncidentFeatures(
      { createdAt: new Date("2026-08-31T18:30:00Z"), category: "OTHER" },
      "UTC",
    );
    expect(utc.features).toMatchObject({
      hour: 18,
      day_of_week: "MON",
      month: 8,
      light_conditions: "DARK_LIT",
    });
  });
});

describe("pickOverrides / hasOverrides", () => {
  it("keeps only defined feature values", () => {
    const picked = pickOverrides({
      weather: "RAIN",
      hour: undefined,
      speed_limit: 50,
      refresh: true,
    } as never);
    expect(picked).toEqual({ weather: "RAIN", speed_limit: 50 });
    expect(hasOverrides(picked)).toBe(true);
    expect(hasOverrides({})).toBe(false);
    expect(hasOverrides({ hour: undefined })).toBe(false);
    expect(RISK_FEATURE_NAMES).toHaveLength(10);
  });
});
