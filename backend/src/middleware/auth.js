import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import { User } from "../models/User.js";

/** Sign an access token for a user. Payload: subject (user id) and role. */
export function signToken(user) {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: String(user._id ?? user.id),
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

function extractBearer(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  if (!/^Bearer$/i.test(scheme) || !token) return null;
  return token.trim();
}

async function resolveUser(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch (err) {
    const message = err.name === "TokenExpiredError" ? "Session expired. Please sign in again." : "Invalid token.";
    throw AppError.unauthenticated(message);
  }
  if (!payload?.sub) throw AppError.unauthenticated("Invalid token.");
  // Loading the user on every request costs one primary-key lookup and makes
  // deactivation and role changes take effect immediately (docs/02 section 8).
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw AppError.unauthenticated("This account is not active.");
  }
  return user;
}

/** Reject requests without a valid token. Sets req.user. */
export async function requireAuth(req, res, next) {
  const token = extractBearer(req);
  if (!token) return next(AppError.unauthenticated());
  try {
    req.user = await resolveUser(token);
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Attach req.user when a valid token is present, continue anonymously when
 * there is none. An invalid or expired token is still an error, so a stale
 * session is never silently downgraded to anonymous access.
 */
export async function optionalAuth(req, res, next) {
  const token = extractBearer(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = await resolveUser(token);
    return next();
  } catch (err) {
    return next(err);
  }
}
