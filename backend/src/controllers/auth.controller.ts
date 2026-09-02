import { type Request } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { AppError } from "../lib/errors.js";
import { type ValidatedRequest } from "../middleware/validate.js";
import { type UserDocument } from "../models/User.js";
import * as authService from "../services/auth.service.js";
import { type loginSchemas, type registerSchemas } from "../validation/auth.schema.js";

/**
 * /api/auth handlers (docs/api.md section 5). Controllers only translate
 * between HTTP and the services.
 */

/** The signed-in user. requireAuth guarantees it; this keeps the type honest for the other controllers. */
export function currentUser(req: Request): UserDocument {
  if (!req.user) throw AppError.unauthenticated();
  return req.user;
}

export const register = asyncHandler<ValidatedRequest<typeof registerSchemas>>(async (req, res) => {
  const data = await authService.register(req.validated.body);
  res.status(201).json({ success: true, data });
});

export const login = asyncHandler<ValidatedRequest<typeof loginSchemas>>(async (req, res) => {
  const data = await authService.login(req.validated.body);
  res.json({ success: true, data });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: currentUser(req).toProfile() });
});
