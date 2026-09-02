import { type Types } from "mongoose";
import { toPoint } from "../../src/lib/geo.js";
import { signToken } from "../../src/middleware/auth.js";
import { Incident, type IncidentAttrs, type IncidentDocument } from "../../src/models/Incident.js";
import { User, type UserDocument } from "../../src/models/User.js";

/**
 * Shared fixtures for the analytics/map/ML integration tests (group "b").
 * Every expected number in those tests is derived by hand from the table
 * below, so a regression in an aggregation shows up as a wrong count rather
 * than as a test that merely mirrors the implementation.
 */

export const DAY_MS = 86_400_000;

export function daysAgo(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

export interface FixtureUsers {
  admin: UserDocument;
  citizen: UserDocument;
  other: UserDocument;
  adminToken: string;
  citizenToken: string;
  otherToken: string;
}

export async function createTestUsers(): Promise<FixtureUsers> {
  const passwordHash = await User.hashPassword("test-password-1");
  const admin = await User.create({ name: "Admin One", email: "admin@b.test", passwordHash, role: "admin" });
  const citizen = await User.create({ name: "Citizen One", email: "citizen@b.test", passwordHash });
  const other = await User.create({ name: "Citizen Two", email: "other@b.test", passwordHash });
  return {
    admin,
    citizen,
    other,
    adminToken: signToken(admin),
    citizenToken: signToken(citizen),
    otherToken: signToken(other),
  };
}

export const FIXTURE_KEYS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"] as const;
export type FixtureKey = (typeof FIXTURE_KEYS)[number];

const IMAGE = {
  filename: "abcdef0123456789.jpg",
  url: "/uploads/abcdef0123456789.jpg",
  mimeType: "image/jpeg",
  size: 1234,
};

const estimate = (level: "LOW" | "MEDIUM" | "HIGH", version = "test-model-1", at: Date = new Date()) => ({
  level,
  probabilities: { LOW: 0.2, MEDIUM: 0.3, HIGH: 0.5 },
  modelVersion: version,
  estimatedAt: at,
});

/**
 * | key | category           | sev    | status       | priority | source | reporter | age   | risk   | notes                     |
 * | A   | POTHOLE            | HIGH   | SUBMITTED    | null     | user   | citizen  | 1 d   | none   | Hitec City                |
 * | B   | POTHOLE            | MEDIUM | UNDER_REVIEW | LOW      | user   | citizen  | 3 d   | none   | Hitec City                |
 * | C   | ACCIDENT           | HIGH   | VERIFIED     | HIGH     | user   | citizen  | 5 d   | HIGH   | Madhapur                  |
 * | D   | ACCIDENT           | MEDIUM | IN_PROGRESS  | CRITICAL | user   | other    | 10 d  | MEDIUM |                           |
 * | E   | WATERLOGGING       | LOW    | RESOLVED     | MEDIUM   | user   | other    | 20 d  | LOW    | resolved 15 d ago         |
 * | F   | OTHER              | LOW    | REJECTED     | null     | user   | citizen  | 2 d   | none   | near A                    |
 * | G   | POTHOLE            | MEDIUM | RESOLVED     | HIGH     | seed   | citizen  | 40 d  | none   | resolved 35 d ago         |
 * | H   | STREET_LIGHT       | LOW    | SUBMITTED    | null     | seed   | other    | 50 d  | none   |                           |
 * | I   | OBSTRUCTION        | MEDIUM | VERIFIED     | HIGH     | seed   | other    | 70 d  | none   | has image                 |
 * | J   | ROAD_DAMAGE        | HIGH   | REJECTED     | MEDIUM   | seed   | citizen  | 8 d   | none   |                           |
 * | K   | TRAFFIC_CONGESTION | MEDIUM | RESOLVED     | null     | user   | citizen  | 45 d  | none   | resolved 44 d ago         |
 * | L   | TRAFFIC_SIGNAL     | HIGH   | IN_PROGRESS  | HIGH     | user   | other    | 100 d | none   | LB Nagar                  |
 * | M   | UNSAFE_ROAD        | LOW    | VERIFIED     | null     | user   | other    | fixed | none   | 2024-03-31T18:30Z (IST 1 Apr) |
 */
export function fixtureDefinitions(
  users: Pick<FixtureUsers, "citizen" | "other">,
  now: Date = new Date(),
): Record<FixtureKey, Partial<IncidentAttrs>> {
  const base = (reporter: UserDocument, overrides: Partial<IncidentAttrs>): Partial<IncidentAttrs> => ({
    description: "Fixture record for the analytics, map and ML integration tests; not a real report.",
    reportedBy: reporter._id as Types.ObjectId,
    ...overrides,
  });
  const { citizen, other } = users;
  const ago = (d: number) => daysAgo(d, now);
  return {
    A: base(citizen, {
      title: "A pothole Hitec City",
      category: "POTHOLE",
      severity: "HIGH",
      location: toPoint(17.4483, 78.3814),
      createdAt: ago(1),
    }),
    B: base(citizen, {
      title: "B pothole service lane",
      category: "POTHOLE",
      severity: "MEDIUM",
      status: "UNDER_REVIEW",
      priority: "LOW",
      location: toPoint(17.45, 78.382),
      createdAt: ago(3),
    }),
    C: base(citizen, {
      title: "C accident Madhapur",
      category: "ACCIDENT",
      severity: "HIGH",
      status: "VERIFIED",
      priority: "HIGH",
      location: toPoint(17.44, 78.39),
      createdAt: ago(5),
      riskEstimate: estimate("HIGH", "test-model-1", ago(4)),
    }),
    D: base(other, {
      title: "D accident in progress",
      category: "ACCIDENT",
      severity: "MEDIUM",
      status: "IN_PROGRESS",
      priority: "CRITICAL",
      location: toPoint(17.445, 78.4),
      createdAt: ago(10),
      riskEstimate: estimate("MEDIUM", "test-model-2", ago(9)),
    }),
    E: base(other, {
      title: "E waterlogging resolved",
      category: "WATERLOGGING",
      severity: "LOW",
      status: "RESOLVED",
      priority: "MEDIUM",
      location: toPoint(17.3949, 78.4353),
      createdAt: ago(20),
      resolvedAt: ago(15),
      riskEstimate: estimate("LOW", "test-model-1", ago(3)),
    }),
    F: base(citizen, {
      title: "F rejected other",
      category: "OTHER",
      severity: "LOW",
      status: "REJECTED",
      location: toPoint(17.4483, 78.383),
      createdAt: ago(2),
      adminNote: "Duplicate of A",
    }),
    G: base(citizen, {
      title: "G seed pothole resolved",
      category: "POTHOLE",
      severity: "MEDIUM",
      status: "RESOLVED",
      priority: "HIGH",
      source: "seed",
      location: toPoint(17.485, 78.4136),
      createdAt: ago(40),
      resolvedAt: ago(35),
    }),
    H: base(other, {
      title: "H seed street light",
      category: "STREET_LIGHT",
      severity: "LOW",
      source: "seed",
      location: toPoint(17.3616, 78.4747),
      createdAt: ago(50),
    }),
    I: base(other, {
      title: "I seed obstruction verified",
      category: "OBSTRUCTION",
      severity: "MEDIUM",
      status: "VERIFIED",
      priority: "HIGH",
      source: "seed",
      location: toPoint(17.4375, 78.4483),
      createdAt: ago(70),
      image: { ...IMAGE, mimeType: "image/jpeg", uploadedAt: ago(70) },
    }),
    J: base(citizen, {
      title: "J seed road damage rejected",
      category: "ROAD_DAMAGE",
      severity: "HIGH",
      status: "REJECTED",
      priority: "MEDIUM",
      source: "seed",
      location: toPoint(17.4056, 78.5591),
      createdAt: ago(8),
      adminNote: "Seed rejection",
    }),
    K: base(citizen, {
      title: "K congestion resolved long ago",
      category: "TRAFFIC_CONGESTION",
      severity: "MEDIUM",
      status: "RESOLVED",
      location: toPoint(17.4401, 78.3489),
      createdAt: ago(45),
      resolvedAt: ago(44),
    }),
    L: base(other, {
      title: "L signal LB Nagar",
      category: "TRAFFIC_SIGNAL",
      severity: "HIGH",
      status: "IN_PROGRESS",
      priority: "HIGH",
      location: toPoint(17.3457, 78.5522),
      createdAt: ago(100),
    }),
    M: base(other, {
      title: "M unsafe road fixed instant",
      category: "UNSAFE_ROAD",
      severity: "LOW",
      status: "VERIFIED",
      location: toPoint(17.4325, 78.42),
      createdAt: new Date("2024-03-31T18:30:00Z"),
    }),
  };
}

export async function createFixtureIncidents(
  users: Pick<FixtureUsers, "citizen" | "other">,
  now: Date = new Date(),
): Promise<Record<FixtureKey, IncidentDocument>> {
  const definitions = fixtureDefinitions(users, now);
  const out = {} as Record<FixtureKey, IncidentDocument>;
  for (const key of FIXTURE_KEYS) {
    out[key] = await Incident.create(definitions[key]);
  }
  return out;
}

export const idOf = (doc: { _id: unknown }): string => String(doc._id);
