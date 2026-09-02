import { Router } from "express";
import {
  estimateRiskSchemas,
  getDistribution,
  getIncidentRisk,
  getInfo,
  incidentRiskSchemas,
  postEstimateRisk,
  postRefresh,
} from "../controllers/ml.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";

/** /api/ml (docs/api.md section 9): model info, risk estimates, refresh, distribution. Admin only. */
export const mlRouter: Router = Router();

mlRouter.use(requireAuth, requireAdmin);

mlRouter.get("/model-info", getInfo);
mlRouter.post("/estimate-risk", validate(estimateRiskSchemas), postEstimateRisk);
mlRouter.get("/incidents/:id/risk", validate(incidentRiskSchemas), getIncidentRisk);
mlRouter.post("/risk/refresh", postRefresh);
mlRouter.get("/risk/distribution", getDistribution);
