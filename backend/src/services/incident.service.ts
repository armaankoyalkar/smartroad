import { type PipelineStage, type PopulateOptions, type Types } from "mongoose";
import { ROLES } from "../config/enums.js";
import { AppError } from "../lib/errors.js";
import { fromPoint, toPoint } from "../lib/geo.js";
import { buildIncidentFilter, type IncidentFilter } from "../lib/incidentFilters.js";
import { buildMeta, needsAggregation, sortStages, toMongoSort, type PageMeta, type SortSpec } from "../lib/pagination.js";
import {
  idString,
  serializeIncident,
  serializeIncidents,
  type IncidentSource,
  type SerializedIncident,
} from "../lib/serializers.js";
import { storage } from "../lib/storage.js";
import { type VerifiedFile } from "../middleware/upload.js";
import { Incident, type IncidentAttrs, type IncidentDocument, type IncidentImage } from "../models/Incident.js";
import { type UserDocument } from "../models/User.js";
import {
  type ChangePriorityInput,
  type ChangeStatusInput,
  type CreateIncidentInput,
  type ListIncidentsQuery,
  type MineIncidentsQuery,
  type UpdateIncidentInput,
} from "../validation/incident.schema.js";
import { applyPriorityChange, applyStatusChange } from "./incidentStatus.service.js";

/**
 * Incident reporting, listing, editing and lifecycle (docs/api.md section 6).
 * Every function returns serialized incidents in the caller's privacy
 * variant (lib/serializers.ts); the lifecycle rules live in
 * incidentStatus.service.ts and are applied here before saving.
 */

/** The references the serializer shows: reporter name/email, verifier name, history actor names. */
export const INCIDENT_POPULATE: PopulateOptions[] = [
  { path: "reportedBy", select: "name email" },
  { path: "verifiedBy", select: "name" },
  { path: "statusHistory.changedBy", select: "name" },
];

export interface IncidentPage {
  data: SerializedIncident[];
  meta: PageMeta;
}

const isAdmin = (user: UserDocument): boolean => user.role === ROLES.ADMIN;
const isOwner = (incident: Pick<IncidentSource, "reportedBy">, user: UserDocument): boolean =>
  idString(incident.reportedBy) === String(user._id);

async function storeImage(file: VerifiedFile): Promise<IncidentImage> {
  const stored = await storage.saveImage(file.buffer, file.detectedMimeType);
  return { filename: stored.filename, url: stored.url, mimeType: stored.mimeType, size: stored.size, uploadedAt: new Date() };
}

/** Best-effort removal of a file nothing references any more; never fails the request. */
async function discardImage(image: Pick<IncidentImage, "filename"> | null | undefined): Promise<void> {
  if (!image) return;
  try {
    await storage.deleteImage(image.filename);
  } catch (err) {
    console.error(`Could not delete upload ${image.filename}`, err);
  }
}

/** Save, and if that fails remove the file written for this request so nothing is orphaned. */
async function saveOrDiscard(incident: IncidentDocument, freshImage: IncidentImage | null): Promise<void> {
  try {
    await incident.save();
  } catch (err) {
    await discardImage(freshImage);
    throw err;
  }
}

async function loadOrNotFound(id: string): Promise<IncidentDocument> {
  const incident = await Incident.findById(id);
  if (!incident) throw AppError.notFound("Incident");
  return incident;
}

export async function createIncident(
  reporter: UserDocument,
  input: CreateIncidentInput,
  file: VerifiedFile | null,
): Promise<SerializedIncident> {
  const incident = new Incident({
    title: input.title,
    description: input.description,
    category: input.category,
    severity: input.severity,
    location: toPoint(input.latitude, input.longitude),
    address: input.address ?? "",
    reportedBy: reporter._id,
    status: "SUBMITTED",
    source: "user",
  });
  await incident.validate(); // before anything touches the disk: a rejected report never leaves a file behind
  if (file) incident.image = await storeImage(file);
  await saveOrDiscard(incident, file ? incident.image : null);
  await incident.populate(INCIDENT_POPULATE);
  return serializeIncident(incident, reporter);
}

interface PageQuery {
  page: number;
  limit: number;
  sort: SortSpec;
}

/** Ordinary fields sort in the query; priority and severity need the rank pipeline from lib/pagination.ts. */
async function findSorted(filter: IncidentFilter, sort: SortSpec, skip: number, limit: number): Promise<IncidentSource[]> {
  if (!needsAggregation(sort)) {
    return Incident.find(filter).sort(toMongoSort(sort)).skip(skip).limit(limit).populate(INCIDENT_POPULATE);
  }
  const pipeline: PipelineStage[] = [{ $match: filter }, ...sortStages(sort), { $skip: skip }, { $limit: limit }];
  const rows = await Incident.aggregate<IncidentAttrs & { _id: Types.ObjectId }>(pipeline);
  const docs = rows.map((row) => Incident.hydrate(row));
  await Incident.populate(docs, INCIDENT_POPULATE);
  return docs;
}

