import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";

const minutes = (n) => n * 60 * 1000;

function limited(req, res, next) {
  next(new AppError("RATE_LIMITED", "Too many requests. Please wait a while and try again."));
}

const common = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: limited,
};

/** Loose limit for the whole API, per client address. */
export const globalLimiter = rateLimit({
  ...common,
  windowMs: minutes(env.RATE_LIMIT_GLOBAL_WINDOW_MIN),
  limit: env.RATE_LIMIT_GLOBAL_MAX,
});

/** Tight limit for login and registration only (docs/04 section 1). */
export const authLimiter = rateLimit({
  ...common,
  windowMs: minutes(env.RATE_LIMIT_AUTH_WINDOW_MIN),
  limit: env.RATE_LIMIT_AUTH_MAX,
});

/**
 * Per-user limit on incident creation. Runs after requireAuth so the key is
 * the user id; falls back to the address if somehow reached anonymously.
 */
export const reportLimiter = rateLimit({
  ...common,
  windowMs: minutes(60),
  limit: env.RATE_LIMIT_REPORTS_PER_HOUR,
  keyGenerator: (req) => (req.user ? `user:${req.user.id}` : ipKeyGenerator(req.ip)),
});
