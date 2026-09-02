import { requestData } from "./client";
import { toSearchParams } from "./params";
import type {
  IncidentRiskEstimate,
  IncidentRiskParams,
  ModelInfo,
  RiskDistribution,
  RiskEstimate,
  RiskFeatures,
  RiskRefreshResult,
} from "@/types/api";

/** GET /api/ml/model-info (admin): dataset card, metrics, feature schema. Cached 10 min on the API. */
export function getModelInfo(): Promise<ModelInfo> {
  return requestData<ModelInfo>({ method: "GET", url: "/ml/model-info" });
}

/** POST /api/ml/estimate-risk (admin): estimate for typed feature values (all ten required). */
export function estimateRisk(features: RiskFeatures): Promise<RiskEstimate> {
  return requestData<RiskEstimate>({ method: "POST", url: "/ml/estimate-risk", data: { features } });
}

/**
 * GET /api/ml/incidents/:id/risk (admin): estimate derived from one incident.
 * Any feature may be overridden through `params`; `refresh: true` bypasses the stored estimate.
 */
export function getIncidentRisk(id: string, params: IncidentRiskParams = {}): Promise<IncidentRiskEstimate> {
  return requestData<IncidentRiskEstimate>({
    method: "GET",
    url: `/ml/incidents/${encodeURIComponent(id)}/risk`,
    params: toSearchParams({ ...params }),
  });
}

/** POST /api/ml/risk/refresh (admin): batch-estimate and store risk for stored incidents. */
export function refreshRisk(): Promise<RiskRefreshResult> {
  // Up to 5000 incidents are estimated and written back; allow more than the default 20 s.
  return requestData<RiskRefreshResult>({ method: "POST", url: "/ml/risk/refresh", timeout: 120_000 });
}

/** GET /api/ml/risk/distribution (admin): counts of stored estimates by level (no ML call). */
export function getRiskDistribution(): Promise<RiskDistribution> {
  return requestData<RiskDistribution>({ method: "GET", url: "/ml/risk/distribution" });
}
