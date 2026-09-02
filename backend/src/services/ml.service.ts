import { Types } from "mongoose";
import { type ZodError, type ZodType } from "zod";
import { type CategoryKey } from "../config/categories.js";
import { RISK_LEVELS, type RiskLevel } from "../config/enums.js";
import { env } from "../config/env.js";
import { type RiskFeatureName, type RiskFeatures } from "../config/mlFeatures.js";
import { cache, type CacheResult } from "../lib/cache.js";
import { camelizeKeys } from "../lib/case.js";
import { AppError } from "../lib/errors.js";
import * as mlClient from "../lib/mlClient.js";
import { Incident, type RiskEstimate } from "../models/Incident.js";
import {
  mlBatchResponseSchema,
  mlEstimateResponseSchema,
  modelInfoSchema,
  type ModelInfo,
} from "../validation/ml.schema.js";
import { deriveIncidentFeatures, hasOverrides, type FeatureOverrides } from "./riskFeatures.service.js";

/**
 * ML proxy (docs/api.md section 9). The browser never reaches the ML
 * service; these functions call lib/mlClient, validate what comes back,
 * convert it to camelCase and store per-incident estimates.
 */

export const MODEL_INFO_CACHE_KEY = "ml:model-info";
export const MODEL_INFO_TTL_MS = 10 * 60 * 1000;
/** Same sentence the ML service ships; used only when no service answer is available. */
export const DEFAULT_DISCLAIMER =
  "Estimate from historical data; not a prediction that an incident will occur.";
export const REFRESH_CHUNK_SIZE = 500;
export const REFRESH_CAP = mlClient.ML_MAX_BATCH_ITEMS;

function issueSummary(error: ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

/** Validate an ML service body; a malformed one is ML_ERROR 502 (docs/api.md section 1). */
export function parseMlBody<T>(schema: ZodType<T>, body: unknown, what: string): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError("ML_ERROR", `The ML service returned a malformed ${what} response.`, [
      { detail: issueSummary(result.error) },
    ]);
  }
  return result.data;
}

// --- GET /api/ml/model-info --------------------------------------------------

/** Cached for ten minutes; a failure while the cache is empty is reported, never papered over. */
export function getModelInfo(): Promise<CacheResult<ModelInfo>> {
  return cache.getOrSet(MODEL_INFO_CACHE_KEY, MODEL_INFO_TTL_MS, async () =>
    parseMlBody(modelInfoSchema, camelizeKeys(await mlClient.modelInfo()), "model information"),
  );
}

/** The cached model info if a recent fetch succeeded; never calls the service. */
export function cachedModelInfo(): ModelInfo | undefined {
  return cache.get<ModelInfo>(MODEL_INFO_CACHE_KEY);
}

// --- POST /api/ml/estimate-risk ---------------------------------------------

export interface RiskContribution {
  feature: string;
  value: string | number;
  effect: number;
}

export interface RiskEstimateData {
  riskLevel: RiskLevel;
  probabilities: Record<RiskLevel, number>;
  modelVersion: string;
  isDemoModel: boolean | null;
  contributions: RiskContribution[];
  disclaimer: string;
}

export async function estimateRisk(features: RiskFeatures): Promise<RiskEstimateData> {
  const body = parseMlBody(mlEstimateResponseSchema, await mlClient.estimateRisk(features), "risk estimate");
  return {
    riskLevel: body.risk_level,
    probabilities: body.probabilities,
    modelVersion: body.model_version,
    isDemoModel: body.is_demo_model,
    contributions: body.contributions,
    disclaimer: body.disclaimer,
  };
}

// --- GET /api/ml/incidents/:id/risk -------------------------------------------

export interface IncidentRiskOptions {
  overrides: FeatureOverrides;
  refresh: boolean;
}

export interface IncidentRiskData extends RiskEstimateData {
  features: RiskFeatures;
  assumedFeatures: RiskFeatureName[];
  /** When the estimate was computed (stored or fresh). */
  estimatedAt: string;
  /** True when the returned estimate is the one stored on the incident. */
  stored: boolean;
}

interface RiskIncidentSource {
  _id: Types.ObjectId;
  createdAt: Date;
  category: CategoryKey;
  riskEstimate: RiskEstimate | null;
}

/**
 * Estimate from the incident's derived features. Without overrides and
 * without `refresh`, a stored estimate is returned as it is (no ML call;
 * contributions are not stored, so that list is empty). A fresh estimate is
 * stored on the incident only when no overrides were given.
 */
