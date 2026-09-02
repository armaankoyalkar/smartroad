import { describe, expect, it } from "vitest";
import { NEUTRAL_COLOR, SEVERITY_COLORS, STATUS_COLORS } from "@/constants/colors";
import { TEST_META } from "@/test/utils";
import type { MapFeatureProperties } from "@/types/api";
import { featureColor, legendItems } from "./mapColors";
import {
  countActiveMapFilters,
  EMPTY_MAP_FILTERS,
  hotspotParamsFromFilters,
  mapFiltersToParams,
  parseMapFilters,
  serializeMapFilters,
} from "./mapFilterState";

const props: MapFeatureProperties = {
  id: "1",
  title: "Pothole",
  category: "POTHOLE",
  severity: "HIGH",
  status: "VERIFIED",
  verification: "VERIFIED",
  priority: null,
  riskLevel: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  address: "",
  source: "user",
  hasImage: false,
};

describe("marker colours", () => {
  it("come from the API categories or the semantic colour maps", () => {
    expect(featureColor(props, "category", TEST_META)).toBe("#D97706");
    expect(featureColor(props, "severity", TEST_META)).toBe(SEVERITY_COLORS.HIGH);
    expect(featureColor(props, "status", TEST_META)).toBe(STATUS_COLORS.VERIFIED);
    expect(featureColor(props, "risk", TEST_META)).toBe(NEUTRAL_COLOR);
    expect(featureColor({ ...props, riskLevel: "HIGH" }, "risk", TEST_META)).toBe("#EF4444");
    expect(
      featureColor(
        { ...props, category: "UNKNOWN" as MapFeatureProperties["category"] },
        "category",
        TEST_META,
      ),
    ).toBe("#94A3B8");
  });

  it("legend entries match the marker colours", () => {
    expect(legendItems("category", TEST_META)).toHaveLength(10);
    expect(legendItems("category", TEST_META)[0]).toEqual({
      key: "POTHOLE",
      label: "Pothole",
      color: "#D97706",
    });
    expect(legendItems("status", TEST_META).map((i) => i.key)).toEqual([
      "SUBMITTED",
      "UNDER_REVIEW",
      "VERIFIED",
      "IN_PROGRESS",
      "RESOLVED",
      "REJECTED",
    ]);
    expect(legendItems("risk", TEST_META).at(-1)).toEqual({
      key: "NONE",
      label: "No estimate",
      color: NEUTRAL_COLOR,
    });
    expect(legendItems("severity", TEST_META).map((i) => i.label)).toEqual(["Low", "Medium", "High"]);
  });
});

describe("map filter state", () => {
  it("parses the URL, dropping unknown values and admin-only facets for visitors", () => {
    const params = new URLSearchParams(
      "category=POTHOLE,BOGUS,ACCIDENT&status=VERIFIED&severity=HIGH&priority=HIGH&riskLevel=NONE&from=2026-08-01&to=bad&color=risk",
    );
    expect(parseMapFilters(params)).toEqual({
      ...EMPTY_MAP_FILTERS,
      category: ["POTHOLE", "ACCIDENT"],
      status: ["VERIFIED"],
      severity: ["HIGH"],
      from: "2026-08-01",
      colorMode: "category",
    });
    const admin = parseMapFilters(params, { isAdmin: true });
    expect(admin.priority).toEqual(["HIGH"]);
    expect(admin.riskLevel).toEqual(["NONE"]);
    expect(admin.colorMode).toBe("risk");
  });

  it("serialises back to URL values and counts active facets", () => {
    const filters = {
      ...EMPTY_MAP_FILTERS,
      category: ["POTHOLE" as const],
      from: "2026-08-01",
      colorMode: "severity" as const,
    };
    expect(serializeMapFilters(filters)).toMatchObject({
      category: ["POTHOLE"],
      from: "2026-08-01",
      to: undefined,
      color: "severity",
    });
    expect(serializeMapFilters(EMPTY_MAP_FILTERS).color).toBeUndefined();
    expect(countActiveMapFilters(EMPTY_MAP_FILTERS)).toBe(0);
    expect(countActiveMapFilters(filters)).toBe(2);
  });

  it("builds API parameters, omitting admin facets for other callers", () => {
    const filters = {
      ...EMPTY_MAP_FILTERS,
      status: ["VERIFIED" as const],
      priority: ["CRITICAL" as const],
      riskLevel: ["HIGH" as const],
      to: "2026-09-01",
    };
    expect(mapFiltersToParams(filters, { limit: 1000, bbox: [78, 17, 79, 18] })).toEqual({
      category: undefined,
      status: ["VERIFIED"],
      severity: undefined,
      source: undefined,
      from: undefined,
      to: "2026-09-01",
      bbox: [78, 17, 79, 18],
      limit: 1000,
    });
    expect(mapFiltersToParams(filters, { isAdmin: true })).toMatchObject({
      priority: ["CRITICAL"],
      riskLevel: ["HIGH"],
    });
    expect(hotspotParamsFromFilters(filters, { eps: 300 })).toEqual({
      eps: 300,
      minSamples: undefined,
      category: undefined,
      status: ["VERIFIED"],
      from: undefined,
      to: "2026-09-01",
    });
  });
});