async function fetchPage(filter: IncidentFilter, { page, limit, sort }: PageQuery, viewer: UserDocument): Promise<IncidentPage> {
  const skip = (page - 1) * limit;
  const [total, incidents] = await Promise.all([Incident.countDocuments(filter), findSorted(filter, sort, skip, limit)]);
  return { data: serializeIncidents(incidents, viewer), meta: buildMeta(page, limit, total) };
}

/** GET /api/incidents (admin): every incident, admin variant. */
export function listIncidents(query: ListIncidentsQuery, viewer: UserDocument): Promise<IncidentPage> {
  return fetchPage(buildIncidentFilter(query, { isAdmin: true }), query, viewer);
}

/** GET /api/incidents/mine: the caller's reports including REJECTED, reporter variant. */
export function listMine(query: MineIncidentsQuery, viewer: UserDocument): Promise<IncidentPage> {
  return fetchPage(buildIncidentFilter(query, { isAdmin: false, ownerId: viewer._id }), query, viewer);
}

/** GET /api/incidents/:id: a REJECTED report is invisible to everyone but its reporter and admins. */
export async function getIncident(id: string, viewer: UserDocument): Promise<SerializedIncident> {
  const incident = await loadOrNotFound(id);
  if (!isAdmin(viewer) && incident.status === "REJECTED" && !isOwner(incident, viewer)) {
    throw AppError.notFound("Incident");
  }
  await incident.populate(INCIDENT_POPULATE);
  return serializeIncident(incident, viewer);
}

const EDITABLE_FIELDS = ["title", "description", "category", "severity", "address", "adminNote"] as const;

/** Copy the given fields onto the document; returns whether anything was given. */
function applyEdits(incident: IncidentDocument, input: UpdateIncidentInput): boolean {
  let changed = false;
  for (const key of EDITABLE_FIELDS) {
    if (input[key] !== undefined) {
      incident.set(key, input[key]);
      changed = true;
    }
  }
  if (input.latitude !== undefined || input.longitude !== undefined) {
    const current = fromPoint(incident.location);
    const latitude = input.latitude ?? current.latitude;
    const longitude = input.longitude ?? current.longitude;
    if (latitude === null || longitude === null) {
      throw AppError.validation([{ field: "latitude", message: "Both latitude and longitude are required." }]);
    }
    incident.location = toPoint(latitude, longitude);
    changed = true;
  }
  return changed;
}

/** PATCH /api/incidents/:id: the reporter while SUBMITTED, or an admin at any status (docs/api.md section 6.6). */
export async function updateIncident(
  id: string,
  viewer: UserDocument,
  input: UpdateIncidentInput,
  file: VerifiedFile | null,
): Promise<SerializedIncident> {
  const incident = await loadOrNotFound(id);
  if (!isAdmin(viewer)) {
    if (!isOwner(incident, viewer)) throw AppError.notFound("Incident"); // not even its existence is revealed
    if (incident.status !== "SUBMITTED") {
      throw AppError.forbidden("This report is under review and can no longer be edited.");
    }
    if (input.adminNote !== undefined) {
      throw AppError.validation([{ field: "adminNote", message: "Only administrators can change the admin note." }]);
    }
  }
  const previous = incident.image;
  const removing = input.removeImage === true && previous !== null;
  const changed = applyEdits(incident, input);
  if (!changed && !file && !removing) {
    throw AppError.validation([{ field: "body", message: "No changes were provided." }]);
  }

  let fresh: IncidentImage | null = null;
  if (file) {
    fresh = await storeImage(file);
    incident.image = fresh;
  } else if (removing) {
    incident.image = null;
  }
  await saveOrDiscard(incident, fresh);
  if (previous && (fresh || removing)) await discardImage(previous); // only once the new state is stored
  await incident.populate(INCIDENT_POPULATE);
  return serializeIncident(incident, viewer);
}

/** DELETE /api/incidents/:id (admin): the document and its image file. */
export async function deleteIncident(id: string): Promise<{ id: string }> {
  const incident = await Incident.findByIdAndDelete(id);
  if (!incident) throw AppError.notFound("Incident");
  await discardImage(incident.image);
  return { id: String(incident._id) };
}

/** PATCH /api/incidents/:id/status (admin): transition rules from incidentStatus.service.ts. */
export async function changeStatus(id: string, admin: UserDocument, input: ChangeStatusInput): Promise<SerializedIncident> {
  const incident = await loadOrNotFound(id);
  applyStatusChange(incident, { status: input.status, note: input.note ?? null, adminId: admin._id });
  await incident.save();
  await incident.populate(INCIDENT_POPULATE);
  return serializeIncident(incident, admin);
}

/** PATCH /api/incidents/:id/priority (admin): set or clear (null) the priority. */
export async function changePriority(id: string, admin: UserDocument, input: ChangePriorityInput): Promise<SerializedIncident> {
  const incident = await loadOrNotFound(id);
  applyPriorityChange(incident, { priority: input.priority, note: input.note ?? null, adminId: admin._id });
  await incident.save();
  await incident.populate(INCIDENT_POPULATE);
  return serializeIncident(incident, admin);
}
