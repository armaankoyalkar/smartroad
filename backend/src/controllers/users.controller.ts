import { asyncHandler } from "../lib/asyncHandler.js";
import { type ValidatedRequest } from "../middleware/validate.js";
import * as userService from "../services/user.service.js";
import {
  type adminUpdateUserSchemas,
  type changePasswordSchemas,
  type listUsersSchemas,
  type updateProfileSchemas,
  type userIdSchemas,
} from "../validation/user.schema.js";
import { currentUser } from "./auth.controller.js";

/** /api/users handlers (docs/api.md section 5). */

export const updateMe = asyncHandler<ValidatedRequest<typeof updateProfileSchemas>>(async (req, res) => {
  const data = await userService.updateProfile(currentUser(req), req.validated.body);
  res.json({ success: true, data });
});

export const changePassword = asyncHandler<ValidatedRequest<typeof changePasswordSchemas>>(async (req, res) => {
  const data = await userService.changePassword(currentUser(req), req.validated.body);
  res.json({ success: true, data });
});

export const list = asyncHandler<ValidatedRequest<typeof listUsersSchemas>>(async (req, res) => {
  const { data, meta } = await userService.listUsers(req.validated.query);
  res.json({ success: true, data, meta });
});

export const get = asyncHandler<ValidatedRequest<typeof userIdSchemas>>(async (req, res) => {
  const data = await userService.getUser(req.validated.params.id);
  res.json({ success: true, data });
});

export const update = asyncHandler<ValidatedRequest<typeof adminUpdateUserSchemas>>(async (req, res) => {
  const data = await userService.adminUpdateUser(currentUser(req), req.validated.params.id, req.validated.body);
  res.json({ success: true, data });
});
