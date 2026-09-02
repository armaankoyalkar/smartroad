import { Router } from "express";
import * as incidents from "../controllers/incidents.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { reportLimiter } from "../middleware/rateLimit.js";
import { requireAdmin } from "../middleware/requireRole.js";
import { uploadImage } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import {
  changePrioritySchemas,
  changeStatusSchemas,
  createIncidentSchemas,
  incidentIdSchemas,
  listIncidentsSchemas,
  mineIncidentsSchemas,
  updateIncidentSchemas,
} from "../validation/incident.schema.js";

/**
 * /api/incidents (docs/api.md section 6). The upload middleware keeps the
 * image in memory; the service writes it only after validation, so a
 * rejected request never leaves a file on disk.
 */
export const incidentsRouter: Router = Router();

incidentsRouter.post("/", requireAuth, reportLimiter, uploadImage, validate(createIncidentSchemas), incidents.create);
incidentsRouter.get("/", requireAuth, requireAdmin, validate(listIncidentsSchemas), incidents.list);
// "/mine" before "/:id" so it is never read as an id.
incidentsRouter.get("/mine", requireAuth, validate(mineIncidentsSchemas), incidents.mine);
incidentsRouter.get("/:id", requireAuth, validate(incidentIdSchemas), incidents.get);
incidentsRouter.patch(
  "/:id",
  requireAuth,
  validate({ params: updateIncidentSchemas.params }), // a malformed id is rejected before the multipart body is parsed
  uploadImage,
  validate({ body: updateIncidentSchemas.body }),
  incidents.update,
);
incidentsRouter.delete("/:id", requireAuth, requireAdmin, validate(incidentIdSchemas), incidents.remove);
incidentsRouter.patch("/:id/status", requireAuth, requireAdmin, validate(changeStatusSchemas), incidents.changeStatus);
incidentsRouter.patch("/:id/priority", requireAuth, requireAdmin, validate(changePrioritySchemas), incidents.changePriority);
