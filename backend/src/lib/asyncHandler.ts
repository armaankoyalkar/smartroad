import { type NextFunction, type Request, type RequestHandler, type Response } from "express";

/**
 * Wrap an async controller so a rejected promise reaches the error handler.
 * Express 5 already forwards rejections from async handlers; the wrapper
 * exists so controllers can be typed against a narrower request (for example
 * `ValidatedRequest<typeof schemas>` from middleware/validate.ts) while the
 * router still receives a plain RequestHandler.
 *
 *   export const create = asyncHandler<ValidatedRequest<typeof createSchemas>>(async (req, res) => {
 *     const body = req.validated.body; // typed
 *   });
 */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown> | unknown,
): RequestHandler {
  return (req, res, next) => {
    // The narrowing from Request to Req is guaranteed by the middleware the
    // route mounts before this handler (validate, requireAuth); the wrapper
    // itself cannot check it at runtime.
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
}
