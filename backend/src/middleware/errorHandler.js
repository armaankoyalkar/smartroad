import mongoose from "mongoose";
import { env } from "../config/env.js";
import { AppError, isAppError } from "../lib/errors.js";

/** Last route: anything not matched above is a 404 in the standard envelope. */
export function notFoundHandler(req, res, next) {
  next(new AppError("NOT_FOUND", `No route for ${req.method} ${req.originalUrl}.`));
}

/**
 * Convert whatever reached the end of the chain into the error envelope
 * (docs/04 section 1). Known errors keep their code and status; anything
 * unexpected is logged with its stack and reported as INTERNAL_ERROR without
 * details, so nothing internal leaks.
 */
export function errorHandler(err, req, res, next) {
  const appError = toAppError(err);
  if (appError.status >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  }
  res.status(appError.status).json(appError.toBody());
}

export function toAppError(err) {
  if (isAppError(err)) return err;

  // Body parser problems (express.json)
  if (err?.type === "entity.parse.failed") {
    return AppError.validation([{ field: "body", message: "Malformed JSON body." }]);
  }
  if (err?.type === "entity.too.large") {
    return new AppError("UPLOAD_TOO_LARGE", "Request body is too large.");
  }

  // Mongoose validation on save()
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return AppError.validation(details);
  }
  if (err instanceof mongoose.Error.CastError) {
    return AppError.validation([{ field: err.path, message: `Invalid value for ${err.path}.` }]);
  }

  // MongoDB duplicate key (unique index)
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? "field";
    if (field === "email") {
      return new AppError("EMAIL_TAKEN", "An account with this email already exists.");
    }
    return AppError.validation([{ field, message: `${field} must be unique.` }]);
  }

  const message = env.isProduction ? "Something went wrong on our side." : (err?.message ?? "Unknown error");
  return new AppError("INTERNAL_ERROR", message);
}
