/**
 * Error codes and their HTTP statuses (docs/04-api-contract.md section 1).
 * Every error leaving the API is an AppError; the error handler converts
 * everything else into one.
 */
export const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 400,
  NOTE_REQUIRED: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  INVALID_TRANSITION: 409,
  UPLOAD_TOO_LARGE: 413,
  UNSUPPORTED_FILE_TYPE: 415,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  ML_ERROR: 502,
  ML_UNAVAILABLE: 503,
});

export class AppError extends Error {
  /**
   * @param {keyof typeof ERROR_CODES} code
   * @param {string} message human-readable, safe to show to the user
   * @param {Array<object>} details machine-readable extras (field errors, transitions)
   */
  constructor(code, message, details = []) {
    super(message);
    if (!(code in ERROR_CODES)) {
      throw new Error(`Unknown error code: ${code}`);
    }
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_CODES[code];
    this.details = details;
  }

  toBody() {
    return {
      success: false,
      error: { code: this.code, message: this.message, details: this.details },
    };
  }

  static validation(details, message = "Request validation failed.") {
    return new AppError("VALIDATION_ERROR", message, details);
  }

  static notFound(what = "Resource") {
    return new AppError("NOT_FOUND", `${what} not found.`);
  }

  static unauthenticated(message = "Authentication required.") {
    return new AppError("UNAUTHENTICATED", message);
  }

  static forbidden(message = "You do not have permission to do this.") {
    return new AppError("FORBIDDEN", message);
  }
}

export function isAppError(err) {
  return err instanceof AppError;
}
