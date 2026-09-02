import { Router } from "express";
import * as users from "../controllers/users.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import {
  adminUpdateUserSchemas,
  changePasswordSchemas,
  listUsersSchemas,
  updateProfileSchemas,
  userIdSchemas,
} from "../validation/user.schema.js";

/** /api/users (docs/api.md section 5): own profile and password, then admin user management. */
export const usersRouter: Router = Router();

// "/me" routes come first so "me" is never read as a user id.
usersRouter.patch("/me", requireAuth, validate(updateProfileSchemas), users.updateMe);
usersRouter.patch("/me/password", requireAuth, validate(changePasswordSchemas), users.changePassword);

usersRouter.get("/", requireAuth, requireAdmin, validate(listUsersSchemas), users.list);
usersRouter.get("/:id", requireAuth, requireAdmin, validate(userIdSchemas), users.get);
usersRouter.patch("/:id", requireAuth, requireAdmin, validate(adminUpdateUserSchemas), users.update);
