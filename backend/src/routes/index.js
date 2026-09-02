import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { metaRouter } from "./meta.routes.js";

/**
 * All API routes under /api. Later phases add:
 *   /auth (3), /users (3), /incidents (4, 5), /analytics (5, 7),
 *   /map (6, 9), /ml (8).
 */
export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/meta", metaRouter);
