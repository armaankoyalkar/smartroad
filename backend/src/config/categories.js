/**
 * Incident categories (decision D-13). Adding a category means adding one
 * entry here; the frontend reads the list from GET /api/meta/categories and
 * the Incident model validates against CATEGORY_KEYS at runtime.
 *
 * Colours are served with the categories so markers, legend and charts all
 * use the same palette.
 */
export const CATEGORIES = Object.freeze([
  { key: "ACCIDENT", label: "Accident", color: "#DC2626", description: "Collision or crash involving vehicles, pedestrians or cyclists" },
  { key: "POTHOLE", label: "Pothole", color: "#D97706", description: "Hole or depression in the road surface" },
  { key: "ROAD_DAMAGE", label: "Road damage", color: "#7C3AED", description: "Broken surface, missing slabs, damaged divider, open manhole" },
  { key: "TRAFFIC_SIGNAL", label: "Traffic signal issue", color: "#2563EB", description: "Signal not working, stuck, or with wrong timing" },
  { key: "OBSTRUCTION", label: "Road obstruction", color: "#0891B2", description: "Debris, fallen tree, parked vehicle or construction blocking the road" },
  { key: "WATERLOGGING", label: "Waterlogging", color: "#0D9488", description: "Standing water on the road after rain or a burst pipe" },
  { key: "HAZARD", label: "Hazardous condition", color: "#DB2777", description: "Oil spill, missing sign, exposed cable or other danger" },
  { key: "OTHER", label: "Other", color: "#6B7280", description: "Anything that does not fit the categories above" },
].map((c) => Object.freeze(c)));

export const CATEGORY_KEYS = Object.freeze(CATEGORIES.map((c) => c.key));

const byKey = new Map(CATEGORIES.map((c) => [c.key, c]));

export function getCategory(key) {
  return byKey.get(key) ?? null;
}

export function isCategoryKey(key) {
  return byKey.has(key);
}
