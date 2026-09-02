import { env } from "../config/env.js";
import { DAYS_OF_WEEK, type DayOfWeek } from "../config/mlFeatures.js";

/**
 * Time-zone aware calendar helpers built on Intl.DateTimeFormat, so the
 * hour/day features (docs/api.md section 9) and the timeline buckets
 * (section 7) agree with the ANALYTICS_TIMEZONE setting without a date
 * library.
 */

export type Granularity = "day" | "week" | "month";
export const GRANULARITIES = Object.freeze(["day", "week", "month"] as const);

export interface ZoneParts {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  hour: number; // 0..23
  dayOfWeek: DayOfWeek;
}

const WEEKDAY_LOOKUP: Record<string, DayOfWeek> = {
  Mon: "MON",
  Tue: "TUE",
  Wed: "WED",
  Thu: "THU",
  Fri: "FRI",
  Sat: "SAT",
  Sun: "SUN",
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Calendar fields of an instant as seen in `timeZone` (default ANALYTICS_TIMEZONE). */
export function zoneParts(date: Date, timeZone: string = env.ANALYTICS_TIMEZONE): ZoneParts {
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid date");
  const parts: Record<string, string> = {};
  for (const part of formatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  const hour = Number(parts.hour) % 24; // some engines print 24 for midnight
  const dayOfWeek = WEEKDAY_LOOKUP[parts.weekday ?? ""];
  if (!dayOfWeek || !DAYS_OF_WEEK.includes(dayOfWeek)) throw new Error(`Unexpected weekday "${parts.weekday}"`);
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour, dayOfWeek };
}

interface CivilDate {
  year: number;
  month: number;
  day: number;
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

function civilKey({ year, month, day }: CivilDate): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** Calendar arithmetic on civil dates (no instants involved, so no DST surprises). */
function addDays(civil: CivilDate, days: number): CivilDate {
  const d = new Date(Date.UTC(civil.year, civil.month - 1, civil.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function mondayOf(civil: CivilDate): CivilDate {
  const utc = new Date(Date.UTC(civil.year, civil.month - 1, civil.day));
  const offset = (utc.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(civil, -offset);
}

/** "YYYY-MM-DD" of the instant in the time zone. */
export function formatDay(date: Date, timeZone: string = env.ANALYTICS_TIMEZONE): string {
  return civilKey(zoneParts(date, timeZone));
}

/** "YYYY-MM-DD" of the Monday starting the week that contains the instant. */
export function formatWeek(date: Date, timeZone: string = env.ANALYTICS_TIMEZONE): string {
  return civilKey(mondayOf(zoneParts(date, timeZone)));
}

/** "YYYY-MM" of the instant in the time zone. */
export function formatMonth(date: Date, timeZone: string = env.ANALYTICS_TIMEZONE): string {
  const { year, month } = zoneParts(date, timeZone);
  return `${pad(year, 4)}-${pad(month)}`;
}

/** The timeline period key for a granularity (docs/api.md section 7). */
export function formatPeriod(date: Date, granularity: Granularity, timeZone: string = env.ANALYTICS_TIMEZONE): string {
  switch (granularity) {
    case "day":
      return formatDay(date, timeZone);
    case "week":
      return formatWeek(date, timeZone);
    case "month":
      return formatMonth(date, timeZone);
  }
}

/**
 * Every period key from `from` to `to` inclusive, in order, for gap filling.
 * Both bounds are instants; the keys are computed in the time zone.
 */
export function enumeratePeriods(
  from: Date,
  to: Date,
  granularity: Granularity,
  timeZone: string = env.ANALYTICS_TIMEZONE,
): string[] {
  if (from.getTime() > to.getTime()) return [];
  const last = formatPeriod(to, granularity, timeZone);
  const keys: string[] = [];
  let civil: CivilDate = zoneParts(from, timeZone);
  if (granularity === "week") civil = mondayOf(civil);
  if (granularity === "month") civil = { ...civil, day: 1 };

  const MAX_KEYS = 5000; // safety valve: 13 years of days
  while (keys.length < MAX_KEYS) {
    const key = granularity === "month" ? `${pad(civil.year, 4)}-${pad(civil.month)}` : civilKey(civil);
    keys.push(key);
    if (key === last) break;
    if (key > last) {
      keys.pop();
      break;
    }
    if (granularity === "day") civil = addDays(civil, 1);
    else if (granularity === "week") civil = addDays(civil, 7);
    else civil = civil.month === 12 ? { year: civil.year + 1, month: 1, day: 1 } : { ...civil, month: civil.month + 1 };
  }
  return keys;
}

/** Default reporting window per granularity, ending now (docs/api.md section 7). */
export function defaultRange(granularity: Granularity, now: Date = new Date()): { from: Date; to: Date } {
  const DAY = 86400000;
  const spans: Record<Granularity, number> = { day: 30 * DAY, week: 26 * 7 * DAY, month: 365 * DAY };
  return { from: new Date(now.getTime() - spans[granularity]), to: now };
}
