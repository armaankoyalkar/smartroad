/**
 * TypeScript shapes for every request and response in docs/api.md.
 * Coordinates are always named `latitude` / `longitude`; only the map endpoint
 * returns GeoJSON `[longitude, latitude]` pairs.
 */
import type {
  CategoryKey,
  IncidentStatus,
  Priority,
  PriorityFilterValue,
  RiskFilterValue,
  RiskLevel,
  Role,
  Severity,
  Source,
  VerificationState,
} from "@/constants/enums";

export type * from "./ml";

// ---------------------------------------------------------------- envelopes

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOTE_REQUIRED"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "EMAIL_TAKEN"
  | "INVALID_TRANSITION"
  | "UPLOAD_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "ML_ERROR"
  | "ML_UNAVAILABLE"
  /** Client-side only: the request never reached the API. */
  | "NETWORK_ERROR"
  /** Client-side only: the response was not a SmartRoad error envelope. */
  | "UNKNOWN_ERROR";

/** A `details[]` entry. Field errors use `field` + `message`; INVALID_TRANSITION uses from/to/allowed. */
export interface ApiErrorDetail {
  field?: string;
  message?: string;
  from?: IncidentStatus;
  to?: IncidentStatus;
  allowed?: IncidentStatus[];
  [key: string]: unknown;
}

export interface ApiErrorBody {
  success: false;
  error: { code: ApiErrorCode; message: string; details?: ApiErrorDetail[] };
}

