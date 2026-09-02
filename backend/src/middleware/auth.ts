import { type RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { type Types } from "mongoose";
import { type Role } from "../config/enums.js";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import { User } from "../models/User.js";

export interface TokenSubject {
  _id?: Types.ObjectId | string;
  id?: string;
  role: Role;
}

/** Sign an access token for a user. Payload: subject (user id) and role (docs/api.md section 5). */
export function signToken(user: TokenSubject): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: String(user._id ?? user.id),
    // Validated by env.ts against jsonwebtoken's "24h" / "7d" / "3600" forms.
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

function extractBearer(authorization: unknown): string | null {
  if (!authorization || typeof authorization !== "string") return null;
  const [scheme, token] = authorization.split(" ");
  if (!scheme || !/^Bearer$/i.test(scheme) || !token) return null;
  return token.trim();
}

async function resolveUser(token: string) {
  let payload: jwt.JwtPayload | string;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch (err) {
    const message =
      err instanceof jwt.TokenExpiredError ? "Session expired. Please sign in again." : "Invalid token.";
    throw AppError.unauthenticated(message);
  }
  if (typeof payload === "string" || !payload.sub) throw AppError.unauthenticated("Invalid token.");
  // Loading the user on every request costs one primary-key lookup and makes
  // deactivation and role changes take effect immediately.
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw AppError.unauthenticated("This account is not active.");
  }
  return user;
}

/** Reject requests without a valid token. Sets req.user. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = extractBearer(req.headers.authorization);
  if (!token) return next(AppError.unauthenticated());
  try {
    req.user = await resolveUser(token);
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * Attach req.user when a valid token is present, continue anonymously when
 * there is none. An invalid or expired token is still an error, so a stale
 * session is never silently downgraded to anonymous access.
 */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const token = extractBearer(req.headers.authorization);
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
};
