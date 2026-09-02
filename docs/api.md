# SmartRoad REST API contract

This file is the single source of truth for the HTTP interface between the React frontend and the Express backend, and for the internal interface between the backend and the Python ML service. Every route, request shape and response shape here is implemented; nothing here is aspirational. The Phase 1 draft it supersedes is kept in `docs/design/04-api-contract.md`.

## 1. Conventions

- Base path `/api`. No version prefix.
- JSON bodies (UTF-8) except `POST /api/incidents` and `PATCH /api/incidents/:id`, which accept `multipart/form-data` because of the image.
- Authentication: `Authorization: Bearer <jwt>`. Access levels: `none` (no token), `signed-in` (any valid token), `admin` (token whose user has role `admin`). Stored roles are `citizen` and `admin`.
- Success envelope: `{ "success": true, "data": ..., "meta": { ... } }` (`meta` optional).
- Error envelope (every error, including 404 and 500):

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [{ "field": "latitude", "message": "Must be between -90 and 90" }]
  }
}
```

- Error codes and HTTP statuses: `VALIDATION_ERROR` 400, `NOTE_REQUIRED` 400, `UNAUTHENTICATED` 401, `INVALID_CREDENTIALS` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `EMAIL_TAKEN` 409, `INVALID_TRANSITION` 409, `UPLOAD_TOO_LARGE` 413, `UNSUPPORTED_FILE_TYPE` 415, `RATE_LIMITED` 429, `INTERNAL_ERROR` 500, `ML_ERROR` 502 (the ML service answered with an error or a malformed body), `ML_UNAVAILABLE` 503 (the ML service could not be reached or timed out).
- Pagination on list endpoints: `page` (default 1) and `limit` (default 20, max 100); `meta` returns `{ page, limit, total, totalPages }`.
- Sorting: `sort=-createdAt` (descending) or `sort=createdAt`. Allowed fields are listed per endpoint. `priority` and `severity` sort in rank order (LOW < MEDIUM < HIGH < CRITICAL); unassigned priority sorts last.
- Multi-valued filters (`status`, `category`, `severity`, `priority`, `source`, `riskLevel`) accept comma-separated values.
- Dates in query strings: ISO 8601 (`2026-09-01` or `2026-09-01T00:00:00Z`). Responses always use full ISO UTC timestamps.
- Ids are MongoDB ObjectId strings. Malformed ids return 400 `VALIDATION_ERROR`; unknown ids return 404 `NOT_FOUND`.
- Unknown body fields are stripped, never stored. Every input schema accepts only primitive types where primitives are expected, which blocks MongoDB operator injection.
- CORS: only origins listed in `CORS_ORIGIN`.
- Rate limits (defaults, configurable): login and register 10 per 15 minutes per IP; `POST /api/incidents` 20 per hour per user; global 300 per 15 minutes per IP.

## 2. Domain vocabulary

Keys are stored in MongoDB, sent over the API and mirrored in the frontend. Labels are for display only.

| Concept | Keys |
|---|---|
| Role | `citizen`, `admin` |
| Category | `POTHOLE`, `ROAD_DAMAGE`, `ACCIDENT`, `TRAFFIC_CONGESTION`, `TRAFFIC_SIGNAL`, `STREET_LIGHT`, `UNSAFE_ROAD`, `OBSTRUCTION`, `WATERLOGGING`, `OTHER` |
| Severity (set by the reporter) | `LOW`, `MEDIUM`, `HIGH` |
| Priority (set by an admin; `null` until assigned) | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| Status | `SUBMITTED`, `UNDER_REVIEW`, `VERIFIED`, `IN_PROGRESS`, `RESOLVED`, `REJECTED` |
| Verification state (derived from status, never stored) | `PENDING` (SUBMITTED, UNDER_REVIEW), `VERIFIED` (VERIFIED, IN_PROGRESS, RESOLVED), `REJECTED` |
| Record source | `user`, `seed` (`seed` = demo/development data) |
| Risk level (ML output) | `LOW`, `MEDIUM`, `HIGH` |

Category labels and colours (served by `GET /api/meta/categories`, used by markers, legend and charts):

| Key | Label | Colour |
|---|---|---|
| POTHOLE | Pothole | `#D97706` |
| ROAD_DAMAGE | Road damage | `#7C3AED` |
| ACCIDENT | Accident | `#DC2626` |
| TRAFFIC_CONGESTION | Traffic congestion | `#EA580C` |
| TRAFFIC_SIGNAL | Broken traffic signal | `#2563EB` |
| STREET_LIGHT | Street-light issue | `#CA8A04` |
| UNSAFE_ROAD | Unsafe road condition | `#DB2777` |
| OBSTRUCTION | Obstruction | `#0891B2` |
| WATERLOGGING | Waterlogging | `#0D9488` |
| OTHER | Other | `#6B7280` |

