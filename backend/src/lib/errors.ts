/**
 * Error codes and their HTTP statuses (docs/api.md section 1).
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
} as const);

export type ErrorCode = keyof typeof ERROR_CODES;

/** Machine-readable extras: field errors, transition info, ML status. */
export type ErrorDetail = Record<string, unknown>;

export interface FieldErrorDetail extends ErrorDetail {
  field: string;
  message: string;
}

export interface ErrorBody {
  success: false;
  error: { code: ErrorCode; message: string; details: ErrorDetail[] };
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: ErrorDetail[];

  /**
   * @param code one of ERROR_CODES
   * @param message human-readable, safe to show to the user
   * @param details machine-readable extras (field errors, transitions)
   */
  constructor(code: ErrorCode, message: string, details: ErrorDetail[] = []) {
    super(message);
    if (!(code in ERROR_CODES)) {
      throw new Error(`Unknown error code: ${String(code)}`);
    }
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_CODES[code];
    this.details = details;
  }

  toBody(): ErrorBody {
    return {
      success: false,
      error: { code: this.code, message: this.message, details: this.details },
    };
  }

  static validation(details: FieldErrorDetail[], message = "Request validation failed."): AppError {
    return new AppError("VALIDATION_ERROR", message, details);
  }

  static notFound(what = "Resource"): AppError {
    return new AppError("NOT_FOUND", `${what} not found.`);
  }

  static unauthenticated(message = "Authentication required."): AppError {
    return new AppError("UNAUTHENTICATED", message);
  }

  static forbidden(message = "You do not have permission to do this."): AppError {
    return new AppError("FORBIDDEN", message);
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
