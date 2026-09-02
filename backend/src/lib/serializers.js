import { ROLES } from "../config/enums.js";
import { fromPoint } from "./geo.js";

/**
 * Incident privacy variants (docs/04-api-contract.md section 5.1).
 *
 * | viewer   | reportedBy          | verifiedBy   | adminNote + history notes | changedBy   |
 * | admin    | { id, name, email } | { id, name } | yes                       | { id, name }|
 * | reporter | own { id, name }    | null         | yes                       | null        |
 * | other    | null                | null         | omitted                   | null        |
 *
 * Works with populated references (documents) and with raw ObjectIds.
 */

function idString(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  return String(value);
}

function isPopulated(ref) {
  return ref != null && typeof ref === "object" && ("name" in ref || "email" in ref);
}

function userRef(ref, { email = false } = {}) {
  if (ref == null) return null;
  const out = { id: idString(ref) };
  if (isPopulated(ref)) {
    out.name = ref.name ?? null;
    if (email) out.email = ref.email ?? null;
  }
  return out;
}

export function viewerVariant(incident, viewer) {
  if (viewer?.role === ROLES.ADMIN) return "admin";
  const viewerId = idString(viewer?._id ?? viewer?.id ?? null);
  if (viewerId && viewerId === idString(incident.reportedBy)) return "reporter";
  return "public";
}

export function serializeIncident(incident, viewer = null) {
  const src = typeof incident.toObject === "function" ? incident.toObject({ virtuals: false }) : incident;
  const variant = viewerVariant(src, viewer);
  const { latitude, longitude } = fromPoint(src.location);
  const showNotes = variant !== "public";

  const out = {
    id: idString(src._id ?? src.id),
    title: src.title,
    description: src.description,
    category: src.category,
    severity: src.severity,
    priority: src.priority ?? null,
    status: src.status,
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
  } else if (variant === "reporter") {
    out.reportedBy = userRef(src.reportedBy);
  }
  if (showNotes) {
    out.adminNote = src.adminNote ?? null;
  }
  return out;
}

function serializeHistoryEntry(entry, variant) {
  const out = {
    field: entry.field,
    from: entry.from ?? null,
    to: entry.to,
    changedBy: variant === "admin" ? userRef(entry.changedBy) : null,
    at: entry.at,
  };
  if (variant !== "public") out.note = entry.note ?? null;
  return out;
}

export function serializeIncidents(incidents, viewer = null) {
  return incidents.map((i) => serializeIncident(i, viewer));
}
