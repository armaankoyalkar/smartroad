import { type RequestHandler } from "express";
import { CATEGORIES } from "../config/categories.js";
import {
  LABELS,
  PRIORITIES,
  RISK_LEVELS,
  ROLE_VALUES,
  SEVERITIES,
  STATUSES,
  TRANSITIONS,
  UPLOAD_MIME_TYPES,
  VERIFICATION_STATES,
} from "../config/enums.js";
import { env } from "../config/env.js";

/** GET /api/meta/categories */
export const getCategories: RequestHandler = (_req, res) => {
  res.json({ success: true, data: CATEGORIES });
};

/** GET /api/meta/enums: everything the frontend needs to stay in sync with the backend (docs/api.md section 4). */
export const getEnums: RequestHandler = (_req, res) => {
  res.json({
    success: true,
    data: {
      roles: ROLE_VALUES,
      severities: SEVERITIES,
      priorities: PRIORITIES,
      statuses: STATUSES,
      verificationStates: VERIFICATION_STATES,
      riskLevels: RISK_LEVELS,
      transitions: TRANSITIONS,
      labels: LABELS,
      map: {
        center: { latitude: env.MAP_CENTER_LAT, longitude: env.MAP_CENTER_LNG },
        zoom: env.MAP_ZOOM,
      },
      upload: { maxBytes: env.maxUploadBytes, mimeTypes: UPLOAD_MIME_TYPES },
    },
  });
};
