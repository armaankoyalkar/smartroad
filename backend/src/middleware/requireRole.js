import { AppError } from "../lib/errors.js";

/**
 * Allow only the given roles. Must run after requireAuth.
 * Usage: router.delete("/:id", requireAuth, requireRole("admin"), controller.remove)
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(AppError.unauthenticated());
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden("This action requires an administrator account."));
    }
    return next();
  };
}
