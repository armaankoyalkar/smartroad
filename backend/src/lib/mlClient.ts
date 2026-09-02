import axios, { type AxiosRequestConfig } from "axios";
import { env } from "../config/env.js";
import { type RiskLevel } from "../config/enums.js";
import { type RiskFeatures } from "../config/mlFeatures.js";
import { AppError } from "./errors.js";

/**
 * HTTP client for the Python ML service (docs/api.md section 10). The
 * browser never talks to that service; everything goes through here with
 * the shared API key. Responses are returned in the service's snake_case;
 * the ML routes convert them with lib/case.ts and validate their shape.
 */

export interface MlHealthResponse {
  status: string;
  model_loaded: boolean;
  model_version: string | null;
  is_demo_model: boolean;
}

export interface MlContribution {
  feature: string;
  value: string | number;
  effect: number;
}

export interface MlEstimateResponse {
  risk_level: RiskLevel;
  probabilities: Record<RiskLevel, number>;
  model_version: string;
  is_demo_model: boolean;
  contributions: MlContribution[];
  disclaimer: string;
}

export interface MlBatchItem {
  id: string;
  features: RiskFeatures;
}

export interface MlBatchResponse {
  model_version: string;
  is_demo_model: boolean;
  results: Array<{ id: string; risk_level: RiskLevel; probabilities: Record<RiskLevel, number> }>;
}

export interface MlHotspotPoint {
  id: string;
  lat: number;
  lng: number;
}

export interface MlHotspotsResponse {
  clusters: Array<{
    id: number;
    centroid: { lat: number; lng: number };
    radius_m: number;
    count: number;
    member_ids: string[];
  }>;
  noise_ids: string[];
  params: { eps_m: number; min_samples: number; algorithm: string };
  total_points: number;
}

/** /model/info in snake_case; the ML routes camelize and validate it. */
export type MlModelInfoResponse = Record<string, unknown>;

export interface MlHealthCheck {
  status: "up" | "down";
  latencyMs: number;
  modelLoaded: boolean;
  modelVersion: string | null;
  error: string | null;
}

export const ML_MAX_BATCH_ITEMS = 5000;
export const ML_MAX_HOTSPOT_POINTS = 20000;

const http = axios.create({
  baseURL: env.ML_SERVICE_URL,
  timeout: env.ML_TIMEOUT_MS,
  headers: env.ML_SERVICE_API_KEY ? { "X-API-Key": env.ML_SERVICE_API_KEY } : {},
});

/**
 * Perform a request and translate failures into API errors:
 * - no response (connection refused, DNS, timeout) -> ML_UNAVAILABLE (503)
 * - an HTTP error from the service (4xx/5xx, including 422) -> ML_ERROR (502)
 * The body is returned as-is (typed by the caller, validated by the caller).
 */
export async function request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await http.request<T>(config);
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
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
export async function health(): Promise<MlHealthCheck> {
  const started = Date.now();
  try {
    const data = await request<Partial<MlHealthResponse>>({
      method: "get",
      url: "/health",
      timeout: Math.min(env.ML_TIMEOUT_MS, 2000),
    });
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
      error: err instanceof AppError ? err.code : "ML_UNAVAILABLE",
    };
  }
}

/** GET /model/info (snake_case). Cache and camelize in the route. */
export function modelInfo(): Promise<MlModelInfoResponse> {
  return request<MlModelInfoResponse>({ method: "get", url: "/model/info" });
}

/** POST /estimate/risk for one feature vector. */
export function estimateRisk(features: RiskFeatures): Promise<MlEstimateResponse> {
  return request<MlEstimateResponse>({ method: "post", url: "/estimate/risk", data: { features } });
}

/** POST /estimate/risk/batch (max 5000 items). Uses twice the normal timeout. */
export function estimateRiskBatch(items: MlBatchItem[]): Promise<MlBatchResponse> {
  if (items.length > ML_MAX_BATCH_ITEMS) {
    throw new RangeError(`estimateRiskBatch accepts at most ${ML_MAX_BATCH_ITEMS} items`);
  }
  return request<MlBatchResponse>({
    method: "post",
    url: "/estimate/risk/batch",
    data: { items },
    timeout: env.ML_TIMEOUT_MS * 2,
  });
}

/** POST /hotspots: DBSCAN over points (max 20000). Uses twice the normal timeout. */
export function hotspots(points: MlHotspotPoint[], epsM: number, minSamples: number): Promise<MlHotspotsResponse> {
  if (points.length > ML_MAX_HOTSPOT_POINTS) {
    throw new RangeError(`hotspots accepts at most ${ML_MAX_HOTSPOT_POINTS} points`);
  }
  return request<MlHotspotsResponse>({
    method: "post",
    url: "/hotspots",
    data: { points, eps_m: epsM, min_samples: minSamples },
    timeout: env.ML_TIMEOUT_MS * 2,
  });
}

function summarise(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string") return data.slice(0, 200);
  try {
    return JSON.stringify(data).slice(0, 200);
  } catch {
    return null;
  }
}
