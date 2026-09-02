# SmartRoad Phase 1: REST API contract

Document 04 of 06, Phase 1 deliverable. Version 0.1, draft for team review, 1 September 2026.

This is the contract between the React frontend and the Express backend, plus the internal contract between the backend and the Python ML service. Phase 2 implements the foundation and Phases 3 to 9 fill in the endpoints in the order listed in `06-project-plan.md`. Endpoints listed in the brief but not adopted are explained in section 9.

## 1. Conventions

- Base path `/api`. No version prefix; if a breaking change is ever needed, `/api/v2` is added then.
- JSON request and response bodies, UTF-8, except `POST /api/incidents` and `PATCH /api/incidents/:id`, which accept `multipart/form-data` because of the image.
- Authentication: `Authorization: Bearer <jwt>`. Access levels used in this document: `none` (no token needed), `signed-in` (any valid token, citizen or admin), `admin` (token with role `admin`). These are access levels, not role names; the stored roles are `citizen` and `admin`.
- Success envelope:

```json
{ "success": true, "data": { }, "meta": { } }
```

- Error envelope (every error, including 404 and 500):

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [ { "field": "latitude", "message": "Must be between -90 and 90" } ]
  }
}
```

- Error codes: `VALIDATION_ERROR` (400), `NOTE_REQUIRED` (400), `UNAUTHENTICATED` (401), `INVALID_CREDENTIALS` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `EMAIL_TAKEN` (409), `INVALID_TRANSITION` (409), `UPLOAD_TOO_LARGE` (413), `UNSUPPORTED_FILE_TYPE` (415), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500), `ML_ERROR` (502, the ML service answered but with an error or a malformed body), `ML_UNAVAILABLE` (503, the ML service could not be reached or timed out).
- Pagination on list endpoints: query `page` (default 1) and `limit` (default 20, max 100); `meta` returns `{ page, limit, total, totalPages }`. The map endpoint is not paginated and has its own `limit` (section 7).
- Sorting: `sort` query, for example `sort=-createdAt` (descending) or `sort=priority`. Allowed fields are listed per endpoint; anything else is a validation error. `priority` and `severity` sort in rank order (LOW, MEDIUM, HIGH, CRITICAL), not alphabetically; unassigned priority sorts last.
- Multi-valued filters (`status`, `category`, `severity`, `priority`, `source`) accept comma-separated values, for example `status=REPORTED,UNDER_REVIEW`.
- Dates in query strings and bodies: ISO 8601 (`2026-09-01` or `2026-09-01T00:00:00Z`). Responses always use full ISO timestamps in UTC.
- Ids are ObjectId strings. Malformed ids return 400 `VALIDATION_ERROR`, unknown ids 404 `NOT_FOUND`.
- Enum values are the keys from `01-requirements.md` section 7, uppercase where shown.
- Unknown body fields are ignored (stripped), never stored.
- CORS: only origins in `CORS_ORIGIN`.
- Rate limits (defaults, configurable): `POST /api/auth/login` and `POST /api/auth/register` 10 requests per 15 minutes per IP (`GET /api/auth/me` is deliberately not limited because every app start calls it); `POST /api/incidents` 20 per hour per user; global 300 per 15 minutes per IP. In deployment the app sets `trust proxy` so the limits see the client address rather than the platform's proxy.

## 2. Endpoint summary

| Method | Path | Access | Purpose | Phase |
|---|---|---|---|---|
| GET | `/api/health` | none | Liveness plus DB and ML connectivity | 2 |
| GET | `/api/meta/categories` | none | Category keys, labels and colours | 2 |
| GET | `/api/meta/enums` | none | Severities, priorities, statuses, allowed transitions, map defaults, upload limits | 2 |
| POST | `/api/auth/register` | none | Create a citizen account | 3 |
| POST | `/api/auth/login` | none | Obtain a JWT | 3 |
| GET | `/api/auth/me` | signed-in | Current user profile from the token | 3 |
| PATCH | `/api/users/me` | signed-in | Update name, phone | 3 |
| PATCH | `/api/users/me/password` | signed-in | Change password | 3 |
| POST | `/api/incidents` | signed-in | Report an incident (multipart) | 4 |
| GET | `/api/incidents` | admin | List all incidents with filters, search and sort | 4 |
| GET | `/api/incidents/mine` | signed-in | The caller's own reports | 4 |
| GET | `/api/incidents/:id` | signed-in | One incident (privacy rules apply) | 4 |
| PATCH | `/api/incidents/:id` | signed-in (owner while REPORTED) or admin | Edit fields (multipart if image) | 4 |
| DELETE | `/api/incidents/:id` | admin | Delete permanently | 5 |
| PATCH | `/api/incidents/:id/status` | admin | Change status with optional note | 5 |
| PATCH | `/api/incidents/:id/priority` | admin | Set priority | 5 |
| GET | `/api/analytics/public` | none | Landing page figures | 5 |
| GET | `/api/analytics/mine` | signed-in | Citizen dashboard counts | 5 |
| GET | `/api/analytics/summary` | admin | Admin dashboard counts | 5 |
| GET | `/api/analytics/breakdown` | admin | Counts by category, status or priority | 7 |
| GET | `/api/analytics/timeline` | admin | Counts over time | 7 |
| GET | `/api/map/incidents` | none | GeoJSON incidents for the map | 6 |
| GET | `/api/map/hotspots` | admin (may open to signed-in users later) | DBSCAN clusters | 9 |
| GET | `/api/ml/model-info` | admin | Dataset card, metrics, feature schema | 8 |
| POST | `/api/ml/estimate-risk` | admin | Risk estimate for feature values | 8 |
| GET | `/uploads/:filename` | none | Static image files | 4 |

## 3. Auth and users

### POST `/api/auth/register`

Body: `{ "name": "Priya Sharma", "email": "priya@example.com", "password": "correct horse battery" }`

Rules: name 2 to 80 chars; email valid, unique (409 `EMAIL_TAKEN`); password 8 to 72 chars (bcrypt limit). `role` in the body is ignored. Response 201:

```json
{ "success": true, "data": { "token": "<jwt>", "user": { "id": "...", "name": "Priya Sharma", "email": "priya@example.com", "role": "citizen" } } }
```

### POST `/api/auth/login`

Body: `{ "email": "...", "password": "..." }`. Response 200 with the same shape as register. Wrong email or password both return 401 `INVALID_CREDENTIALS` with the same message. Inactive users get 403 `FORBIDDEN`.

JWT payload: `{ "sub": "<userId>", "role": "citizen", "iat": ..., "exp": ... }`, expiry from `JWT_EXPIRES_IN` (default `24h`).

### GET `/api/auth/me`

Response: `{ "success": true, "data": { "id", "name", "email", "role", "phone", "createdAt" } }`. Used on app start to restore the session from a stored token; an expired token yields 401 and the SPA clears it.

### PATCH `/api/users/me`, PATCH `/api/users/me/password`

Profile reads use `GET /api/auth/me`; there is no separate `GET /api/users/me`. PATCH body: any of `{ "name", "phone" }`. Password body: `{ "currentPassword", "newPassword" }`; wrong current password returns 401 `INVALID_CREDENTIALS`. Responses return the profile object as in `GET /api/auth/me`.

## 4. Meta

### GET `/api/meta/categories`

```json
{ "success": true, "data": [ { "key": "POTHOLE", "label": "Pothole", "color": "#D97706" }, { "key": "ACCIDENT", "label": "Accident", "color": "#DC2626" } ] }
```

Colours are served with the categories so the map legend, markers and charts all use the same palette from one place.

### GET `/api/meta/enums`

```json
{
  "success": true,
  "data": {
    "severities": ["LOW", "MEDIUM", "HIGH"],
    "priorities": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    "statuses": ["REPORTED", "UNDER_REVIEW", "VERIFIED", "IN_PROGRESS", "RESOLVED", "REJECTED"],
    "transitions": { "REPORTED": ["UNDER_REVIEW", "REJECTED"], "UNDER_REVIEW": ["VERIFIED", "REJECTED"], "VERIFIED": ["IN_PROGRESS", "RESOLVED", "REJECTED"], "IN_PROGRESS": ["RESOLVED"], "RESOLVED": ["IN_PROGRESS"], "REJECTED": ["UNDER_REVIEW"] },
    "map": { "center": { "latitude": 17.385, "longitude": 78.4867 }, "zoom": 12 },
    "upload": { "maxBytes": 5242880, "mimeTypes": ["image/jpeg", "image/png", "image/webp"] }
  }
}
```

## 5. Incidents

### 5.1 Incident object (full, as seen by an admin or the reporter)

```json
{
  "id": "66d5a2b8c2b7a4e8f1a2b3d0",
  "title": "Deep pothole near Hitec City flyover",
  "description": "...",
  "category": "POTHOLE",
  "severity": "HIGH",
  "priority": "HIGH",
  "status": "VERIFIED",
  "latitude": 17.4483,
  "longitude": 78.3814,
  "address": "Hitec City Main Road, Madhapur, Hyderabad",
  "image": { "url": "/uploads/3f9c2e1a7b8d4c5e.jpg", "mimeType": "image/jpeg", "size": 734221 },
  "reportedBy": { "id": "...", "name": "Priya Sharma", "email": "priya@example.com" },
  "verifiedBy": { "id": "...", "name": "Admin One" },
  "adminNote": "Confirmed by site photo. Scheduled for patching.",
  "statusHistory": [ { "field": "status", "from": "REPORTED", "to": "UNDER_REVIEW", "note": null, "changedBy": { "id": "...", "name": "Admin One" }, "at": "2026-09-14T15:40:00.000Z" } ],
  "source": "user",
  "resolvedAt": null,
  "createdAt": "2026-09-14T10:02:11.000Z",
  "updatedAt": "2026-09-15T08:05:30.000Z"
}
```

Privacy variants produced by the serializer (this table is the single source of truth; `03-database-schema.md` points here):

| Viewer | `reportedBy` | `reportedBy.email` | `verifiedBy` | `adminNote` and history notes | `statusHistory[].changedBy` |
|---|---|---|---|---|---|
| Admin | `{ id, name, email }` | yes | `{ id, name }` | yes | `{ id, name }` |
| The reporter | own `{ id, name }` | no | `null` (admin identity hidden) | yes | `null` |
| Other signed-in citizen | `null` | no | `null` | omitted | `null` |

### 5.2 POST `/api/incidents` (signed-in)

`multipart/form-data` fields: `title`, `category`, `description`, `severity`, `latitude`, `longitude`, `address` (optional), `image` (optional file). Validation as in FR-R1 and FR-R4. Response 201 with the incident object. Error examples: 415 `UNSUPPORTED_FILE_TYPE`, 413 `UPLOAD_TOO_LARGE`, 400 `VALIDATION_ERROR` with `details`.

### 5.3 GET `/api/incidents` (admin)

Query filters: `status`, `category`, `severity`, `priority` (`UNASSIGNED` selects null), `source` (all comma-separated), `from`, `to` (on `createdAt`), `q` (case-insensitive substring search over title, description and address, D-22), `page`, `limit`, `sort` (allowed: `createdAt`, `updatedAt`, `priority`, `status`, `severity`). Objects are in the admin variant. Response:

```json
{ "success": true, "data": [ { "...incident" } ], "meta": { "page": 1, "limit": 20, "total": 143, "totalPages": 8 } }
```

### 5.4 GET `/api/incidents/mine` (signed-in)

Same query options as 5.3 minus `q` and `source`; returns only the caller's incidents in the reporter variant, all statuses including REJECTED.

### 5.5 GET `/api/incidents/:id` (signed-in)

Returns the privacy variant for the caller. Non-admins requesting a REJECTED incident they did not report get 404.

### 5.6 PATCH `/api/incidents/:id` (owner while REPORTED, or admin)

Multipart or JSON. Owner may change `title`, `description`, `severity`, `latitude`, `longitude`, `address`, `image` (send `removeImage=true` to delete). Admin may additionally change `category` and `adminNote`. `status` and `priority` in the body are rejected with 400 `VALIDATION_ERROR` and a `details` entry pointing to the dedicated endpoints (they are not silently stripped like unknown fields, because silently ignoring them would hide a UI bug). A citizen editing a non-REPORTED incident gets 403 `FORBIDDEN`.

### 5.7 DELETE `/api/incidents/:id` (admin)

Deletes the document and its image file. Response 200 `{ "success": true, "data": { "id": "..." } }`.

### 5.8 PATCH `/api/incidents/:id/status` (admin)

Body: `{ "status": "VERIFIED", "note": "optional" }`. Server checks the transition table; on failure 409 `INVALID_TRANSITION` with `details: [{ "from": "RESOLVED", "to": "VERIFIED" }]`. `note` is required when `status` is `REJECTED` (400 `NOTE_REQUIRED`). Side effects: history entry, `verifiedBy` on first VERIFIED, `resolvedAt` set on RESOLVED and cleared on reopen, `adminNote` replaced when a note is given and cleared when a REJECTED incident moves back to UNDER_REVIEW. Response: full incident.

### 5.9 PATCH `/api/incidents/:id/priority` (admin)

Body: `{ "priority": "HIGH", "note": "optional" }` or `{ "priority": null }` to unassign. Appends a history entry with `field: "priority"`. Response: full incident.

## 6. Analytics

Admin analytics endpoints accept optional `from` and `to` (ISO dates; when omitted, `summary` and `breakdown` cover all time and `timeline` uses the per-granularity defaults below) and `includeSeed` (default `true`; the dashboard shows a note when seed data is included). Count definitions are identical everywhere: `pending` = REPORTED + UNDER_REVIEW; `verified` = VERIFIED only; `active` = VERIFIED + IN_PROGRESS.

### GET `/api/analytics/public` (none)

```json
{ "success": true, "data": { "reportsFiled": 71, "reportsResolved": 30, "reportsLast30Days": 14, "resolvedLast30Days": 6, "generatedAt": "..." } }
```

Counts exclude REJECTED incidents and seed records, so they are always real reports (FR-D5). Cached for 5 minutes on the server. Example values are illustrative.

### GET `/api/analytics/mine` (signed-in)

```json
{ "success": true, "data": { "total": 6, "pending": 2, "active": 1, "resolved": 2, "rejected": 1 } }
```

### GET `/api/analytics/summary` (admin)

```json
{
  "success": true,
  "data": {
    "total": 143,
    "pendingVerification": 22,
    "verified": 30,
    "active": 48,
    "resolved": 61,
    "rejected": 12,
    "highPriorityOpen": 9,
    "byStatus": { "REPORTED": 14, "UNDER_REVIEW": 8, "VERIFIED": 30, "IN_PROGRESS": 18, "RESOLVED": 61, "REJECTED": 12 }
  },
  "meta": { "from": null, "to": null, "includeSeed": true }
}
```

`verified` counts VERIFIED only and `active` counts VERIFIED + IN_PROGRESS (so `active` includes `verified`; the dashboard card says so); `highPriorityOpen` = priority HIGH or CRITICAL and status not RESOLVED or REJECTED. In the example, 30 + 18 = 48.

### GET `/api/analytics/breakdown?by=category|status|priority` (admin)

```json
{ "success": true, "data": [ { "key": "POTHOLE", "label": "Pothole", "count": 41 }, { "key": "UNASSIGNED", "label": "Unassigned", "count": 19 } ] }
```

### GET `/api/analytics/timeline?granularity=day|week|month&from=&to=` (admin)

```json
{ "success": true, "data": [ { "period": "2026-08-01", "count": 3 }, { "period": "2026-08-02", "count": 0 } ], "meta": { "granularity": "day", "timezone": "Asia/Kolkata" } }
```

Default range: last 30 days for `day`, last 26 weeks for `week`, last 12 months for `month`. `period` is `YYYY-MM-DD` for `day`, the Monday of the week as `YYYY-MM-DD` for `week` (`$dateTrunc` with `startOfWeek: "monday"`), and `YYYY-MM` for `month`. Gaps are filled with zero.

## 7. Map

### GET `/api/map/incidents` (none)

Query: `status`, `category`, `severity`, `priority` (admin only), `source`, `from`, `to`, `bbox=minLng,minLat,maxLng,maxLat`, and `limit` (1 to 5,000, default 5,000; no `page`). Callers without an admin token never receive REJECTED incidents (a `status` filter containing REJECTED is silently reduced) and cannot filter by priority. When more incidents match than `limit`, the newest `limit` are returned, `meta.truncated = true`, and the client is expected to zoom in (FR-G6). `meta.seedCount` says how many of the returned features are seed records so the page can show a "includes demo data" caption. Response is a GeoJSON FeatureCollection so Leaflet can consume it directly:

```json
{
  "success": true,
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [78.3814, 17.4483] },
        "properties": { "id": "...", "title": "Deep pothole near Hitec City flyover", "category": "POTHOLE", "severity": "HIGH", "status": "VERIFIED", "priority": "HIGH", "createdAt": "...", "address": "...", "source": "user" }
      }
    ]
  },
  "meta": { "count": 1, "truncated": false, "seedCount": 0 }
}
```

### GET `/api/map/hotspots` (admin)

Query: `eps` metres (50 to 2000, default 200), `minSamples` (3 to 20, default 4), `category`, `from`, `to`. The page sends the same `category`, `from` and `to` it used for `/api/map/incidents`, so `noiseIds` can be matched against markers already on the map. `dominantCategory` is computed by the backend from the member incidents; the ML service only receives coordinates. Response:

```json
{
  "success": true,
  "data": {
    "clusters": [
      { "id": 0, "centroid": { "latitude": 17.4479, "longitude": 78.3821 }, "radiusMeters": 140, "count": 7, "dominantCategory": "POTHOLE", "memberIds": ["..."] }
    ],
    "noiseIds": ["..."],
    "totalPoints": 132
  },
  "meta": { "eps": 200, "minSamples": 4, "computedAt": "...", "cached": true, "algorithm": "DBSCAN (haversine)" }
}
```

503 `ML_UNAVAILABLE` when the ML service cannot be reached (502 `ML_ERROR` when it answers with an error); the UI then hides the layer and shows a notice.

## 8. ML proxy (admin)

### GET `/api/ml/model-info`

Proxies the ML service and caches for 10 minutes. The object below shows the shape only; every value, including the model name and version, is whatever the training run wrote:

```json
{
  "success": true,
  "data": {
    "modelName": "<from metrics.json>",
    "modelVersion": "<from metrics.json>",
    "trainedAt": "...",
    "dataset": { "name": "...", "source": "...", "url": "...", "accessDate": "...", "licence": "...", "records": 0, "trainRecords": 0, "testRecords": 0, "targetDefinition": "...", "limitations": ["..."] },
    "preprocessing": ["..."],
    "features": [ { "name": "hour", "type": "integer", "min": 0, "max": 23 }, { "name": "day_of_week", "type": "categorical", "values": ["MON", "..."] } ],
    "classes": ["LOW", "MEDIUM", "HIGH"],
    "classDistribution": { "train": { "LOW": 0, "MEDIUM": 0, "HIGH": 0 }, "test": { "LOW": 0, "MEDIUM": 0, "HIGH": 0 } },
    "metrics": { "accuracy": 0, "macroF1": 0, "perClass": { "LOW": { "precision": 0, "recall": 0, "f1": 0 } } },
    "comparison": [ { "model": "LogisticRegression", "accuracy": 0, "macroF1": 0 } ],
    "researchModel": { "features": ["..."], "metrics": { "accuracy": 0, "macroF1": 0 } },
    "confusionMatrix": { "labels": ["LOW", "MEDIUM", "HIGH"], "matrix": [[0, 0, 0], [0, 0, 0], [0, 0, 0]] },
    "featureImportance": [ { "feature": "hour", "importance": 0, "method": "permutation" } ]
  }
}
```

Zeros and placeholders above show the shape only; the real values come from `metrics.json` after training. `metrics` and `featureImportance` describe the shipped model; `researchModel` carries the research variant's feature list and metrics for the report (see `02-architecture.md` section 6.3). The frontend renders exactly what it receives.

### POST `/api/ml/estimate-risk`

Body: `{ "features": { "hour": 18, "day_of_week": "FRI", "month": 11, "...": "..." } }` validated against `features` from model-info. Response shape (example probabilities are illustrative, not results):

```json
{ "success": true, "data": { "riskLevel": "MEDIUM", "probabilities": { "LOW": 0.31, "MEDIUM": 0.52, "HIGH": 0.17 }, "modelVersion": "<from metrics.json>", "disclaimer": "Estimate from historical data; not a prediction that an incident will occur." } }
```

## 9. Endpoints from the brief that are changed or not adopted

| Brief | Decision | Reason |
|---|---|---|
| `PUT /api/incidents/:id` | Replaced by `PATCH` | D-18: partial updates match the UI; PUT would require every field. |
| `GET /api/analytics/categories` | Generalised to `GET /api/analytics/breakdown?by=category` | One handler serves category, status and priority instead of three near-identical ones. |
| Separate admin login endpoint | Not created; `/api/auth/login` serves both roles | The token carries the role; the admin login page is a frontend variant only (D-04). |
| `DELETE /api/incidents/:id` for citizens | Admin only | D-08. |
| `GET /api/incidents` for citizens | Admin only; citizens use `/api/incidents/mine` and the public map endpoint | No page needs a citizen-facing full list, and a public list would only duplicate the map endpoint with weaker privacy rules. |

## 10. Internal ML service API (backend to FastAPI, `X-API-Key` required)

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/health` | | `{ "status": "ok", "model_loaded": true, "model_version": "..." }` |
| GET | `/model/info` | | Same content as section 8 `data`, in snake_case |
| POST | `/estimate/risk` | `{ "features": { } }` | `{ "risk_level", "probabilities", "model_version" }` |
| POST | `/hotspots` | `{ "points": [ { "id": "...", "lat": 17.4, "lng": 78.3 } ], "eps_m": 200, "min_samples": 4 }` | `{ "clusters": [ { "id", "centroid": { "lat", "lng" }, "radius_m", "count", "member_ids" } ], "noise_ids": [], "params": { } }` |

The ML service uses snake_case throughout (Python convention); the backend converts to camelCase for the browser. Pydantic models on the ML side reject malformed input with 422, which the backend maps to 502 `ML_ERROR` plus a logged detail, because a malformed internal request is a backend bug, not a user error. Connection failures and timeouts map to 503 `ML_UNAVAILABLE`.

## 11. Example error responses

Validation:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed.", "details": [ { "field": "title", "message": "Must be at least 5 characters" }, { "field": "category", "message": "Must be one of ACCIDENT, POTHOLE, ..." } ] } }
```

Transition:

```json
{ "success": false, "error": { "code": "INVALID_TRANSITION", "message": "Cannot move an incident from RESOLVED to VERIFIED.", "details": [ { "from": "RESOLVED", "to": "VERIFIED", "allowed": ["IN_PROGRESS"] } ] } }
```

ML unavailable:

```json
{ "success": false, "error": { "code": "ML_UNAVAILABLE", "message": "The ML service is not reachable. Reporting and management continue to work.", "details": [] } }
```
