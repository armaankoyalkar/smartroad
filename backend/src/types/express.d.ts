import type { UserDocument } from "../models/User.js";

/**
 * Request fields added by SmartRoad middleware:
 * - `user`: set by requireAuth / optionalAuth (null when anonymous).
 * - `validated`: parsed values from validate(); app.ts initialises it to {}
 *   on every request so it is always an object. Use ValidatedRequest<S>
 *   (middleware/validate.ts) in controllers to get typed members.
 * - `file`: added by multer (@types/multer) for the upload middleware.
 */
declare global {
  namespace Express {
    interface Request {
      user?: UserDocument | null;
      validated: { params?: unknown; query?: unknown; body?: unknown };
    }
  }
}

export {};
