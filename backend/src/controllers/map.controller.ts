import { type RequestHandler } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { type ValidatedRequest } from "../middleware/validate.js";
import { getHotspots } from "../services/hotspot.service.js";
import { listMapIncidents } from "../services/map.service.js";
import { hotspotsQuery, mapIncidentsQuery } from "../validation/map.schema.js";

/** /api/map (docs/api.md section 8). Schemas are exported for the router's validate(). */

export const mapIncidentsSchemas = { query: mapIncidentsQuery };
export const hotspotsSchemas = { query: hotspotsQuery };

/** GET /api/map/incidents (optional token: admins get priority/riskLevel and may include REJECTED) */
export const getIncidents: RequestHandler = asyncHandler<ValidatedRequest<typeof mapIncidentsSchemas>>(
  async (req, res) => {
    const { data, meta } = await listMapIncidents(req.validated.query, req.user);
    res.json({ success: true, data, meta });
  },
);

/** GET /api/map/hotspots (admin) */
export const getHotspotClusters: RequestHandler = asyncHandler<ValidatedRequest<typeof hotspotsSchemas>>(
  async (req, res) => {
    const { data, meta } = await getHotspots(req.validated.query);
    res.json({ success: true, data, meta });
  },
);
