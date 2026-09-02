import { describe, expect, it } from "vitest";
import {
  defaultRange,
  enumeratePeriods,
  formatDay,
  formatMonth,
  formatPeriod,
  formatWeek,
  zoneParts,
} from "../../src/lib/time.js";

const IST = "Asia/Kolkata";

describe("zoneParts", () => {
  it("applies the +05:30 offset of Asia/Kolkata (the configured default)", () => {
    // 2026-09-01 20:30 UTC is 2026-09-02 02:00 in Kolkata, a Wednesday.
    const parts = zoneParts(new Date("2026-09-01T20:30:00Z"));
    expect(parts).toEqual({ year: 2026, month: 9, day: 2, hour: 2, dayOfWeek: "WED" });
    expect(zoneParts(new Date("2026-09-01T20:30:00Z"), "UTC")).toEqual({
      year: 2026,
      month: 9,
      day: 1,
      hour: 20,
      dayOfWeek: "TUE",
    });
  });

  it("reports midnight as hour 0 and handles the year boundary", () => {
    expect(zoneParts(new Date("2026-12-31T18:30:00Z"), IST)).toEqual({ year: 2027, month: 1, day: 1, hour: 0, dayOfWeek: "FRI" });
    expect(zoneParts(new Date("2026-12-31T18:29:59Z"), IST).year).toBe(2026);
  });

  it("uses the requested zone, including ones with daylight saving", () => {
    expect(zoneParts(new Date("2026-07-01T12:00:00Z"), "Europe/London").hour).toBe(13);
    expect(zoneParts(new Date("2026-01-01T12:00:00Z"), "Europe/London").hour).toBe(12);
    expect(zoneParts(new Date("2026-03-08T12:00:00Z"), "America/New_York").hour).toBe(8);
  });

  it("rejects invalid dates", () => {
    expect(() => zoneParts(new Date("nope"))).toThrow(RangeError);
  });
});

describe("period formatting", () => {
  const instant = new Date("2026-08-31T18:30:00Z"); // 2026-09-01 00:00 IST

  it("formats day, week (Monday) and month keys in the zone", () => {
    expect(formatDay(instant)).toBe("2026-09-01");
    expect(formatDay(instant, "UTC")).toBe("2026-08-31");
    expect(formatWeek(instant)).toBe("2026-08-31"); // Tuesday 1 Sep belongs to the week starting Monday 31 Aug
    expect(formatWeek(new Date("2026-09-06T12:00:00Z"))).toBe("2026-08-31"); // Sunday still the same week
    expect(formatWeek(new Date("2026-09-07T12:00:00Z"))).toBe("2026-09-07");
    expect(formatMonth(instant)).toBe("2026-09");
    expect(formatMonth(instant, "UTC")).toBe("2026-08");
    expect(formatPeriod(instant, "day")).toBe("2026-09-01");
    expect(formatPeriod(instant, "week")).toBe("2026-08-31");
    expect(formatPeriod(instant, "month")).toBe("2026-09");
  });
});

describe("enumeratePeriods", () => {
  it("lists every day between two instants in the zone", () => {
    const keys = enumeratePeriods(new Date("2026-08-30T00:00:00Z"), new Date("2026-09-02T00:00:00Z"), "day");
    expect(keys).toEqual(["2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02"]);
    // 18:30 UTC on 31 Aug is already 1 Sep in Kolkata
    expect(enumeratePeriods(new Date("2026-08-31T18:30:00Z"), new Date("2026-09-01T18:29:00Z"), "day")).toEqual(["2026-09-01"]);
  });

  it("lists weeks by their Monday", () => {
    const keys = enumeratePeriods(new Date("2026-08-30T00:00:00Z"), new Date("2026-09-02T00:00:00Z"), "week");
    expect(keys).toEqual(["2026-08-24", "2026-08-31"]);
  });

  it("lists months across a year boundary", () => {
    const keys = enumeratePeriods(new Date("2026-11-15T00:00:00Z"), new Date("2027-02-01T00:00:00Z"), "month");
    expect(keys).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });

  it("returns an empty list for an inverted range and a single key for equal bounds", () => {
    const now = new Date("2026-09-02T10:00:00Z");
    expect(enumeratePeriods(new Date("2026-09-03T00:00:00Z"), now, "day")).toEqual([]);
    expect(enumeratePeriods(now, now, "day")).toEqual(["2026-09-02"]);
  });
});

describe("defaultRange", () => {
  it("covers 30 days, 26 weeks or a year ending now", () => {
    const now = new Date("2026-09-02T10:00:00Z");
    const DAY = 86400000;
    expect(defaultRange("day", now)).toEqual({ from: new Date(now.getTime() - 30 * DAY), to: now });
    expect(defaultRange("week", now)).toEqual({ from: new Date(now.getTime() - 26 * 7 * DAY), to: now });
    expect(defaultRange("month", now)).toEqual({ from: new Date(now.getTime() - 365 * DAY), to: now });
  });
});
