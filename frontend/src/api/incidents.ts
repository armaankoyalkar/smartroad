import { requestData, requestWithMeta } from "./client";
import { toSearchParams } from "./params";
import type {
  DeleteResult,
  Incident,
  IncidentCreateInput,
  IncidentListParams,
  IncidentUpdateInput,
  MyIncidentListParams,
  Paginated,
  PaginationMeta,
  PriorityChangeInput,
  StatusChangeInput,
} from "@/types/api";

const incidentUrl = (id: string) => `/incidents/${encodeURIComponent(id)}`;

/**
 * Build the multipart body for POST /api/incidents and PATCH /api/incidents/:id.
 * Numbers are sent as strings (multipart has no types); the server coerces them.
 * `image: File` appends the file; `removeImage: true` asks the server to drop it.
 */
export function buildIncidentFormData(input: IncidentUpdateInput): FormData {
  const form = new FormData();
  const scalar: (keyof IncidentUpdateInput)[] = [
    "title",
    "category",
    "description",
    "severity",
    "latitude",
    "longitude",
    "address",
    "adminNote",
  ];
  for (const key of scalar) {
    const value = input[key];
    if (value === undefined) continue;
    form.append(key, value === null ? "" : String(value));
  }
  if (input.image instanceof File) form.append("image", input.image, input.image.name);
  if (input.removeImage) form.append("removeImage", "true");
  return form;
}

/** POST /api/incidents (signed-in): report an incident. Returns the reporter variant. */
export function createIncident(input: IncidentCreateInput): Promise<Incident> {
  return requestData<Incident>({ method: "POST", url: "/incidents", data: buildIncidentFormData(input) });
}

/** GET /api/incidents (admin): every incident with filters, search, sort and pagination. */
export function listIncidents(params: IncidentListParams = {}): Promise<Paginated<Incident>> {
  return requestWithMeta<Incident[], PaginationMeta>({
    method: "GET",
    url: "/incidents",
    params: toSearchParams({ ...params }),
  });
}

/** GET /api/incidents/mine (signed-in): the caller's own reports, every status. */
export function listMyIncidents(params: MyIncidentListParams = {}): Promise<Paginated<Incident>> {
  return requestWithMeta<Incident[], PaginationMeta>({
    method: "GET",
    url: "/incidents/mine",
    params: toSearchParams({ ...params }),
  });
}

/** GET /api/incidents/:id (signed-in): privacy variant for the caller. */
export function getIncident(id: string): Promise<Incident> {
  return requestData<Incident>({ method: "GET", url: incidentUrl(id) });
}

/** PATCH /api/incidents/:id: owner while SUBMITTED, or admin. Multipart when an image is involved. */
export function updateIncident(id: string, input: IncidentUpdateInput): Promise<Incident> {
  return requestData<Incident>({ method: "PATCH", url: incidentUrl(id), data: buildIncidentFormData(input) });
}

/** DELETE /api/incidents/:id (admin): permanent. */
export function deleteIncident(id: string): Promise<DeleteResult> {
  return requestData<DeleteResult>({ method: "DELETE", url: incidentUrl(id) });
}

/** PATCH /api/incidents/:id/status (admin). 409 INVALID_TRANSITION, 400 NOTE_REQUIRED. */
export function changeIncidentStatus(id: string, input: StatusChangeInput): Promise<Incident> {
  return requestData<Incident>({ method: "PATCH", url: `${incidentUrl(id)}/status`, data: input });
}

/** PATCH /api/incidents/:id/priority (admin). `priority: null` clears it. */
export function setIncidentPriority(id: string, input: PriorityChangeInput): Promise<Incident> {
  return requestData<Incident>({ method: "PATCH", url: `${incidentUrl(id)}/priority`, data: input });
}
