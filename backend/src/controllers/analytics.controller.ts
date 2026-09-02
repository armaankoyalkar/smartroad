import { type RequestHandler } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { AppError } from "../lib/errors.js";
import { type ValidatedRequest } from "../middleware/validate.js";
import { computeMyStats, computeSummary, getPublicStats, rangeMeta } from "../services/analytics.service.js";
import { computeBreakdown, computeTimeline } from "../services/analyticsCharts.service.js";
import { analyticsRangeQuery, breakdownQuery, timelineQuery } from "../validation/analytics.schema.js";

/** /api/analytics (docs/api.md section 7). Schemas are exported for the router's validate(). */

export const summarySchemas = { query: analyticsRangeQuery };
export const breakdownSchemas = { query: breakdownQuery };
export const timelineSchemas = { query: timelineQuery };

/** GET /api/analytics/public: cached landing-page figures, real reports only. */
export const getPublic: RequestHandler = asyncHandler(async (_req, res) => {
  const { value, cached } = await getPublicStats();
  res.json({ success: true, data: value, meta: { cached } });
});

/** GET /api/analytics/mine */
export const getMine: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthenticated();
  res.json({ success: true, data: await computeMyStats(req.user._id) });
});

/** GET /api/analytics/summary (admin) */
export const getSummary: RequestHandler = asyncHandler<ValidatedRequest<typeof summarySchemas>>(
  async (req, res) => {
    const query = req.validated.query;
    res.json({ success: true, data: await computeSummary(query), meta: rangeMeta(query) });
  },
);

/** GET /api/analytics/breakdown?by=... (admin) */
export const getBreakdown: RequestHandler = asyncHandler<ValidatedRequest<typeof breakdownSchemas>>(
  async (req, res) => {
    const { by, ...range } = req.validated.query;
    res.json({ success: true, data: await computeBreakdown(by, range), meta: { by, ...rangeMeta(range) } });
  },
);

/** GET /api/analytics/timeline?granularity=... (admin) */
export const getTimeline: RequestHandler = asyncHandler<ValidatedRequest<typeof timelineSchemas>>(
  async (req, res) => {
    const { data, meta } = await computeTimeline(req.validated.query);
    res.json({ success: true, data, meta });
  },
);
