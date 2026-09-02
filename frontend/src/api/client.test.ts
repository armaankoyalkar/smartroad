import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "@/config";
import {
  api,
  ApiError,
  AUTH_EVENT,
  getErrorMessage,
  normalizeError,
  requestData,
  requestWithMeta,
  tokenStore,
} from "./client";

type Reply = { status: number; data?: unknown } | { network: "ERR_NETWORK" | "ECONNABORTED" };
type Handler = (cfg: InternalAxiosRequestConfig) => Reply;

/** Fake adapter: no HTTP, but the same AxiosError shapes the real adapters produce. */
function useAdapter(handler: Handler) {
  const adapter: AxiosAdapter = async (cfg) => {
    const reply = handler(cfg);
    if ("network" in reply) {
      throw new AxiosError(
        reply.network === "ECONNABORTED" ? "timeout exceeded" : "Network Error",
        reply.network,
        cfg,
      );
    }
    const response: AxiosResponse = {
      status: reply.status,
      statusText: "",
      headers: {},
      config: cfg,
      data: reply.data,
    };
    if (reply.status >= 400) {
      throw new AxiosError(
        `Request failed with status code ${reply.status}`,
        "ERR_BAD_REQUEST",
        cfg,
        null,
        response,
      );
    }
    return response;
  };
  api.defaults.adapter = adapter;
}

const originalAdapter = api.defaults.adapter;

describe("api client", () => {
  beforeEach(() => {
    tokenStore.clear();
  });
  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it("uses VITE_API_URL + /api as base URL", () => {
    expect(api.defaults.baseURL).toBe(`${config.apiUrl}/api`);
  });

  it("unwraps the success envelope and sends the bearer token", async () => {
    tokenStore.set("jwt-123");
    let seenAuth: string | undefined;
    useAdapter((cfg) => {
      seenAuth = cfg.headers.get("Authorization") as string | undefined;
      return { status: 200, data: { success: true, data: { id: "u1" }, meta: { page: 1 } } };
    });
    await expect(requestData<{ id: string }>({ method: "GET", url: "/auth/me" })).resolves.toEqual({
      id: "u1",
    });
    expect(seenAuth).toBe("Bearer jwt-123");
    const withMeta = await requestWithMeta<{ id: string }, { page: number }>({ method: "GET", url: "/x" });
    expect(withMeta.meta).toEqual({ page: 1 });
  });

  it("sends no Authorization header without a token", async () => {
    let seenAuth: unknown = "unset";
    useAdapter((cfg) => {
      seenAuth = cfg.headers.get("Authorization");
      return { status: 200, data: { success: true, data: null } };
    });
    await requestData({ method: "GET", url: "/meta/enums" });
    expect(seenAuth).toBeFalsy();
  });

  it("turns an error envelope into an ApiError with code, status and details", async () => {
    useAdapter(() => ({
      status: 400,
      data: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed.",
          details: [{ field: "latitude", message: "Must be between -90 and 90" }],
        },
      },
    }));
    const error = await requestData({ method: "POST", url: "/incidents" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("VALIDATION_ERROR");
    expect(apiError.status).toBe(400);
    expect(apiError.isValidation).toBe(true);
    expect(apiError.fieldErrors()).toEqual({ latitude: "Must be between -90 and 90" });
    expect(getErrorMessage(apiError)).toBe("Request validation failed.");
  });

  it("maps network failures and timeouts to NETWORK_ERROR with a friendly message", async () => {
    useAdapter(() => ({ network: "ERR_NETWORK" }));
    const offline = (await requestData({ method: "GET", url: "/health" }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(offline.code).toBe("NETWORK_ERROR");
    expect(offline.status).toBe(0);
    expect(offline.isNetworkError).toBe(true);
    expect(offline.message).toMatch(/cannot reach/i);

    useAdapter(() => ({ network: "ECONNABORTED" }));
    const slow = (await requestData({ method: "GET", url: "/health" }).catch((e: unknown) => e)) as ApiError;
    expect(slow.code).toBe("NETWORK_ERROR");
    expect(slow.message).toMatch(/too long/i);
  });

  it("clears the token and announces it on 401 from /auth/me", async () => {
    tokenStore.set("expired");
    const listener = vi.fn();
    window.addEventListener(AUTH_EVENT, listener);
    useAdapter(() => ({
      status: 401,
      data: { success: false, error: { code: "UNAUTHENTICATED", message: "Token expired." } },
    }));
    const error = (await requestData({ method: "GET", url: "/auth/me" }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(error.code).toBe("UNAUTHENTICATED");
    expect(tokenStore.get()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTH_EVENT, listener);
  });

  it("keeps the token on a 401 INVALID_CREDENTIALS from login", async () => {
    tokenStore.set("still-valid");
    const listener = vi.fn();
    window.addEventListener(AUTH_EVENT, listener);
    useAdapter(() => ({
      status: 401,
      data: { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } },
    }));
    const error = (await requestData({ method: "POST", url: "/auth/login" }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(error.code).toBe("INVALID_CREDENTIALS");
    expect(tokenStore.get()).toBe("still-valid");
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(AUTH_EVENT, listener);
  });

  it("wraps non-envelope responses as UNKNOWN_ERROR with the HTTP status", async () => {
    useAdapter(() => ({ status: 502, data: "<html>Bad gateway</html>" }));
    const error = (await requestData({ method: "GET", url: "/health" }).catch((e: unknown) => e)) as ApiError;
    expect(error.code).toBe("UNKNOWN_ERROR");
    expect(error.status).toBe(502);
  });

  it("normalizeError passes ApiErrors through and wraps other values", () => {
    const original = new ApiError("NOT_FOUND", "Gone", { status: 404 });
    expect(normalizeError(original)).toBe(original);
    const wrapped = normalizeError(new Error("boom"));
    expect(wrapped.code).toBe("UNKNOWN_ERROR");
    expect(wrapped.message).toBe("boom");
    expect(getErrorMessage("nonsense", "fallback")).toBe("fallback");
  });
});
