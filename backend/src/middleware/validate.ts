import { type Request, type RequestHandler } from "express";
import { type z, type ZodType } from "zod";
import { AppError, type FieldErrorDetail } from "../lib/errors.js";

/**
 * Validate body, query and params against zod schemas.
 *
 * Parsed values are stored on req.validated instead of being written back to
 * req.query: in Express 5 req.query is a getter, and keeping the parsed copy
 * separate makes it obvious in controllers which data has been checked.
 *
 *   const schemas = { params: objectIdParam, body: statusBody };
 *   router.patch("/:id/status", validate(schemas), controller.changeStatus);
 *   // controller: asyncHandler<ValidatedRequest<typeof schemas>>(async (req, res) => req.validated.body.status)
 */

export interface ValidationSchemas {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
}

const PARTS = ["params", "query", "body"] as const;
type Part = (typeof PARTS)[number];

/** The parsed output for each schema given (params/query/body). */
export type Validated<S extends ValidationSchemas> = {
  [K in Extract<keyof S, Part>]: S[K] extends ZodType ? z.output<S[K]> : never;
};

/** Request type for controllers mounted after validate(schemas). */
export type ValidatedRequest<S extends ValidationSchemas> = Request & { validated: Validated<S> };

export function validate<S extends ValidationSchemas>(schemas: S): RequestHandler {
  return (req, _res, next) => {
    const validated: Record<string, unknown> = { ...(req.validated ?? {}) };
    const details: FieldErrorDetail[] = [];

    for (const part of PARTS) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        validated[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({
            field: issue.path.length ? issue.path.map(String).join(".") : part,
            message: issue.message,
          });
        }
      }
    }

    if (details.length) {
      return next(AppError.validation(details));
    }
    req.validated = validated;
    return next();
  };
}
