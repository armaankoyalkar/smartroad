import { type Role, type Status } from "../../src/config/enums.js";
import { toPoint } from "../../src/lib/geo.js";
import { signToken } from "../../src/middleware/auth.js";
import { Incident, type IncidentAttrs, type IncidentDocument } from "../../src/models/Incident.js";
import { User, type UserDocument } from "../../src/models/User.js";
import { applyStatusChange } from "../../src/services/incidentStatus.service.js";

/**
 * Fixtures for the auth/users/incidents integration tests (a-* files).
 * Accounts are created straight through the model so the tests do not
 * depend on the registration endpoint they also cover.
 */

export const PASSWORD = "correct horse battery";

export interface Account {
  user: UserDocument;
  token: string;
  id: string;
}

interface AccountOverrides {
  name?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
  password?: string;
  phone?: string | null;
}

let counter = 0;

export async function createAccount(overrides: AccountOverrides = {}): Promise<Account> {
  counter += 1;
  const user = await User.create({
    name: overrides.name ?? `Test User ${counter}`,
    email: overrides.email ?? `user${counter}-${process.pid}@example.test`,
    passwordHash: await User.hashPassword(overrides.password ?? PASSWORD),
    role: overrides.role ?? "citizen",
    isActive: overrides.isActive ?? true,
    phone: overrides.phone ?? null,
  });
  return { user, token: signToken(user), id: String(user._id) };
}

export const bearer = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });

/** A valid JSON body for POST /api/incidents. */
export const INCIDENT_BODY = Object.freeze({
  title: "Deep pothole near Hitec City flyover",
  description: "About 40 cm wide pothole on the left lane just after the flyover exit.",
  category: "POTHOLE",
  severity: "HIGH",
  latitude: 17.4483,
  longitude: 78.3814,
  address: "Hitec City Main Road, Madhapur, Hyderabad",
});

export async function createIncident(reporter: UserDocument, overrides: Partial<IncidentAttrs> = {}): Promise<IncidentDocument> {
  const incident = new Incident({
    title: INCIDENT_BODY.title,
    description: INCIDENT_BODY.description,
    category: "POTHOLE",
    severity: "HIGH",
    location: toPoint(INCIDENT_BODY.latitude, INCIDENT_BODY.longitude),
    address: INCIDENT_BODY.address,
    reportedBy: reporter._id,
    ...overrides,
  });
  await incident.save();
  return incident;
}

/** A status alone, or [status, note] when the step needs a note (REJECTED). */
export type LifecycleStep = Status | [Status, string];

/** Walk an incident through the given transitions as `admin` and save it. */
export async function advance(incident: IncidentDocument, admin: UserDocument, steps: LifecycleStep[]): Promise<IncidentDocument> {
  for (const step of steps) {
    const [status, note] = Array.isArray(step) ? step : [step, null];
    applyStatusChange(incident, { status, note, adminId: admin._id });
  }
  await incident.save();
  return incident;
}
