/**
 * Types for the ML proxy routes (docs/api.md section 9). Every response about a
 * risk level carries `disclaimer` and `isDemoModel` so the UI can label it honestly.
 */
import type {
  AreaType,
  CategoryKey,
  DayOfWeek,
  LightCondition,
  RiskLevel,
  RoadSurface,
  RoadType,
  Weather,
} from "@/constants/enums";

export interface DatasetCard {
  name: string;
  isDemoData: boolean;
  source: string;
  url: string | null;
  accessDate: string | null;
  licence: string;
  records: number;
  trainRecords: number;
  testRecords: number;
  targetDefinition: string;
  geographicCoverage: string;
  temporalCoverage: string;
  limitations: string[];
}

export interface FeatureSpec {
  name: string;
  label: string;
  type: "integer" | "number" | "categorical";
  min?: number;
  max?: number;
  values?: string[];
  description?: string;
}

export interface PerClassMetrics {
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface ModelMetrics {
  accuracy: number;
  macroF1: number;
  weightedF1: number;
  perClass: Record<RiskLevel, PerClassMetrics>;
}

export interface ConfusionMatrix {
  labels: RiskLevel[];
  matrix: number[][];
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  method: string;
}

export interface ModelComparisonRow {
  model: string;
  accuracy: number;
  macroF1: number;
}

export interface ResearchModel {
  features: string[];
  metrics: { accuracy: number; macroF1: number };
  note: string;
}

export type ClassDistribution = Record<RiskLevel, number>;

export interface ModelInfo {
  modelName: string;
  modelVersion: string;
  trainedAt: string;
  isDemoModel: boolean;
  dataset: DatasetCard;
  preprocessing: string[];
  features: FeatureSpec[];
  classes: RiskLevel[];
  classDistribution: { train: ClassDistribution; test: ClassDistribution };
  metrics: ModelMetrics;
  confusionMatrix: ConfusionMatrix;
  featureImportance: FeatureImportance[];
  comparison: ModelComparisonRow[];
  researchModel: ResearchModel;
  hotspotDefaults: { epsMeters: number; minSamples: number };
  disclaimer: string;
}

/** The ten features of the shipped model. All are required by POST /api/ml/estimate-risk. */
export interface RiskFeatures {
  hour: number;
  day_of_week: DayOfWeek;
  month: number;
  light_conditions: LightCondition;
  weather: Weather;
  road_surface: RoadSurface;
  road_type: RoadType;
  speed_limit: number;
  area_type: AreaType;
  category: CategoryKey;
}

export interface RiskContribution {
  feature: string;
  value: string | number;
  /** Local sensitivity, not SHAP: positive values pushed the estimate towards the predicted class. */
  effect: number;
}

export type RiskProbabilities = Record<RiskLevel, number>;

export interface RiskEstimate {
  riskLevel: RiskLevel;
  probabilities: RiskProbabilities;
  modelVersion: string;
  isDemoModel: boolean;
  contributions: RiskContribution[];
  disclaimer: string;
}

/** GET /api/ml/incidents/:id/risk adds the vector used and which features were assumed. */
export interface IncidentRiskEstimate extends RiskEstimate {
  features: RiskFeatures;
  assumedFeatures: string[];
}

export interface IncidentRiskParams extends Partial<RiskFeatures> {
  refresh?: boolean;
}

export interface RiskRefreshResult {
  estimated: number;
  skipped: number;
  modelVersion: string;
  byLevel: Record<RiskLevel, number>;
  finishedAt: string;
}

export interface RiskDistribution {
  byLevel: Record<RiskLevel | "NONE", number>;
  total: number;
  estimated: number;
  modelVersions: string[];
  lastEstimatedAt: string | null;
  isDemoModel: boolean;
}
