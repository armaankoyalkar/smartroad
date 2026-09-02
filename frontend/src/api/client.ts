/**
 * Axios instance for the SmartRoad API.
 *
 * - baseURL is `${VITE_API_URL}/api`.
 * - The request interceptor adds `Authorization: Bearer <token>` from localStorage.
 * - The response interceptor turns EVERY failure into an ApiError so callers never
 *   deal with raw axios errors. Network failures become code NETWORK_ERROR.
 * - A 401 on GET /auth/me (or any UNAUTHENTICATED answer) clears the stored token and
 *   dispatches AUTH_EVENT so AuthContext can drop the session.
 */
import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { config } from "@/config";
import type { ApiErrorBody, ApiErrorCode, ApiErrorDetail, ApiSuccess } from "@/types/api";

export const AUTH_EVENT = "smartroad:auth";
export type AuthEventDetail = { type: "unauthorized" };

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: ApiErrorDetail[];

  constructor(
    code: ApiErrorCode,
    message: string,
    options: { status?: number; details?: ApiErrorDetail[]; cause?: unknown } = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "ApiError";
    this.code = code;
    this.status = options.status ?? 0;
    this.details = options.details ?? [];
  }

  get isNetworkError(): boolean {
    return this.code === "NETWORK_ERROR";
  }
  get isUnauthenticated(): boolean {
    return this.code === "UNAUTHENTICATED";
  }
  get isNotFound(): boolean {
    return this.code === "NOT_FOUND";
  }
  get isValidation(): boolean {
    return this.code === "VALIDATION_ERROR";
  }
  get isMlUnavailable(): boolean {
    return this.code === "ML_UNAVAILABLE" || this.code === "ML_ERROR";
  }

  /** `details[]` entries with a field name, as `{ field: message }`. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details) {
      if (typeof d.field === "string" && typeof d.message === "string" && !(d.field in out)) {
        out[d.field] = d.message;
      }
    }
    return out;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** A user-facing message for any thrown value. */
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (isApiError(error)) return error.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** The only place that reads or writes the JWT. Guarded because storage can throw (private mode). */
export const tokenStore = {
  get(): string | null {
    try {
      return window.localStorage.getItem(config.tokenStorageKey);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      window.localStorage.setItem(config.tokenStorageKey, token);
    } catch {
      /* storage unavailable: the session lives in memory only */
    }
  },
  clear(): void {
    try {
      window.localStorage.removeItem(config.tokenStorageKey);
    } catch {
      /* nothing to clear */
    }
  },
};

function emitUnauthorized(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AuthEventDetail>(AUTH_EVENT, { detail: { type: "unauthorized" } }));
}

function isErrorBody(body: unknown): body is ApiErrorBody {
  if (!body || typeof body !== "object") return false;
  const b = body as { success?: unknown; error?: { code?: unknown; message?: unknown } };
  return (
    b.success === false &&
    !!b.error &&
    typeof b.error.code === "string" &&
    typeof b.error.message === "string"
  );
}

function isAuthMeRequest(cfg: InternalAxiosRequestConfig | AxiosRequestConfig | undefined): boolean {
  const url = cfg?.url ?? "";
  return /(^|\/)auth\/me\/?$/.test(url);
}

/** Convert anything thrown by axios into an ApiError. Exported for tests and manual callers. */
export function normalizeError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (axios.isAxiosError(error)) {
    const response = error.response;
    if (!response) {
      const timedOut = error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
      return new ApiError(
        "NETWORK_ERROR",
        timedOut
          ? "The server took too long to answer. Please try again."
          : "Cannot reach the SmartRoad server. Check your connection and try again.",
        { status: 0, cause: error },
      );
    }

    const status = response.status;
    const body: unknown = response.data;
    if (isErrorBody(body)) {
      const apiError = new ApiError(body.error.code, body.error.message, {
        status,
        details: body.error.details ?? [],
        cause: error,
      });
      if ((status === 401 && isAuthMeRequest(error.config)) || apiError.isUnauthenticated) {
        tokenStore.clear();
        emitUnauthorized();
      }
      return apiError;
    }

    if (status === 401) {
      // Non-envelope 401 (for example from a proxy): treat as an expired session.
      if (isAuthMeRequest(error.config)) {
        tokenStore.clear();
        emitUnauthorized();
      }
      return new ApiError("UNAUTHENTICATED", "Your session has expired. Please sign in again.", {
        status,
        cause: error,
      });
    }

    return new ApiError("UNKNOWN_ERROR", `Unexpected response from the server (HTTP ${status}).`, {
      status,
      cause: error,
    });
  }

  return new ApiError("UNKNOWN_ERROR", error instanceof Error ? error.message : "Something went wrong.", {
    cause: error,
  });
}

export function createApiClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: `${config.apiUrl}/api`,
    timeout: 20_000,
    headers: { Accept: "application/json" },
  });

  instance.interceptors.request.use((cfg) => {
    const token = tokenStore.get();
    if (token) cfg.headers.set("Authorization", `Bearer ${token}`);
    return cfg;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(normalizeError(error)),
  );

  return instance;
}

export const api = createApiClient();

/** Perform a request and return the success envelope (`{ success, data, meta }`). */
export async function request<T, M = undefined>(cfg: AxiosRequestConfig): Promise<ApiSuccess<T, M>> {
  const response = await api.request<ApiSuccess<T, M>>(cfg);
  return response.data;
}

/** Perform a request and return only `data`. */
export async function requestData<T>(cfg: AxiosRequestConfig): Promise<T> {
  const envelope = await request<T>(cfg);
  return envelope.data;
}

/** Perform a request and return `{ data, meta }` with `meta` typed and required. */
export async function requestWithMeta<T, M>(cfg: AxiosRequestConfig): Promise<{ data: T; meta: M }> {
  const envelope = await request<T, M>(cfg);
  return { data: envelope.data, meta: envelope.meta as M };
}
