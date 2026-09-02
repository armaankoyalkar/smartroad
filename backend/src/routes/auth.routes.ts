import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { loginSchemas, registerSchemas } from "../validation/auth.schema.js";

/** /api/auth (docs/api.md section 5): register, login, me. */
export const authRouter: Router = Router();

authRouter.post("/register", authLimiter, validate(registerSchemas), auth.register);
authRouter.post("/login", authLimiter, validate(loginSchemas), auth.login);
authRouter.get("/me", requireAuth, auth.me);
