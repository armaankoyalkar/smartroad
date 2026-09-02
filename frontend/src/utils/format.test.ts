import { describe, expect, it } from "vitest";
import {
  EM_DASH,
  formatBytes,
  formatCoordinate,
  formatDate,
  formatDateTime,
  formatLatLng,
  formatMeters,
  formatMetric,
  formatNumber,
  formatPercent,
  formatPeriod,
  formatRelative,
  initials,
  parseDate,
  pluralize,
  roundCoordinate,
  toDateInputValue,
  truncate,
} from "./format";

describe("dates", () => {
  it("formats ISO timestamps and falls back to an em dash", () => {
    expect(formatDate("2026-09-12T12:00:00.000Z")).toBe("12 Sep 2026");
    expect(formatDateTime("2026-09-12T12:00:00.000Z")).toMatch(/^12 Sep 2026, \d{2}:\d{2}$/);
    expect(formatDate(null)).toBe(EM_DASH);
    expect(formatDate("not a date")).toBe(EM_DASH);
    expect(parseDate("2026-13-45")).toBeNull();
  });

  it("formats relative time", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelative(twoHoursAgo)).toBe("2 hours ago");
    expect(formatRelative(undefined)).toBe(EM_DASH);
  });

  it("formats timeline periods per granularity", () => {
    expect(formatPeriod("2026-08", "month")).toBe("Aug 2026");
    expect(formatPeriod("2026-08-03", "week")).toBe("Week of 3 Aug");
    expect(formatPeriod("2026-08-03", "day")).toBe("3 Aug");
    expect(formatPeriod("garbage", "day")).toBe("garbage");
  });

  it("produces values for date inputs", () => {
    expect(toDateInputValue("2026-09-01T12:00:00.000Z")).toBe("2026-09-01");
    expect(toDateInputValue(null)).toBe("");
  });
});

describe("coordinates", () => {
  it("rounds to five decimals", () => {
    expect(roundCoordinate(17.123456789)).toBe(17.12346);
    expect(roundCoordinate(-78.1)).toBe(-78.1);
    expect(roundCoordinate(17.123456789, 2)).toBe(17.12);
  });

  it("formats coordinates with fixed decimals", () => {
    expect(formatCoordinate(17.1)).toBe("17.10000");
    expect(formatCoordinate(null)).toBe(EM_DASH);
    expect(formatLatLng(17.4483, 78.3814)).toBe("17.44830, 78.38140");
    expect(formatLatLng(null, 1)).toBe(EM_DASH);
  });
});

describe("numbers and text", () => {
  it("formats counts, percentages, metrics, bytes and distances", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber(null)).toBe(EM_DASH);
    expect(formatPercent(0.523)).toBe("52.3%");
    expect(formatPercent(0.5, 0)).toBe("50%");
    expect(formatMetric(0.81234)).toBe("0.812");
    expect(formatBytes(734221)).toBe("717 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatMeters(140)).toBe("140 m");
    expect(formatMeters(1234)).toBe("1.2 km");
  });

  it("truncates, pluralises and builds initials", () => {
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("abc", 4)).toBe("abc");
    expect(pluralize(1, "incident")).toBe("1 incident");
    expect(pluralize(2, "incident")).toBe("2 incidents");
    expect(initials("Priya Sharma")).toBe("PS");
    expect(initials("Admin")).toBe("A");
    expect(initials("")).toBe("?");
  });
});
