import { pingDb } from "../config/db.js";
import * as mlClient from "../lib/mlClient.js";

const startedAt = Date.now();

/**
 * GET /api/health
 * 200 when the database answers, 503 when it does not. The ML service is
 * reported but never affects the status: the application works without it.
 */
export async function getHealth(req, res) {
  const [database, mlService] = await Promise.all([pingDb(), mlClient.health()]);
  const ok = database.status === "up";
  res.status(ok ? 200 : 503).json({
    success: ok,
    data: {
      status: ok ? "ok" : "degraded",
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
      checks: { database, mlService },
    },
  });
}
