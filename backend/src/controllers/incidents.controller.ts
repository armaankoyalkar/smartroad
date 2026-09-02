import { asyncHandler } from "../lib/asyncHandler.js";
import { verifiedFile } from "../middleware/upload.js";
import { type ValidatedRequest } from "../middleware/validate.js";
import * as incidentService from "../services/incident.service.js";
import {
  type changePrioritySchemas,
  type changeStatusSchemas,
  type createIncidentSchemas,
  type incidentIdSchemas,
  type listIncidentsSchemas,
  type mineIncidentsSchemas,
  type updateIncidentSchemas,
} from "../validation/incident.schema.js";
import { currentUser } from "./auth.controller.js";

/** /api/incidents handlers (docs/api.md section 6). */

export const create = asyncHandler<ValidatedRequest<typeof createIncidentSchemas>>(async (req, res) => {
  const data = await incidentService.createIncident(currentUser(req), req.validated.body, verifiedFile(req));
  res.status(201).json({ success: true, data });
});

export const list = asyncHandler<ValidatedRequest<typeof listIncidentsSchemas>>(async (req, res) => {
  const { data, meta } = await incidentService.listIncidents(req.validated.query, currentUser(req));
  res.json({ success: true, data, meta });
});

export const mine = asyncHandler<ValidatedRequest<typeof mineIncidentsSchemas>>(async (req, res) => {
  const { data, meta } = await incidentService.listMine(req.validated.query, currentUser(req));
  res.json({ success: true, data, meta });
});

export const get = asyncHandler<ValidatedRequest<typeof incidentIdSchemas>>(async (req, res) => {
  const data = await incidentService.getIncident(req.validated.params.id, currentUser(req));
  res.json({ success: true, data });
});

export const update = asyncHandler<ValidatedRequest<typeof updateIncidentSchemas>>(async (req, res) => {
  const { params, body } = req.validated;
  const data = await incidentService.updateIncident(params.id, currentUser(req), body, verifiedFile(req));
  res.json({ success: true, data });
});

export const remove = asyncHandler<ValidatedRequest<typeof incidentIdSchemas>>(async (req, res) => {
  const data = await incidentService.deleteIncident(req.validated.params.id);
  res.json({ success: true, data });
});

export const changeStatus = asyncHandler<ValidatedRequest<typeof changeStatusSchemas>>(async (req, res) => {
  const data = await incidentService.changeStatus(req.validated.params.id, currentUser(req), req.validated.body);
  res.json({ success: true, data });
});

export const changePriority = asyncHandler<ValidatedRequest<typeof changePrioritySchemas>>(async (req, res) => {
  const data = await incidentService.changePriority(req.validated.params.id, currentUser(req), req.validated.body);
  res.json({ success: true, data });
});
