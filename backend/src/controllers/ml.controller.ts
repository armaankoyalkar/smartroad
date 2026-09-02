import { type RequestHandler } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { type ValidatedRequest } from "../middleware/validate.js";
import {
  estimateIncidentRisk,
  estimateRisk,
  getModelInfo,
  refreshRiskEstimates,
  riskDistribution,
} from "../services/ml.service.js";
import { pickOverrides } from "../services/riskFeatures.service.js";
import { objectIdParam } from "../validation/common.schema.js";
import { estimateRiskBody, incidentRiskQuery } from "../validation/ml.schema.js";

/** /api/ml (docs/api.md section 9, all admin). Schemas are exported for the router's validate(). */

export const estimateRiskSchemas = { body: estimateRiskBody };
export const incidentRiskSchemas = { params: objectIdParam, query: incidentRiskQuery };

/** GET /api/ml/model-info: the ML service's /model/info in camelCase, cached ten minutes. */
export const getInfo: RequestHandler = asyncHandler(async (_req, res) => {
  const { value, cached } = await getModelInfo();
  res.json({ success: true, data: value, meta: { cached } });
});

/** POST /api/ml/estimate-risk */
export const postEstimateRisk: RequestHandler = asyncHandler<ValidatedRequest<typeof estimateRiskSchemas>>(
  async (req, res) => {
    res.json({ success: true, data: await estimateRisk(req.validated.body.features) });
  },
);

/** GET /api/ml/incidents/:id/risk */
export const getIncidentRisk: RequestHandler = asyncHandler<ValidatedRequest<typeof incidentRiskSchemas>>(
  async (req, res) => {
    const { refresh, ...features } = req.validated.query;
    const data = await estimateIncidentRisk(req.validated.params.id, {
      overrides: pickOverrides(features),
      refresh,
    });
    res.json({ success: true, data });
  },
);

/** POST /api/ml/risk/refresh */
export const postRefresh: RequestHandler = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await refreshRiskEstimates() });
});

/** GET /api/ml/risk/distribution */
export const getDistribution: RequestHandler = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await riskDistribution() });
});
