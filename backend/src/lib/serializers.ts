import { type Types } from "mongoose";
import { type CategoryKey } from "../config/categories.js";
import {
  ROLES,
  verificationOf,
  type Priority,
  type RiskLevel,
  type Severity,
  type Source,
  type Status,
  type VerificationState,
} from "../config/enums.js";
import { fromPoint } from "./geo.js";

/**
 * Incident privacy variants (docs/api.md section 6.1).
 *
 * | viewer   | reportedBy          | verifiedBy   | adminNote + history notes | changedBy    | riskEstimate |
 * | admin    | { id, name, email } | { id, name } | yes                       | { id, name } | yes or null  |
 * | reporter | own { id, name }    | null         | yes                       | null         | omitted      |
 * | other    | null                | null         | omitted                   | null         | omitted      |
 *
 * Works with populated references (documents) and with raw ObjectIds, and
 * with Mongoose documents or plain objects (tests, aggregation output).
 */

export type Variant = "admin" | "reporter" | "public";

type IdLike = string | Types.ObjectId | { _id?: unknown; id?: unknown } | null | undefined;

/** A user reference as stored (ObjectId) or populated ({ _id, name, email }). */
export type UserRefSource = IdLike | { _id?: unknown; name?: string; email?: string };

export interface ViewerLike {
  _id?: unknown;
  id?: unknown;
  role?: string;
}

export interface HistoryEntrySource {
  field: string;
  from?: string | null;
  to: string;
  note?: string | null;
  changedBy?: UserRefSource;
  at: Date;
}

/** The fields the serializer reads; a superset of what IncidentDocument provides. */
export interface IncidentSource {
  _id?: unknown;
  id?: unknown;
  title: string;
  description: string;
  category: CategoryKey | string;
  severity: Severity | string;
  priority?: Priority | string | null;
  status: Status;
  location?: unknown;
  address?: string | null;
  image?: { url: string; mimeType: string; size: number } | null;
  reportedBy?: UserRefSource;
  verifiedBy?: UserRefSource;
  adminNote?: string | null;
  statusHistory?: HistoryEntrySource[];
  riskEstimate?: {
    level: RiskLevel;
    probabilities: Record<RiskLevel, number>;
    modelVersion: string;
    estimatedAt: Date;
  } | null;
  source?: Source | string;
  resolvedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  toObject?: (options?: { virtuals?: boolean }) => unknown;
}

export interface SerializedUserRef {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface SerializedHistoryEntry {
  field: string;
  from: string | null;
  to: string;
  note?: string | null;
  changedBy: SerializedUserRef | null;
  at: Date;
}

export interface SerializedRiskEstimate {
  level: RiskLevel;
  probabilities: Record<RiskLevel, number>;
  modelVersion: string;
  estimatedAt: Date;
}

export interface SerializedIncident {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  priority: string | null;
  status: Status;
  verification: VerificationState;
  latitude: number | null;
  longitude: number | null;
  address: string;
  image: { url: string; mimeType: string; size: number } | null;
  reportedBy: SerializedUserRef | null;
  verifiedBy: SerializedUserRef | null;
  adminNote?: string | null;
  statusHistory: SerializedHistoryEntry[];
  riskEstimate?: SerializedRiskEstimate | null;
  source: string;
  resolvedAt: Date | null;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
}

export function idString(value: IdLike | UserRefSource): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in value && value._id != null) return String(value._id);
  if (typeof value === "object" && "id" in value && value.id != null) return String(value.id);
  return String(value);
}

function isPopulated(ref: UserRefSource): ref is { _id?: unknown; name?: string; email?: string } {
  return ref != null && typeof ref === "object" && ("name" in ref || "email" in ref);
}

function userRef(ref: UserRefSource, { email = false } = {}): SerializedUserRef | null {
  if (ref == null) return null;
  const id = idString(ref);
  if (id == null) return null;
  const out: SerializedUserRef = { id };
  if (isPopulated(ref)) {
    out.name = ref.name ?? null;
    if (email) out.email = ref.email ?? null;
  }
  return out;
}

export function viewerVariant(incident: Pick<IncidentSource, "reportedBy">, viewer: ViewerLike | null | undefined): Variant {
  if (viewer?.role === ROLES.ADMIN) return "admin";
  const viewerId = idString((viewer?._id ?? viewer?.id ?? null) as IdLike);
  if (viewerId && viewerId === idString(incident.reportedBy)) return "reporter";
  return "public";
}

export function serializeIncident(incident: IncidentSource, viewer: ViewerLike | null = null): SerializedIncident {
  const src = (typeof incident.toObject === "function" ? incident.toObject({ virtuals: false }) : incident) as IncidentSource;
  const variant = viewerVariant(src, viewer);
  const { latitude, longitude } = fromPoint(src.location);
  const showNotes = variant !== "public";

  const out: SerializedIncident = {
    id: idString((src._id ?? src.id) as IdLike) ?? "",
    title: src.title,
    description: src.description,
    category: src.category,
    severity: src.severity,
    priority: src.priority ?? null,
    status: src.status,
    verification: verificationOf(src.status),
    latitude,
    longitude,
    address: src.address ?? "",
    image: src.image ? { url: src.image.url, mimeType: src.image.mimeType, size: src.image.size } : null,
    reportedBy: null,
    verifiedBy: null,
    statusHistory: (src.statusHistory ?? []).map((entry) => serializeHistoryEntry(entry, variant)),
    source: src.source ?? "user",
    resolvedAt: src.resolvedAt ?? null,
    createdAt: src.createdAt,
    updatedAt: src.updatedAt,
  };

  if (variant === "admin") {
    out.reportedBy = userRef(src.reportedBy, { email: true });
    out.verifiedBy = userRef(src.verifiedBy);
    out.riskEstimate = src.riskEstimate
      ? {
          level: src.riskEstimate.level,
          probabilities: {
            LOW: src.riskEstimate.probabilities.LOW,
            MEDIUM: src.riskEstimate.probabilities.MEDIUM,
            HIGH: src.riskEstimate.probabilities.HIGH,
          },
          modelVersion: src.riskEstimate.modelVersion,
          estimatedAt: src.riskEstimate.estimatedAt,
        }
      : null;
  } else if (variant === "reporter") {
    out.reportedBy = userRef(src.reportedBy);
  }
  if (showNotes) {
    out.adminNote = src.adminNote ?? null;
  }
  return out;
}

function serializeHistoryEntry(entry: HistoryEntrySource, variant: Variant): SerializedHistoryEntry {
  const out: SerializedHistoryEntry = {
    field: entry.field,
    from: entry.from ?? null,
    to: entry.to,
    changedBy: variant === "admin" ? userRef(entry.changedBy) : null,
    at: entry.at,
  };
  if (variant !== "public") out.note = entry.note ?? null;
  return out;
}

export function serializeIncidents(incidents: IncidentSource[], viewer: ViewerLike | null = null): SerializedIncident[] {
  return incidents.map((i) => serializeIncident(i, viewer));
}
