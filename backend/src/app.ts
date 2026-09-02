import cors from "cors";
import express, { type Express, type RequestHandler } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { AppError } from "./lib/errors.js";
import { isSafeFilename, UPLOAD_ROOT } from "./lib/storage.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import { apiRouter } from "./routes/index.js";

/** Every request starts with an empty validated bag so req.validated is always an object. */
const initValidated: RequestHandler = (req, _res, next) => {
  req.validated = {};
  next();
};

/**
 * GET /uploads/:filename (docs/api.md section 3): only files whose name the
 * storage adapter could have generated are served, so nothing outside the
 * upload directory and no listing is ever reachable. Images are loaded by
 * the SPA from another origin, hence the relaxed resource policy on this
 * path only.
 */
const uploadsGuard: RequestHandler = (req, res, next) => {
  let name: string;
  try {
    name = decodeURIComponent(req.path.replace(/^\/+/, ""));
  } catch {
    return next(AppError.notFound("Image"));
  }
  if (!isSafeFilename(name)) return next(AppError.notFound("Image"));
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  return next();
};

const uploadsStatic = express.static(UPLOAD_ROOT, {
  dotfiles: "deny",
  index: false,
  redirect: false,
  extensions: false,
  fallthrough: true,
  setHeaders(res) {
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
  },
});

/**
 * Build the Express application. Kept separate from server.ts so tests can
 * mount it with supertest without opening a port.
 */
export function createApp(): Express {
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
  app.use(initValidated);
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));

  if (env.LOG_FORMAT !== "none" && !env.isTest) {
    app.use(morgan(env.LOG_FORMAT));
  }

  app.use("/uploads", globalLimiter, uploadsGuard, uploadsStatic);
  app.use("/api", globalLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
