/**
 * Local fallbacks used while GET /api/meta/* is loading or unreachable, so the app always
 * renders. Labels come from constants/enums.ts; category colours are deliberately a single
 * neutral colour (real colours only ever come from the API).
 */
import { config } from "@/config";
import { FALLBACK_CATEGORY_COLOR } from "@/constants/colors";
import {
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  RISK_LABELS,
  RISK_LEVELS,
  ROLES,
  ROLE_LABELS,
  SEVERITIES,
  SEVERITY_LABELS,
  SOURCE_LABELS,
  STATUSES,
  STATUS_LABELS,
  TRANSITIONS,
  VERIFICATION_LABELS,
  VERIFICATION_STATES,
} from "@/constants/enums";
import type { Category, EnumLabels, Enums } from "@/types/api";

export const LOCAL_LABELS: EnumLabels = {
  role: ROLE_LABELS,
  severity: SEVERITY_LABELS,
  priority: PRIORITY_LABELS,
  status: STATUS_LABELS,
  verification: VERIFICATION_LABELS,
  riskLevel: RISK_LABELS,
  source: SOURCE_LABELS,
};

export const FALLBACK_ENUMS: Enums = {
  roles: [...ROLES],
  severities: [...SEVERITIES],
  priorities: [...PRIORITIES],
  statuses: [...STATUSES],
  verificationStates: [...VERIFICATION_STATES],
  riskLevels: [...RISK_LEVELS],
  transitions: Object.fromEntries(
    Object.entries(TRANSITIONS).map(([k, v]) => [k, [...v]]),
  ) as Enums["transitions"],
  labels: LOCAL_LABELS,
  map: config.defaultMap,
  upload: { maxBytes: config.defaultUpload.maxBytes, mimeTypes: [...config.defaultUpload.mimeTypes] },
};

export const FALLBACK_CATEGORIES: Category[] = CATEGORY_KEYS.map((key) => ({
  key,
  label: CATEGORY_LABELS[key],
  color: FALLBACK_CATEGORY_COLOR,
  description: "",
}));