export interface ApiSuccess<T, M = undefined> {
  success: true;
  data: T;
  meta?: M;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PageParams {
  page?: number;
  limit?: number;
  /** `-createdAt` for descending, `createdAt` for ascending. */
  sort?: string;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface WithMeta<T, M> {
  data: T;
  meta: M;
}

// ---------------------------------------------------------------- health and meta

export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  uptimeSeconds: number;
  timestamp: string;
  checks: {
    database: { status: "up" | "down"; latencyMs: number | null; error: string | null };
    mlService: {
      status: "up" | "down";
      latencyMs: number | null;
      modelLoaded: boolean | null;
      modelVersion: string | null;
      error: string | null;
    };
  };
}

export interface Category {
  key: CategoryKey;
  label: string;
  color: string;
  description: string;
}

export interface EnumLabels {
  role: Partial<Record<Role, string>>;
  severity: Partial<Record<Severity, string>>;
  priority: Partial<Record<Priority, string>>;
  status: Partial<Record<IncidentStatus, string>>;
  verification: Partial<Record<VerificationState, string>>;
  riskLevel: Partial<Record<RiskLevel, string>>;
  source: Partial<Record<Source, string>>;
}

export interface MapDefaults {
  center: { latitude: number; longitude: number };
  zoom: number;
}

export interface UploadLimits {
  maxBytes: number;
  mimeTypes: string[];
}

export interface Enums {
  roles: Role[];
  severities: Severity[];
  priorities: Priority[];
  statuses: IncidentStatus[];
  verificationStates: VerificationState[];
  riskLevels: RiskLevel[];
  transitions: Record<IncidentStatus, IncidentStatus[]>;
  labels: EnumLabels;
  map: MapDefaults;
  upload: UploadLimits;
}

// ---------------------------------------------------------------- auth and users

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateMeInput {
  name?: string;
  /** `null` clears the phone number. */
  phone?: string | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface AdminUser extends User {
  isActive: boolean;
  incidentCount: number;
}

export interface AdminUserDetail extends AdminUser {
  incidentsByStatus: Record<IncidentStatus, number>;
}

export interface UserListParams extends PageParams {
  q?: string;
  role?: Role;
  isActive?: boolean;
}

export interface UpdateUserInput {
  isActive?: boolean;
  role?: Role;
}

// ---------------------------------------------------------------- incidents

export interface UserRef {
  id: string;
  name: string;
  /** Present for admins only. */
  email?: string;
}

export interface IncidentImage {
  url: string;
  mimeType: string;
  size: number;
}

export interface StatusHistoryEntry {
  field: "status" | "priority";
  from: string | null;
  to: string;
  /** Omitted entirely for viewers who may not see notes. */
  note?: string | null;
  changedBy: UserRef | null;
  at: string;
}

export interface StoredRiskEstimate {
  level: RiskLevel;
  probabilities: Record<RiskLevel, number>;
  modelVersion: string;
  estimatedAt: string;
}

/** Incident object (docs/api.md 6.1). Optional fields depend on the privacy variant of the viewer. */
export interface Incident {
  id: string;
  title: string;
  description: string;
  category: CategoryKey;
  severity: Severity;
  priority: Priority | null;
  status: IncidentStatus;
  verification: VerificationState;
  latitude: number;
  longitude: number;
  address: string;
  image: IncidentImage | null;
  reportedBy: UserRef | null;
  verifiedBy: UserRef | null;
  adminNote?: string | null;
  statusHistory: StatusHistoryEntry[];
  riskEstimate?: StoredRiskEstimate | null;
  source: Source;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fields of POST /api/incidents (multipart). */
export interface IncidentCreateInput {
  title: string;
  category: CategoryKey;
  description: string;
  severity: Severity;
  latitude: number;
  longitude: number;
  address?: string;
  image?: File | null;
}

/** Fields of PATCH /api/incidents/:id. `adminNote` is accepted from admins only. */
export interface IncidentUpdateInput extends Partial<IncidentCreateInput> {
  removeImage?: boolean;
  adminNote?: string | null;
}

export interface IncidentListParams extends PageParams {
  status?: IncidentStatus[];
  category?: CategoryKey[];
  severity?: Severity[];
  priority?: PriorityFilterValue[];
  source?: Source[];
  riskLevel?: RiskFilterValue[];
  from?: string;
  to?: string;
  q?: string;
}

export type MyIncidentListParams = Omit<IncidentListParams, "q" | "source" | "riskLevel">;
export type IncidentListMeta = PaginationMeta;

export interface StatusChangeInput {
  status: IncidentStatus;
  note?: string;
}

export interface PriorityChangeInput {
  priority: Priority | null;
  note?: string;
}

export interface DeleteResult {
  id: string;
}

// ---------------------------------------------------------------- analytics

export interface PublicStats {
  reportsFiled: number;
  reportsResolved: number;
  reportsLast30Days: number;
  resolvedLast30Days: number;
  generatedAt: string;
}

export interface MyStats {
  total: number;
  pending: number;
  active: number;
  resolved: number;
  rejected: number;
}

export interface AnalyticsParams {
  from?: string;
  to?: string;
  includeSeed?: boolean;
}

export interface AnalyticsSummary {
  total: number;
  pendingVerification: number;
  verified: number;
  active: number;
  resolved: number;
  rejected: number;
  highPriorityOpen: number;
  byStatus: Record<IncidentStatus, number>;
  seedCount: number;
}

export interface AnalyticsMeta {
  from: string | null;
  to: string | null;
  includeSeed: boolean;
}

export type BreakdownBy = "category" | "status" | "priority" | "severity" | "riskLevel";

export interface BreakdownItem {
  key: string;
  label: string;
  count: number;
  color?: string;
}

export type Breakdown = BreakdownItem[];

export type Granularity = "day" | "week" | "month";

export interface TimelinePoint {
  period: string;
  count: number;
}

export type Timeline = TimelinePoint[];

export interface TimelineParams extends AnalyticsParams {
  granularity?: Granularity;
}

export interface TimelineMeta {
  granularity: Granularity;
  timezone: string;
  from: string;
  to: string;
}

// ---------------------------------------------------------------- map

export interface MapFeatureProperties {
  id: string;
  title: string;
  category: CategoryKey;
  severity: Severity;
  status: IncidentStatus;
  verification: VerificationState;
  /** `null` for non-admin callers. */
  priority: Priority | null;
  /** `null` for non-admin callers or when no estimate exists. */
  riskLevel: RiskLevel | null;
  createdAt: string;
  address: string;
  source: Source;
  hasImage: boolean;
}

export interface MapFeature {
  type: "Feature";
  /** GeoJSON order: [longitude, latitude]. */
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: MapFeatureProperties;
}

export interface MapFeatureCollection {
  type: "FeatureCollection";
  features: MapFeature[];
}

export interface MapIncidentsMeta {
  count: number;
  truncated: boolean;
  seedCount: number;
}

export type BBox = [minLng: number, minLat: number, maxLng: number, maxLat: number];

export interface MapIncidentsParams {
  status?: IncidentStatus[];
  category?: CategoryKey[];
  severity?: Severity[];
  priority?: PriorityFilterValue[];
  riskLevel?: RiskFilterValue[];
  source?: Source[];
  from?: string;
  to?: string;
  bbox?: BBox;
  limit?: number;
}

export interface HotspotCluster {
  id: number;
  centroid: { latitude: number; longitude: number };
  radiusMeters: number;
  count: number;
  dominantCategory: CategoryKey | null;
  categoryCounts: Partial<Record<CategoryKey, number>>;
  memberIds: string[];
}

export interface HotspotResponse {
  clusters: HotspotCluster[];
  noiseIds: string[];
  totalPoints: number;
}

export interface HotspotMeta {
  eps: number;
  minSamples: number;
  computedAt: string;
  cached: boolean;
  algorithm: string;
}

export interface HotspotParams {
  eps?: number;
  minSamples?: number;
  category?: CategoryKey[];
  status?: IncidentStatus[];
  from?: string;
  to?: string;
}