Status lifecycle (server-enforced; only admins change status):

| From | To |
|---|---|
| SUBMITTED | UNDER_REVIEW, REJECTED |
| UNDER_REVIEW | VERIFIED, REJECTED |
| VERIFIED | IN_PROGRESS, RESOLVED, REJECTED |
| IN_PROGRESS | RESOLVED |
| RESOLVED | IN_PROGRESS (reopen) |
| REJECTED | UNDER_REVIEW (reconsider) |

Rules: REJECTED requires a note; RESOLVED sets `resolvedAt`, reopening clears it; the first VERIFIED sets `verifiedBy`; reconsidering a rejected incident clears `adminNote` (the rejection reason stays in the history); every status or priority change appends an entry to `statusHistory`.

## 3. Endpoint summary

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | none | Liveness plus database and ML service connectivity |
| GET | `/api/meta/categories` | none | Category keys, labels, colours, descriptions |
| GET | `/api/meta/enums` | none | Severities, priorities, statuses, transitions, labels, map defaults, upload limits |
| POST | `/api/auth/register` | none | Create a citizen account, returns token |
| POST | `/api/auth/login` | none | Obtain a JWT |
| GET | `/api/auth/me` | signed-in | Current user profile |
| PATCH | `/api/users/me` | signed-in | Update name, phone |
| PATCH | `/api/users/me/password` | signed-in | Change password |
| GET | `/api/users` | admin | List users with search, filters, pagination |
| GET | `/api/users/:id` | admin | One user with incident counts |
| PATCH | `/api/users/:id` | admin | Activate/deactivate, change role |
| POST | `/api/incidents` | signed-in | Report an incident (multipart) |
| GET | `/api/incidents` | admin | List all incidents with filters, search, sort |
| GET | `/api/incidents/mine` | signed-in | The caller's own reports |
| GET | `/api/incidents/:id` | signed-in | One incident (privacy variant per viewer) |
| PATCH | `/api/incidents/:id` | owner while SUBMITTED, or admin | Edit fields (multipart if image) |
| DELETE | `/api/incidents/:id` | admin | Delete permanently (and its image file) |
| PATCH | `/api/incidents/:id/status` | admin | Change status with optional note |
| PATCH | `/api/incidents/:id/priority` | admin | Set or clear priority |
| GET | `/api/analytics/public` | none | Landing page figures |
| GET | `/api/analytics/mine` | signed-in | Citizen dashboard counts |
| GET | `/api/analytics/summary` | admin | Admin dashboard counts |
| GET | `/api/analytics/breakdown` | admin | Counts by category, status, priority, severity or riskLevel |
| GET | `/api/analytics/timeline` | admin | Counts over time |
| GET | `/api/map/incidents` | none | GeoJSON incidents for the map |
| GET | `/api/map/hotspots` | admin | DBSCAN clusters via the ML service |
| GET | `/api/ml/model-info` | admin | Dataset card, metrics, feature schema |
| POST | `/api/ml/estimate-risk` | admin | Risk estimate for typed feature values |
| GET | `/api/ml/incidents/:id/risk` | admin | Risk estimate derived from one incident |
| POST | `/api/ml/risk/refresh` | admin | Batch-estimate and store risk for stored incidents |
| GET | `/api/ml/risk/distribution` | admin | Distribution of stored risk estimates |
| GET | `/uploads/:filename` | none | Static image files (images only, no directory listing) |

## 4. Health and meta

### GET `/api/health`

