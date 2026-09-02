import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import { apiRouter } from "./routes/index.js";

/**
 * Build the Express application. Kept separate from server.js so tests can
 * mount it with supertest without opening a port.
 */
export function createApp() {
  const app = express();

  app.set("trust proxy", env.TRUST_PROXY ? 1 : false);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin tools (curl, tests) send no Origin header: allow them.
        if (!origin || env.CORS_ORIGIN.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));

  if (env.LOG_FORMAT !== "none" && !env.isTest) {
    app.use(morgan(env.LOG_FORMAT));
  }

  app.use("/api", globalLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
