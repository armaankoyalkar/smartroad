import { Router } from "express";
import {
  getHotspotClusters,
  getIncidents,
  hotspotsSchemas,
  mapIncidentsSchemas,
} from "../controllers/map.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";

/** /api/map (docs/api.md section 8): GeoJSON incidents and DBSCAN hotspots. */
export const mapRouter: Router = Router();

mapRouter.get("/incidents", optionalAuth, validate(mapIncidentsSchemas), getIncidents);
mapRouter.get("/hotspots", requireAuth, requireAdmin, validate(hotspotsSchemas), getHotspotClusters);
