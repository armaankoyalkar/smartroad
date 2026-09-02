import { Router } from "express";
import {
  breakdownSchemas,
  getBreakdown,
  getMine,
  getPublic,
  getSummary,
  getTimeline,
  summarySchemas,
  timelineSchemas,
} from "../controllers/analytics.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";

/** /api/analytics (docs/api.md section 7): public, mine, summary, breakdown, timeline. */
export const analyticsRouter: Router = Router();

analyticsRouter.get("/public", getPublic);
analyticsRouter.get("/mine", requireAuth, getMine);
analyticsRouter.get("/summary", requireAuth, requireAdmin, validate(summarySchemas), getSummary);
analyticsRouter.get("/breakdown", requireAuth, requireAdmin, validate(breakdownSchemas), getBreakdown);
analyticsRouter.get("/timeline", requireAuth, requireAdmin, validate(timelineSchemas), getTimeline);