200 when the database answers, 503 otherwise. The ML service is reported but never affects the status.

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptimeSeconds": 12,
    "timestamp": "2026-09-02T10:00:00.000Z",
    "checks": {
      "database": { "status": "up", "latencyMs": 2, "error": null },
      "mlService": { "status": "up", "latencyMs": 15, "modelLoaded": true, "modelVersion": "demo-rf-1.0.0", "error": null }
    }
  }
}
```

### GET `/api/meta/categories`

`data`: array of `{ key, label, color, description }` in the order of section 2.

### GET `/api/meta/enums`

```json
{
  "success": true,
  "data": {
    "roles": ["citizen", "admin"],
    "severities": ["LOW", "MEDIUM", "HIGH"],
    "priorities": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    "statuses": ["SUBMITTED", "UNDER_REVIEW", "VERIFIED", "IN_PROGRESS", "RESOLVED", "REJECTED"],
    "verificationStates": ["PENDING", "VERIFIED", "REJECTED"],
    "riskLevels": ["LOW", "MEDIUM", "HIGH"],
    "transitions": { "SUBMITTED": ["UNDER_REVIEW", "REJECTED"], "UNDER_REVIEW": ["VERIFIED", "REJECTED"], "VERIFIED": ["IN_PROGRESS", "RESOLVED", "REJECTED"], "IN_PROGRESS": ["RESOLVED"], "RESOLVED": ["IN_PROGRESS"], "REJECTED": ["UNDER_REVIEW"] },
    "labels": { "role": {}, "severity": {}, "priority": {}, "status": {}, "verification": {}, "riskLevel": {}, "source": {} },
    "map": { "center": { "latitude": 17.385, "longitude": 78.4867 }, "zoom": 12 },
    "upload": { "maxBytes": 5242880, "mimeTypes": ["image/jpeg", "image/png", "image/webp"] }
  }
}
```

## 5. Auth and users

### POST `/api/auth/register`

Body `{ "name", "email", "password", "phone"? }`. Name 2 to 80 chars; email valid and unique (409 `EMAIL_TAKEN`); password 8 to 72 chars; phone optional, 10 to 15 digits with optional leading `+`. `role` in the body is ignored. Response 201:

```json
{ "success": true, "data": { "token": "<jwt>", "user": { "id": "...", "name": "...", "email": "...", "role": "citizen", "phone": null, "createdAt": "..." } } }
```

### POST `/api/auth/login`

Body `{ "email", "password" }`. Response 200 with the same shape as register. Unknown email and wrong password both return 401 `INVALID_CREDENTIALS` with the same message. Deactivated accounts return 403 `FORBIDDEN`.

JWT payload: `{ "sub": "<userId>", "role": "citizen", "iat", "exp" }`, HS256, expiry from `JWT_EXPIRES_IN` (default `24h`). Logout is client-side: the SPA discards the token. The middleware loads the user on every request, so deactivation takes effect immediately.

### GET `/api/auth/me`

`data`: `{ id, name, email, role, phone, createdAt }`. 401 when the token is missing, invalid or expired.

### PATCH `/api/users/me`

Body: any of `{ "name", "phone" }` (`phone` may be `null` to clear). Returns the profile object.

### PATCH `/api/users/me/password`

Body `{ "currentPassword", "newPassword" }`. Wrong current password returns 401 `INVALID_CREDENTIALS`. Returns the profile object.

### GET `/api/users` (admin)

Query: `q` (case-insensitive substring over name and email), `role`, `isActive` (`true`/`false`), `page`, `limit`, `sort` (`createdAt`, `name`, `email`; default `-createdAt`). `data`: array of `{ id, name, email, role, phone, isActive, createdAt, incidentCount }`.

### GET `/api/users/:id` (admin)

`data`: the same object as a list row plus `incidentsByStatus: { SUBMITTED: 0, ... }`.

### PATCH `/api/users/:id` (admin)

Body: any of `{ "isActive": boolean, "role": "citizen" | "admin" }`. An admin cannot change their own role or deactivate themselves (400 `VALIDATION_ERROR`, field `id`). Returns the user object.

## 6. Incidents

### 6.1 Incident object

```json
{
  "id": "66d5a2b8c2b7a4e8f1a2b3d0",
  "title": "Deep pothole near Hitec City flyover",
  "description": "...",
  "category": "POTHOLE",
  "severity": "HIGH",
  "priority": "HIGH",
  "status": "VERIFIED",
  "verification": "VERIFIED",
  "latitude": 17.4483,
  "longitude": 78.3814,
  "address": "Hitec City Main Road, Madhapur, Hyderabad",
  "image": { "url": "/uploads/3f9c2e1a7b8d4c5e.jpg", "mimeType": "image/jpeg", "size": 734221 },
  "reportedBy": { "id": "...", "name": "Priya Sharma", "email": "priya@example.com" },
  "verifiedBy": { "id": "...", "name": "Admin One" },
  "adminNote": "Confirmed by site photo.",
  "statusHistory": [
    { "field": "status", "from": null, "to": "SUBMITTED", "note": null, "changedBy": null, "at": "..." },
    { "field": "status", "from": "SUBMITTED", "to": "UNDER_REVIEW", "note": null, "changedBy": { "id": "...", "name": "Admin One" }, "at": "..." }
  ],
  "riskEstimate": { "level": "MEDIUM", "probabilities": { "LOW": 0.31, "MEDIUM": 0.52, "HIGH": 0.17 }, "modelVersion": "demo-rf-1.0.0", "estimatedAt": "..." },
  "source": "user",
  "resolvedAt": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

`image.url` is a path relative to the API origin; the frontend prefixes `VITE_API_URL`. Privacy variants produced by the serializer:

| Viewer | `reportedBy` | `verifiedBy` | `adminNote` and history notes | `statusHistory[].changedBy` | `riskEstimate` |
|---|---|---|---|---|---|
| Admin | `{ id, name, email }` | `{ id, name }` | yes | `{ id, name }` | yes (or `null`) |
| The reporter | own `{ id, name }` | `null` | yes | `null` | omitted |
| Other signed-in user | `null` | `null` | omitted | `null` | omitted |

### 6.2 POST `/api/incidents` (signed-in)

`multipart/form-data` fields: `title` (5 to 120), `category`, `description` (10 to 2000), `severity`, `latitude` (-90 to 90), `longitude` (-180 to 180), `address` (optional, max 300), `image` (optional file: JPEG, PNG or WebP by magic bytes, at most `MAX_UPLOAD_MB`). Also accepts `application/json` without an image. The new incident starts as SUBMITTED with `source: "user"`. Response 201 with the incident object (reporter variant). Errors: 415 `UNSUPPORTED_FILE_TYPE`, 413 `UPLOAD_TOO_LARGE`, 400 `VALIDATION_ERROR`.

### 6.3 GET `/api/incidents` (admin)

Query: `status`, `category`, `severity`, `priority` (`UNASSIGNED` selects null), `source`, `riskLevel` (`NONE` selects incidents without an estimate), `from`, `to` (on `createdAt`), `q` (case-insensitive substring over title, description and address), `page`, `limit`, `sort` (`createdAt`, `updatedAt`, `priority`, `status`, `severity`; default `-createdAt`). Admin variant. `meta`: pagination.

### 6.4 GET `/api/incidents/mine` (signed-in)

Same query as 6.3 without `q`, `source`, `riskLevel`. Only the caller's incidents, reporter variant, every status including REJECTED.

### 6.5 GET `/api/incidents/:id` (signed-in)

Privacy variant for the caller. Non-admins requesting a REJECTED incident they did not report get 404.

### 6.6 PATCH `/api/incidents/:id` (owner while SUBMITTED, or admin)

Multipart or JSON. Owner may change `title`, `description`, `severity`, `category`, `latitude`, `longitude`, `address`, `image`; send `removeImage=true` to delete the image. Admin may change the same fields at any status plus `adminNote`. `status` and `priority` in the body are rejected with 400 `VALIDATION_ERROR` pointing at the dedicated endpoints. A citizen editing an incident that is no longer SUBMITTED gets 403 `FORBIDDEN`; a citizen editing someone else's incident gets 404.

### 6.7 DELETE `/api/incidents/:id` (admin)

Deletes the document and its image file. Response `{ "success": true, "data": { "id": "..." } }`.

### 6.8 PATCH `/api/incidents/:id/status` (admin)

Body `{ "status", "note"? }`. 409 `INVALID_TRANSITION` with `details: [{ from, to, allowed }]` on a disallowed move; 400 `NOTE_REQUIRED` when rejecting without a note. Returns the full incident (admin variant).

### 6.9 PATCH `/api/incidents/:id/priority` (admin)

Body `{ "priority": "HIGH" | "CRITICAL" | "MEDIUM" | "LOW" | null, "note"? }`. Returns the full incident.

## 7. Analytics

Admin analytics accept optional `from`, `to` and `includeSeed` (default `true`). Count definitions are identical everywhere: `pendingVerification` = SUBMITTED + UNDER_REVIEW; `verified` = VERIFIED only; `active` = VERIFIED + IN_PROGRESS; `highPriorityOpen` = priority HIGH or CRITICAL and status not RESOLVED or REJECTED.

### GET `/api/analytics/public` (none)

`data`: `{ reportsFiled, reportsResolved, reportsLast30Days, resolvedLast30Days, generatedAt }`. Excludes REJECTED incidents and seed records. Cached for 5 minutes.

### GET `/api/analytics/mine` (signed-in)

`data`: `{ total, pending, active, resolved, rejected }` for the caller's own reports.

### GET `/api/analytics/summary` (admin)

```json
{
  "success": true,
  "data": {
    "total": 143, "pendingVerification": 22, "verified": 30, "active": 48, "resolved": 61, "rejected": 12, "highPriorityOpen": 9,
    "byStatus": { "SUBMITTED": 14, "UNDER_REVIEW": 8, "VERIFIED": 30, "IN_PROGRESS": 18, "RESOLVED": 61, "REJECTED": 12 },
    "seedCount": 80
  },
  "meta": { "from": null, "to": null, "includeSeed": true }
}
```

### GET `/api/analytics/breakdown?by=category|status|priority|severity|riskLevel` (admin)

`data`: array of `{ key, label, count, color? }` sorted by count descending. Null priority is reported as `UNASSIGNED`; incidents without a risk estimate as `NONE`. `color` is present for category (from the category config) and may be present for the others.

### GET `/api/analytics/timeline?granularity=day|week|month&from=&to=` (admin)

`data`: `[{ "period": "2026-08-01", "count": 3 }, ...]` with gaps filled with zero; `meta`: `{ granularity, timezone, from, to }`. Defaults: last 30 days for `day`, last 26 weeks for `week`, last 12 months for `month`. `period` is `YYYY-MM-DD` for day and week (Monday), `YYYY-MM` for month. Timezone from `ANALYTICS_TIMEZONE` (default `Asia/Kolkata`).

## 8. Map (GIS)

### GET `/api/map/incidents` (none)

Query: `status`, `category`, `severity`, `priority` (admin only), `riskLevel`, `source`, `from`, `to`, `bbox=minLng,minLat,maxLng,maxLat`, `limit` (1 to 5000, default 5000). Callers without an admin token never receive REJECTED incidents (a `status` filter containing REJECTED is silently reduced). When more incidents match than `limit`, the newest `limit` are returned and `meta.truncated` is `true`. GeoJSON FeatureCollection:

```json
{
  "success": true,
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [78.3814, 17.4483] },
        "properties": { "id": "...", "title": "...", "category": "POTHOLE", "severity": "HIGH", "status": "VERIFIED", "verification": "VERIFIED", "priority": "HIGH", "riskLevel": "MEDIUM", "createdAt": "...", "address": "...", "source": "user", "hasImage": true }
      }
    ]
  },
  "meta": { "count": 1, "truncated": false, "seedCount": 0 }
}
```

`priority` and `riskLevel` are `null` in the properties for non-admin callers.

### GET `/api/map/hotspots` (admin)

Query: `eps` metres (50 to 2000, default 200), `minSamples` (3 to 20, default 4), `category`, `status`, `from`, `to`. Non-rejected incidents are used unless `status` is given. Cached on the backend for 10 minutes per parameter set.

```json
{
  "success": true,
  "data": {
    "clusters": [
      { "id": 0, "centroid": { "latitude": 17.4479, "longitude": 78.3821 }, "radiusMeters": 140, "count": 7, "dominantCategory": "POTHOLE", "categoryCounts": { "POTHOLE": 5, "ROAD_DAMAGE": 2 }, "memberIds": ["..."] }
    ],
    "noiseIds": ["..."],
    "totalPoints": 132
  },
  "meta": { "eps": 200, "minSamples": 4, "computedAt": "...", "cached": true, "algorithm": "DBSCAN (haversine)" }
}
```

With fewer than `minSamples` points the response has zero clusters. 503 `ML_UNAVAILABLE` when the ML service cannot be reached.

## 9. ML proxy (admin)

The browser never calls the ML service; everything goes through these routes. Every response about a risk level carries the sentence in `disclaimer` and the `isDemoModel` flag from the artifacts, so the UI can label predictions honestly.

### GET `/api/ml/model-info`

Cached for 10 minutes. `data` is the ML service's `/model/info` converted to camelCase:

```json
{
  "modelName": "RandomForestClassifier",
  "modelVersion": "demo-rf-1.0.0",
  "trainedAt": "...",
  "isDemoModel": true,
  "dataset": { "name": "...", "isDemoData": true, "source": "...", "url": null, "accessDate": null, "licence": "...", "records": 6000, "trainRecords": 4800, "testRecords": 1200, "targetDefinition": "...", "geographicCoverage": "...", "temporalCoverage": "...", "limitations": ["..."] },
  "preprocessing": ["..."],
  "features": [
    { "name": "hour", "label": "Hour of day", "type": "integer", "min": 0, "max": 23, "description": "..." },
    { "name": "day_of_week", "label": "Day of week", "type": "categorical", "values": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] }
  ],
  "classes": ["LOW", "MEDIUM", "HIGH"],
  "classDistribution": { "train": { "LOW": 0, "MEDIUM": 0, "HIGH": 0 }, "test": { "LOW": 0, "MEDIUM": 0, "HIGH": 0 } },
  "metrics": { "accuracy": 0, "macroF1": 0, "weightedF1": 0, "perClass": { "LOW": { "precision": 0, "recall": 0, "f1": 0, "support": 0 } } },
  "confusionMatrix": { "labels": ["LOW", "MEDIUM", "HIGH"], "matrix": [[0, 0, 0], [0, 0, 0], [0, 0, 0]] },
  "featureImportance": [{ "feature": "speed_limit", "importance": 0, "method": "permutation" }],
  "comparison": [{ "model": "MajorityClass", "accuracy": 0, "macroF1": 0 }, { "model": "LogisticRegression", "accuracy": 0, "macroF1": 0 }],
  "researchModel": { "features": ["..."], "metrics": { "accuracy": 0, "macroF1": 0 }, "note": "..." },
  "hotspotDefaults": { "epsMeters": 200, "minSamples": 4 },
  "disclaimer": "..."
}
```

All numbers come from `metrics.json` written by an actual training run. The shipped model's feature schema (fixed for this project; the ML service publishes it and the backend validates against it):

| Feature | Type | Values / range |
|---|---|---|
| `hour` | integer | 0 to 23 |
| `day_of_week` | categorical | MON, TUE, WED, THU, FRI, SAT, SUN |
| `month` | integer | 1 to 12 |
| `light_conditions` | categorical | DAYLIGHT, DARK_LIT, DARK_UNLIT |
| `weather` | categorical | CLEAR, RAIN, FOG, OTHER |
| `road_surface` | categorical | DRY, WET, FLOODED |
| `road_type` | categorical | HIGHWAY, ARTERIAL, LOCAL, JUNCTION |
| `speed_limit` | integer | 20 to 120 (km/h) |
| `area_type` | categorical | URBAN, RURAL |
| `category` | categorical | the ten incident categories |

### POST `/api/ml/estimate-risk`

Body `{ "features": { "hour": 18, "day_of_week": "FRI", "month": 11, "light_conditions": "DARK_LIT", "weather": "RAIN", "road_surface": "WET", "road_type": "ARTERIAL", "speed_limit": 60, "area_type": "URBAN", "category": "ACCIDENT" } }`. All ten features required. Response:

```json
{
  "success": true,
  "data": {
    "riskLevel": "HIGH",
    "probabilities": { "LOW": 0.12, "MEDIUM": 0.33, "HIGH": 0.55 },
    "modelVersion": "demo-rf-1.0.0",
    "isDemoModel": true,
    "contributions": [{ "feature": "speed_limit", "value": 60, "effect": 0.18 }],
    "disclaimer": "Estimate from historical data; not a prediction that an incident will occur."
  }
}
```

`contributions` is a local sensitivity measure: for each feature, the change in the probability of the predicted class when that feature is replaced by its training-set baseline (mode for categorical, median for numeric). Positive values pushed the estimate towards the predicted class. It is not SHAP and the UI says "contributing factors (sensitivity)".

### GET `/api/ml/incidents/:id/risk`

Derives the feature vector from the incident: `hour`, `day_of_week`, `month` from `createdAt` in `ANALYTICS_TIMEZONE`; `light_conditions` = DAYLIGHT when 6 <= hour < 18, else DARK_LIT (assumed); `category` from the incident; `road_surface` = FLOODED when the category is WATERLOGGING, else DRY (assumed); `weather` CLEAR, `road_type` LOCAL, `speed_limit` 40, `area_type` URBAN (assumed defaults, because SmartRoad does not collect them). Query overrides are accepted for any of the ten features (`?weather=RAIN&road_type=HIGHWAY`). `?refresh=true` bypasses the stored estimate. Stores the result in `incident.riskEstimate` when no overrides are given. Response: the estimate-risk `data` plus `features` (the vector used) and `assumedFeatures` (names that were defaulted, not measured).

### POST `/api/ml/risk/refresh`

Batch-estimates every non-rejected incident (cap 5000, newest first) with the derived features above, stores `riskEstimate` on each, and returns `{ "estimated": 132, "skipped": 0, "modelVersion": "...", "byLevel": { "LOW": 70, "MEDIUM": 44, "HIGH": 18 }, "finishedAt": "..." }`.

### GET `/api/ml/risk/distribution`

`data`: `{ "byLevel": { "LOW": 70, "MEDIUM": 44, "HIGH": 18, "NONE": 12 }, "total": 144, "estimated": 132, "modelVersions": ["demo-rf-1.0.0"], "lastEstimatedAt": "...", "isDemoModel": true }` computed from stored estimates (no ML call). `NONE` counts incidents with no estimate yet.

## 10. Internal ML service API (backend to FastAPI)

Header `X-API-Key: <ML_SERVICE_API_KEY>` is required whenever the ML service was started with `ML_API_KEY` set; when both sides leave it empty (local development) the check is skipped and the service logs a warning. snake_case throughout; the backend converts to camelCase.

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/health` | | `{ "status": "ok", "model_loaded": true, "model_version": "...", "is_demo_model": true }` |
| GET | `/model/info` | | The section 9 model-info object in snake_case |
| POST | `/estimate/risk` | `{ "features": { ... } }` | `{ "risk_level", "probabilities", "model_version", "is_demo_model", "contributions": [{ "feature", "value", "effect" }], "disclaimer" }` |
| POST | `/estimate/risk/batch` | `{ "items": [{ "id": "...", "features": { ... } }] }` (max 5000) | `{ "model_version", "is_demo_model", "results": [{ "id", "risk_level", "probabilities" }] }` |
| POST | `/hotspots` | `{ "points": [{ "id": "...", "lat": 17.4, "lng": 78.3 }], "eps_m": 200, "min_samples": 4 }` (max 20000 points) | `{ "clusters": [{ "id", "centroid": { "lat", "lng" }, "radius_m", "count", "member_ids" }], "noise_ids": [], "params": { "eps_m", "min_samples", "algorithm": "DBSCAN (haversine)" }, "total_points" }` |

Pydantic rejects malformed input with 422, which the backend maps to 502 `ML_ERROR` (a malformed internal request is a backend bug). Connection failures and timeouts map to 503 `ML_UNAVAILABLE`. When the ML service has no trained artifacts, `/health` reports `model_loaded: false`, `/model/info` and `/estimate/*` return 503 with `{ "detail": "Model artifacts not found. Run the training pipeline first." }`, and `/hotspots` keeps working (DBSCAN needs no trained model).

## 11. Example error responses

```json
{ "success": false, "error": { "code": "INVALID_TRANSITION", "message": "Cannot move an incident from RESOLVED to VERIFIED.", "details": [{ "from": "RESOLVED", "to": "VERIFIED", "allowed": ["IN_PROGRESS"] }] } }
```

```json
{ "success": false, "error": { "code": "ML_UNAVAILABLE", "message": "The ML service is not reachable. Reporting and management continue to work.", "details": [] } }
```