export async function estimateIncidentRisk(
  id: string,
  { overrides, refresh }: IncidentRiskOptions,
): Promise<IncidentRiskData> {
  const incident = await Incident.findById(id, {
    createdAt: 1,
    category: 1,
    riskEstimate: 1,
  }).lean<RiskIncidentSource | null>();
  if (!incident) throw AppError.notFound("Incident");

  const overridden = hasOverrides(overrides);
  const { features, assumedFeatures } = deriveIncidentFeatures(incident, env.ANALYTICS_TIMEZONE, overrides);

  const stored = incident.riskEstimate;
  if (!overridden && !refresh && stored) {
    const info = cachedModelInfo();
    return {
      riskLevel: stored.level,
      probabilities: stored.probabilities,
      modelVersion: stored.modelVersion,
      isDemoModel: info?.isDemoModel ?? null,
      contributions: [],
      disclaimer: info?.disclaimer ?? DEFAULT_DISCLAIMER,
      features,
      assumedFeatures,
      estimatedAt: stored.estimatedAt.toISOString(),
      stored: true,
    };
  }

  const estimate = await estimateRisk(features);
  const estimatedAt = new Date();
  if (!overridden) {
    const riskEstimate: RiskEstimate = {
      level: estimate.riskLevel,
      probabilities: estimate.probabilities,
      modelVersion: estimate.modelVersion,
      estimatedAt,
    };
    // A derived value; it does not count as an edit of the report (updatedAt untouched).
    await Incident.updateOne({ _id: incident._id }, { $set: { riskEstimate } }, { timestamps: false });
  }
  return {
    ...estimate,
    features,
    assumedFeatures,
    estimatedAt: estimatedAt.toISOString(),
    stored: !overridden,
  };
}

// --- POST /api/ml/risk/refresh -----------------------------------------------

export interface RefreshResult {
  estimated: number;
  skipped: number;
  /** null when there was nothing to estimate (no ML call was made). */
  modelVersion: string | null;
  byLevel: Record<RiskLevel, number>;
  finishedAt: string;
}

const zeroLevels = (): Record<RiskLevel, number> =>
  Object.fromEntries(RISK_LEVELS.map((level) => [level, 0])) as Record<RiskLevel, number>;

/** Batch-estimate every non-rejected incident (newest first, cap 5000) in chunks of 500 and store the results. */
export async function refreshRiskEstimates(): Promise<RefreshResult> {
  const docs = await Incident.find({ status: { $ne: "REJECTED" } }, { createdAt: 1, category: 1 })
    .sort({ createdAt: -1, _id: -1 })
    .limit(REFRESH_CAP)
    .lean<Array<Pick<RiskIncidentSource, "_id" | "createdAt" | "category">>>();

  const byLevel = zeroLevels();
  let estimated = 0;
  let skipped = 0;
  let modelVersion: string | null = null;

  for (let start = 0; start < docs.length; start += REFRESH_CHUNK_SIZE) {
    const chunk = docs.slice(start, start + REFRESH_CHUNK_SIZE);
    const items = chunk.map((doc) => ({
      id: String(doc._id),
      features: deriveIncidentFeatures(doc).features,
    }));
    const body = parseMlBody(
      mlBatchResponseSchema,
      await mlClient.estimateRiskBatch(items),
      "batch risk estimate",
    );
    modelVersion = body.model_version;
    const estimatedAt = new Date();

    const wanted = new Set(items.map((item) => item.id));
    const results = new Map(body.results.filter((r) => wanted.has(r.id)).map((r) => [r.id, r]));
    const writes = [...results.values()].map((result) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(result.id) },
        update: {
          $set: {
            riskEstimate: {
              level: result.risk_level,
              probabilities: result.probabilities,
              modelVersion: body.model_version,
              estimatedAt,
            } satisfies RiskEstimate,
          },
        },
      },
    }));
    if (writes.length) await Incident.bulkWrite(writes, { ordered: false, timestamps: false });
    for (const result of results.values()) byLevel[result.risk_level] += 1;
    estimated += writes.length;
    skipped += chunk.length - writes.length;
  }

  return { estimated, skipped, modelVersion, byLevel, finishedAt: new Date().toISOString() };
}

// --- GET /api/ml/risk/distribution -------------------------------------------

export interface RiskDistribution {
  byLevel: Record<RiskLevel | "NONE", number>;
  total: number;
  estimated: number;
  modelVersions: string[];
  lastEstimatedAt: string | null;
  /** From the cached model info when available; null when the ML service has not been consulted recently. */
  isDemoModel: boolean | null;
}

/** Computed from stored estimates only (no ML call); NONE counts incidents without one. */
export async function riskDistribution(): Promise<RiskDistribution> {
  const rows = await Incident.aggregate<{
    _id: unknown;
    count: number;
    last: Date | null;
    versions: unknown[];
  }>([
    {
      $group: {
        _id: "$riskEstimate.level",
        count: { $sum: 1 },
        last: { $max: "$riskEstimate.estimatedAt" },
        versions: { $addToSet: "$riskEstimate.modelVersion" },
      },
    },
  ]);

  const byLevel: Record<RiskLevel | "NONE", number> = { ...zeroLevels(), NONE: 0 };
  const versions = new Set<string>();
  let lastEstimatedAt: Date | null = null;
  for (const row of rows) {
    const level = (RISK_LEVELS as readonly string[]).includes(String(row._id))
      ? (row._id as RiskLevel)
      : "NONE";
    byLevel[level] += row.count;
    if (level === "NONE") continue;
    for (const version of row.versions) if (typeof version === "string") versions.add(version);
    if (row.last instanceof Date && (!lastEstimatedAt || row.last > lastEstimatedAt))
      lastEstimatedAt = row.last;
  }
  const total = Object.values(byLevel).reduce((sum, n) => sum + n, 0);
  return {
    byLevel,
    total,
    estimated: total - byLevel.NONE,
    modelVersions: [...versions].sort(),
    lastEstimatedAt: lastEstimatedAt ? (lastEstimatedAt as Date).toISOString() : null,
    isDemoModel: cachedModelInfo()?.isDemoModel ?? null,
  };
}
