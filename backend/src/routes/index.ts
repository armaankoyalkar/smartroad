import { Router } from "express";
import { analyticsRouter } from "./analytics.routes.js";
import { authRouter } from "./auth.routes.js";
import { healthRouter } from "./health.routes.js";
import { incidentsRouter } from "./incidents.routes.js";
import { mapRouter } from "./map.routes.js";
import { metaRouter } from "./meta.routes.js";
import { mlRouter } from "./ml.routes.js";
import { usersRouter } from "./users.routes.js";

/**
 * All API routes under /api (docs/api.md section 3). Each resource owns its
 * own file so feature work never edits this one.
 */
export const apiRouter: Router = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/meta", metaRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/incidents", incidentsRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/map", mapRouter);
apiRouter.use("/ml", mlRouter);
