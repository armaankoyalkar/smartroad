import { AppError } from "../lib/errors.js";

/**
 * Validate body, query and params against zod schemas.
 *
 * Parsed values are stored on req.validated instead of being written back to
 * req.query: in Express 5 req.query is a getter, and keeping the parsed copy
 * separate makes it obvious in controllers which data has been checked.
 *
 * Usage: router.post("/", validate({ body: createSchema }), controller.create)
 */
export function validate(schemas) {
  return (req, res, next) => {
    const validated = req.validated ?? {};
    const details = [];

    for (const part of ["params", "query", "body"]) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        validated[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({
            field: issue.path.length ? issue.path.join(".") : part,
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
