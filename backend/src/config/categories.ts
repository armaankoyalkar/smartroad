/**
 * Incident categories (docs/api.md section 2). Adding a category means adding
 * one entry here; the frontend reads the list from GET /api/meta/categories
 * and the Incident model validates against CATEGORY_KEYS at runtime.
 *
 * Colours are served with the categories so markers, legend and charts all
 * use the same palette. Order matters: it is the order the API returns.
 */

export const CATEGORY_KEYS = Object.freeze([
  "POTHOLE",
  "ROAD_DAMAGE",
  "ACCIDENT",
  "TRAFFIC_CONGESTION",
  "TRAFFIC_SIGNAL",
  "STREET_LIGHT",
  "UNSAFE_ROAD",
  "OBSTRUCTION",
  "WATERLOGGING",
  "OTHER",
] as const);
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export interface Category {
  readonly key: CategoryKey;
  readonly label: string;
  readonly color: string;
  readonly description: string;
}

const DEFINITIONS: Record<CategoryKey, Omit<Category, "key">> = {
  POTHOLE: { label: "Pothole", color: "#D97706", description: "Hole or depression in the road surface" },
  ROAD_DAMAGE: {
    label: "Road damage",
    color: "#7C3AED",
    description: "Broken surface, missing slabs, damaged divider, open manhole",
  },
  ACCIDENT: {
    label: "Accident",
    color: "#DC2626",
    description: "Collision or crash involving vehicles, pedestrians or cyclists",
  },
  TRAFFIC_CONGESTION: {
    label: "Traffic congestion",
    color: "#EA580C",
    description: "Recurring or unusual congestion, jam or bottleneck",
  },
  TRAFFIC_SIGNAL: {
    label: "Broken traffic signal",
    color: "#2563EB",
    description: "Signal not working, stuck, or with wrong timing",
  },
  STREET_LIGHT: {
    label: "Street-light issue",
    color: "#CA8A04",
    description: "Street light not working, flickering or missing, leaving the road dark",
  },
  UNSAFE_ROAD: {
    label: "Unsafe road condition",
    color: "#DB2777",
    description: "Oil spill, missing sign or barrier, exposed cable or other danger",
  },
  OBSTRUCTION: {
    label: "Obstruction",
    color: "#0891B2",
    description: "Debris, fallen tree, parked vehicle or construction blocking the road",
  },
  WATERLOGGING: {
    label: "Waterlogging",
    color: "#0D9488",
    description: "Standing water on the road after rain or a burst pipe",
  },
  OTHER: { label: "Other", color: "#6B7280", description: "Anything that does not fit the categories above" },
};

export const CATEGORIES: readonly Category[] = Object.freeze(
  CATEGORY_KEYS.map((key) => Object.freeze({ key, ...DEFINITIONS[key] })),
);

const byKey = new Map<string, Category>(CATEGORIES.map((c) => [c.key, c]));

export function getCategory(key: string): Category | null {
  return byKey.get(key) ?? null;
}

export function isCategoryKey(key: unknown): key is CategoryKey {
  return typeof key === "string" && byKey.has(key);
}
