import { describe, expect, it } from "vitest";
import {
  PRIORITY_COLORS,
  RISK_COLORS,
  SEVERITY_COLORS,
  SOURCE_COLORS,
  STATUS_COLORS,
  VERIFICATION_COLORS,
} from "./colors";
import {
  allowedTransitions,
  canTransition,
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  RISK_LABELS,
  RISK_LEVELS,
  SEVERITIES,
  SEVERITY_LABELS,
  SOURCE_LABELS,
  SOURCES,
  STATUS_LABELS,
  STATUSES,
  TRANSITIONS,
  VERIFICATION_LABELS,
  VERIFICATION_STATES,
  verificationOf,
} from "./enums";

const HEX = /^#[0-9A-F]{6}$/i;

function expectComplete<K extends string>(
  keys: readonly K[],
  colors: Record<K, string>,
  labels: Record<K, string>,
) {
  for (const key of keys) {
    expect(colors[key], `${key} colour`).toMatch(HEX);
    expect(labels[key], `${key} label`).toMatch(/\S/);
  }
  expect(Object.keys(colors).sort()).toEqual([...keys].sort());
  expect(Object.keys(labels).sort()).toEqual([...keys].sort());
}

describe("domain vocabulary (docs/api.md section 2)", () => {
  it("lists the exact keys", () => {
    expect(STATUSES).toEqual([
      "SUBMITTED",
      "UNDER_REVIEW",
      "VERIFIED",
      "IN_PROGRESS",
      "RESOLVED",
      "REJECTED",
    ]);
    expect(SEVERITIES).toEqual(["LOW", "MEDIUM", "HIGH"]);
    expect(PRIORITIES).toEqual(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
    expect(RISK_LEVELS).toEqual(["LOW", "MEDIUM", "HIGH"]);
    expect(VERIFICATION_STATES).toEqual(["PENDING", "VERIFIED", "REJECTED"]);
    expect(SOURCES).toEqual(["user", "seed"]);
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
  });

  it("has a colour and a label for every status, severity, priority, risk, verification and source key", () => {
    expectComplete(STATUSES, STATUS_COLORS, STATUS_LABELS);
    expectComplete(SEVERITIES, SEVERITY_COLORS, SEVERITY_LABELS);
    expectComplete(PRIORITIES, PRIORITY_COLORS, PRIORITY_LABELS);
    expectComplete(RISK_LEVELS, RISK_COLORS, RISK_LABELS);
    expectComplete(VERIFICATION_STATES, VERIFICATION_COLORS, VERIFICATION_LABELS);
    expectComplete(SOURCES, SOURCE_COLORS, SOURCE_LABELS);
  });

  it("uses the documented semantic colours", () => {
    expect(STATUS_COLORS).toEqual({
      SUBMITTED: "#94A3B8",
      UNDER_REVIEW: "#3B82F6",
      VERIFIED: "#14B8A6",
      IN_PROGRESS: "#F59E0B",
      RESOLVED: "#22C55E",
      REJECTED: "#EF4444",
    });
    expect(PRIORITY_COLORS).toEqual({
      LOW: "#22C55E",
      MEDIUM: "#F59E0B",
      HIGH: "#F97316",
      CRITICAL: "#DC2626",
    });
    expect(SEVERITY_COLORS).toEqual({ LOW: "#22C55E", MEDIUM: "#F59E0B", HIGH: "#EF4444" });
    expect(RISK_COLORS).toEqual({ LOW: "#22C55E", MEDIUM: "#F59E0B", HIGH: "#EF4444" });
    expect(VERIFICATION_COLORS).toEqual({ PENDING: "#F59E0B", VERIFIED: "#14B8A6", REJECTED: "#EF4444" });
  });

  it("labels every category (colours come from the API, never from here)", () => {
    for (const key of CATEGORY_KEYS) expect(CATEGORY_LABELS[key]).toMatch(/\S/);
    expect(CATEGORY_LABELS.TRAFFIC_SIGNAL).toBe("Broken traffic signal");
  });

  it("mirrors the status lifecycle", () => {
    expect(TRANSITIONS).toEqual({
      SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
      UNDER_REVIEW: ["VERIFIED", "REJECTED"],
      VERIFIED: ["IN_PROGRESS", "RESOLVED", "REJECTED"],
      IN_PROGRESS: ["RESOLVED"],
      RESOLVED: ["IN_PROGRESS"],
      REJECTED: ["UNDER_REVIEW"],
    });
    expect(canTransition("SUBMITTED", "UNDER_REVIEW")).toBe(true);
    expect(canTransition("SUBMITTED", "VERIFIED")).toBe(false);
    expect(canTransition("RESOLVED", "VERIFIED")).toBe(false);
    expect(allowedTransitions("IN_PROGRESS")).toEqual(["RESOLVED"]);
  });

  it("derives the verification state from the status", () => {
    expect(verificationOf("SUBMITTED")).toBe("PENDING");
    expect(verificationOf("UNDER_REVIEW")).toBe("PENDING");
    expect(verificationOf("VERIFIED")).toBe("VERIFIED");
    expect(verificationOf("IN_PROGRESS")).toBe("VERIFIED");
    expect(verificationOf("RESOLVED")).toBe("VERIFIED");
    expect(verificationOf("REJECTED")).toBe("REJECTED");
  });
});
