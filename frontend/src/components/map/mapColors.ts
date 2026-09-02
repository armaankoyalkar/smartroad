/**
 * The single source of marker and legend colours. Category colours come from MetaContext
 * (GET /api/meta/categories); the other modes use constants/colors.ts, so markers, legend
 * and charts can never disagree.
 */
import { NEUTRAL_COLOR, RISK_COLORS, SEVERITY_COLORS, STATUS_COLORS } from "@/constants/colors";
import { RISK_LEVELS, RISK_NONE_LABEL, SEVERITIES, STATUSES } from "@/constants/enums";
import type { MetaContextValue } from "@/meta/context";
import type { MapFeatureProperties } from "@/types/api";

export type ColorMode = "category" | "severity" | "status" | "risk";

export const COLOR_MODES: readonly ColorMode[] = ["category", "severity", "status", "risk"];

/** Modes every visitor may use; `risk` needs admin data (riskLevel is null otherwise). */
export const PUBLIC_COLOR_MODES: readonly ColorMode[] = ["category", "severity", "status"];

export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  category: "Category",
  severity: "Severity",
  status: "Status",
  risk: "Risk level",
};

export function isColorMode(value: unknown): value is ColorMode {
  return typeof value === "string" && (COLOR_MODES as readonly string[]).includes(value);
}

export interface LegendItem {
  key: string;
  label: string;
  color: string;
}

type MetaLike = Pick<MetaContextValue, "categories" | "label" | "categoryColor">;

/** Marker colour for one GeoJSON feature in the given mode. */
export function featureColor(
  properties: Pick<MapFeatureProperties, "category" | "severity" | "status" | "riskLevel">,
  mode: ColorMode,
  meta: Pick<MetaContextValue, "categoryColor">,
): string {
  switch (mode) {
    case "category":
      return meta.categoryColor(properties.category);
    case "severity":
      return SEVERITY_COLORS[properties.severity] ?? NEUTRAL_COLOR;
    case "status":
      return STATUS_COLORS[properties.status] ?? NEUTRAL_COLOR;
    case "risk":
      return properties.riskLevel ? (RISK_COLORS[properties.riskLevel] ?? NEUTRAL_COLOR) : NEUTRAL_COLOR;
  }
}

/** Legend entries for a colour mode, in display order. */
export function legendItems(mode: ColorMode, meta: MetaLike): LegendItem[] {
  switch (mode) {
    case "category":
      return meta.categories.map((c) => ({ key: c.key, label: c.label, color: c.color }));
    case "severity":
      return SEVERITIES.map((s) => ({ key: s, label: meta.label("severity", s), color: SEVERITY_COLORS[s] }));
    case "status":
      return STATUSES.map((s) => ({ key: s, label: meta.label("status", s), color: STATUS_COLORS[s] }));
    case "risk":
      return [
        ...RISK_LEVELS.map((r) => ({ key: r, label: meta.label("riskLevel", r), color: RISK_COLORS[r] })),
        { key: "NONE", label: RISK_NONE_LABEL, color: NEUTRAL_COLOR },
      ];
  }
}

/** Styling shared by the muted (noise / de-emphasised) markers. */
export const MUTED_MARKER = {
  color: "#475569",
  fillColor: "#475569",
  fillOpacity: 0.35,
  opacity: 0.6,
  weight: 1,
} as const;
