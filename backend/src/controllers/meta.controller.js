import { CATEGORIES } from "../config/categories.js";
import { LABELS, PRIORITIES, ROLE_VALUES, SEVERITIES, STATUSES, TRANSITIONS, UPLOAD_MIME_TYPES } from "../config/enums.js";
import { env } from "../config/env.js";

/** GET /api/meta/categories */
export function getCategories(req, res) {
  res.json({ success: true, data: CATEGORIES });
}

/** GET /api/meta/enums: everything the frontend needs to stay in sync with the backend. */
export function getEnums(req, res) {
  res.json({
    success: true,
    data: {
      roles: ROLE_VALUES,
      severities: SEVERITIES,
      priorities: PRIORITIES,
      statuses: STATUSES,
      transitions: TRANSITIONS,
      labels: LABELS,
      map: {
        center: { latitude: env.MAP_CENTER_LAT, longitude: env.MAP_CENTER_LNG },
        zoom: env.MAP_ZOOM,
      },
      upload: { maxBytes: env.maxUploadBytes, mimeTypes: UPLOAD_MIME_TYPES },
    },
  });
}
