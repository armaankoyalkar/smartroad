import { type ErrorRequestHandler, type RequestHandler } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { env } from "../config/env.js";
import { AppError, isAppError } from "../lib/errors.js";

/** Last route: anything not matched above is a 404 in the standard envelope. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError("NOT_FOUND", `No route for ${req.method} ${req.originalUrl}.`));
};

/**
 * Convert whatever reached the end of the chain into the error envelope
 * (docs/api.md section 1). Known errors keep their code and status; anything
 * unexpected is logged with its stack and reported as INTERNAL_ERROR without
 * details, so nothing internal leaks.
 */
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  const appError = toAppError(err);
  if (appError.status >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  }
  res.status(appError.status).json(appError.toBody());
};

interface BodyParserError {
  type?: string;
}

interface MongoServerErrorLike {
  code?: number;
  keyPattern?: Record<string, unknown>;
}

function hasProp<K extends string>(value: unknown, key: K): value is Record<K, unknown> {
  return typeof value === "object" && value !== null && key in value;
}

export function toAppError(err: unknown): AppError {
  if (isAppError(err)) return err;

  // Body parser problems (express.json)
  if (hasProp(err, "type")) {
    const type = (err as BodyParserError).type;
    if (type === "entity.parse.failed") {
      return AppError.validation([{ field: "body", message: "Malformed JSON body." }]);
    }
    if (type === "entity.too.large") {
      return new AppError("UPLOAD_TOO_LARGE", "Request body is too large.");
    }
  }

  // multer (the upload middleware maps these too; this is the safety net)
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return new AppError("UPLOAD_TOO_LARGE", `The image must be at most ${env.MAX_UPLOAD_MB} MB.`);
    }
    return AppError.validation([{ field: err.field ?? "image", message: err.message }]);
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
  if (hasProp(err, "code") && (err as MongoServerErrorLike).code === 11000) {
    const field = Object.keys((err as MongoServerErrorLike).keyPattern ?? {})[0] ?? "field";
    if (field === "email") {
      return new AppError("EMAIL_TAKEN", "An account with this email already exists.");
    }
    return AppError.validation([{ field, message: `${field} must be unique.` }]);
  }

  const fallback = err instanceof Error ? err.message : "Unknown error";
  const message = env.isProduction ? "Something went wrong on our side." : fallback;
  return new AppError("INTERNAL_ERROR", message);
}
