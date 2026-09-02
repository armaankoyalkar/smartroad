import axios from "axios";
import { env } from "../config/env.js";
import { AppError } from "./errors.js";

/**
 * HTTP client for the Python ML service. The browser never talks to that
 * service; everything goes through here with the shared API key.
 *
 * Phase 2 only needs health(). estimateRisk(), modelInfo() and hotspots()
 * are added in Phases 8 and 9 on top of request().
 */
const http = axios.create({
  baseURL: env.ML_SERVICE_URL,
  timeout: env.ML_TIMEOUT_MS,
  headers: env.ML_SERVICE_API_KEY ? { "X-API-Key": env.ML_SERVICE_API_KEY } : {},
});

/**
 * Perform a request and translate failures into API errors:
 * - no response (connection refused, DNS, timeout) -> ML_UNAVAILABLE (503)
 * - an HTTP error from the service -> ML_ERROR (502)
 */
export async function request(config) {
  try {
    const response = await http.request(config);
    return response.data;
  } catch (err) {
    if (err.response) {
      throw new AppError("ML_ERROR", "The ML service returned an error.", [
        { status: err.response.status, detail: summarise(err.response.data) },
      ]);
    }
    throw new AppError(
      "ML_UNAVAILABLE",
      "The ML service is not reachable. Reporting and management continue to work.",
    );
  }
}

/** Never throws: used by GET /api/health. Capped at two seconds so a slow ML host cannot stall health checks. */
export async function health() {
  const started = Date.now();
  try {
    const data = await request({ method: "get", url: "/health", timeout: Math.min(env.ML_TIMEOUT_MS, 2000) });
    return {
      status: "up",
      latencyMs: Date.now() - started,
      modelLoaded: Boolean(data?.model_loaded),
      modelVersion: data?.model_version ?? null,
      error: null,
    };
  } catch (err) {
    return {
      status: "down",
      latencyMs: Date.now() - started,
      modelLoaded: false,
      modelVersion: null,
      error: err.code ?? "ML_UNAVAILABLE",
    };
  }
}

function summarise(data) {
  if (data == null) return null;
  if (typeof data === "string") return data.slice(0, 200);
  try {
    return JSON.stringify(data).slice(0, 200);
  } catch {
    return null;
  }
}
