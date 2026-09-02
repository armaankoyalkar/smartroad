import { type RequestHandler } from "express";
import { fileTypeFromBuffer } from "file-type";
import multer from "multer";
import { isUploadMimeType, UPLOAD_MIME_TYPES, type UploadMimeType } from "../config/enums.js";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";

/**
 * Optional single image upload on the `image` multipart field
 * (docs/api.md section 6.2). The file stays in memory; the incident service
 * hands the buffer to lib/storage.ts once the rest of the request is valid,
 * so a rejected request never leaves a file on disk.
 *
 * - bigger than MAX_UPLOAD_MB      -> 413 UPLOAD_TOO_LARGE
 * - not JPEG/PNG/WebP by magic bytes -> 415 UNSUPPORTED_FILE_TYPE
 * - a second file, or a file on another field -> 400 VALIDATION_ERROR
 * - a plain text field called `image` is ignored (req.file stays undefined)
 * - JSON bodies pass straight through (multer only acts on multipart)
 */

export const UPLOAD_FIELD = "image";

/** Set on req.file by the magic-byte check; use it instead of the client-declared mimetype. */
export interface VerifiedFile extends Express.Multer.File {
  detectedMimeType: UploadMimeType;
}

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1, fields: 50, fieldSize: 64 * 1024 },
}).single(UPLOAD_FIELD);

function translate(err: unknown): AppError {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return new AppError("UPLOAD_TOO_LARGE", `The image must be at most ${env.MAX_UPLOAD_MB} MB.`);
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE" || err.code === "LIMIT_FILE_COUNT") {
      return AppError.validation([{ field: err.field ?? UPLOAD_FIELD, message: "Only one image file is accepted." }]);
    }
    return AppError.validation([{ field: err.field ?? UPLOAD_FIELD, message: err.message }]);
  }
  if (err instanceof AppError) return err;
  return AppError.validation([{ field: UPLOAD_FIELD, message: "Malformed multipart body." }]);
}

const parse: RequestHandler = (req, res, next) => {
  parser(req, res, (err: unknown) => {
    if (err) return next(translate(err));
    return next();
  });
};

const verifyImage: RequestHandler = async (req, _res, next) => {
  const file = req.file;
  if (!file) return next();
  try {
    if (!file.buffer || file.size === 0) {
      return next(AppError.validation([{ field: UPLOAD_FIELD, message: "The uploaded file is empty." }]));
    }
    const detected = await fileTypeFromBuffer(file.buffer);
    if (!detected || !isUploadMimeType(detected.mime)) {
      return next(
        new AppError("UNSUPPORTED_FILE_TYPE", `Images must be one of ${UPLOAD_MIME_TYPES.join(", ")}.`, [
          { field: UPLOAD_FIELD, detected: detected?.mime ?? null },
        ]),
      );
    }
    (file as VerifiedFile).detectedMimeType = detected.mime;
    return next();
  } catch (err) {
    return next(err);
  }
};

/** Mount on routes that accept an image: `router.post("/", requireAuth, uploadImage, validate(...), create)`. */
export const uploadImage: RequestHandler[] = [parse, verifyImage];

/** Type guard for controllers: the file has passed the magic-byte check. */
export function verifiedFile(req: { file?: Express.Multer.File }): VerifiedFile | null {
  const file = req.file as VerifiedFile | undefined;
  return file && file.detectedMimeType ? file : null;
}
