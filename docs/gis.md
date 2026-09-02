# SmartRoad GIS layer

The GIS layer is built on Leaflet 1.9, react-leaflet 5 and OpenStreetMap tiles, with MongoDB's 2dsphere index on the server. OpenStreetMap supplies the base map and reverse geocoding only; SmartRoad has no traffic feed of any kind.

## 1. Data representation

Incident locations are stored as GeoJSON points:

```json
"location": { "type": "Point", "coordinates": [78.4867, 17.3850] }
```

GeoJSON order is `[longitude, latitude]`, which is the most common source of map bugs. Therefore:

- Incident objects in the API expose named `latitude` and `longitude` fields and never the raw array. Conversion happens only in `backend/src/lib/geo.ts` (`toPoint`, `fromPoint`).
- Only `GET /api/map/incidents` returns GeoJSON (a FeatureCollection), because Leaflet consumes it directly and handles the order itself.
- Viewport queries use `$geoWithin` with a `$geometry` polygon built from the bounding box (`bboxToPolygon`), because the `$box` shorthand only works with the legacy 2d index.

## 2. Server endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/map/incidents` | Filtered GeoJSON features (status, category, severity, priority and risk level for admins, source, date range, `bbox`, `limit` up to 5000). Non-admin callers never receive REJECTED incidents and get `priority: null` and `riskLevel: null`. `meta.truncated` tells the client to zoom in; `meta.seedCount` lets the UI say "includes demo data". |
| `GET /api/map/hotspots` | DBSCAN clusters computed by the ML service from non-rejected incident coordinates (section 5). |
| `GET /api/meta/enums` | Default map centre and zoom (`MAP_CENTER_LAT`, `MAP_CENTER_LNG`, `MAP_ZOOM`, Hyderabad by default). |
| `GET /api/meta/categories` | Category colours used by markers, legend and charts, so they can never disagree. |

## 3. Reusable map components (frontend)

All map components live in `frontend/src/components/map/` and are page-agnostic; pages pass data and callbacks.

| Component | Role |
|---|---|
| `MapCanvas` | `MapContainer` with the tile layer from `VITE_TILE_URL` and the attribution from `VITE_TILE_ATTRIBUTION`, default centre and zoom from the API, size invalidation on mount and resize. |
| `IncidentMarkers` | One `CircleMarker` per GeoJSON feature (no icon images, so no asset path problems), colour by category, severity, status or risk, optional clustering with `react-leaflet-cluster`, popup with title, badges, date, address and an optional details link, selection callback. |
| `Legend` | Reads the same colour sources as the markers (category colours from the API, the others from `constants/colors.ts`). |
| `MapFilters` | Category and status multi-select, severity, priority and risk level (admin), date range, colour-by toggle; state is controlled by the page and kept in the URL. |
| `LocationPicker` | Click-to-place draggable marker, "use my location" via the browser geolocation API with a permission-denied fallback, coordinate inputs kept in sync both ways, reverse geocoding through `useReverseGeocode` (Nominatim `/reverse?format=jsonv2`, debounced to stay under one request per second, cached per session, editable result, graceful failure). |
| `MiniMap` | Single marker, non-interactive, used on details pages and the landing preview. |
| `HotspotLayer` | One `Circle` per cluster (centroid, radius) with a count tooltip; noise points drawn muted; click callback to fly to a cluster. |
| `MapStatusBar` | Count shown, "zoom in to see all" when truncated, "includes demo data" when seed records are present, ML unavailable notice for hotspots. |

## 4. Pages that use the layer

| Page | Behaviour |
|---|---|
| `/map` (public) | Full-height map, filters in the URL, clustering, popups with a details link for signed-in users, admin hotspot toggle. After the API reports truncation once, the page refetches with the viewport `bbox` on `moveend` (debounced). |
| `/app/report`, `/app/reports/:id/edit` | `LocationPicker` inside the incident form. |
| `/app/reports/:id`, `/admin/incidents/:id` | `MiniMap` with the incident location. |
| `/admin` | Compact map with markers and a hotspot toggle. |
| `/admin/map` | Map with all filters including risk level, `HotspotLayer`, parameter panel (eps, minSamples, category, date range) and a cluster table. |
| `/` | Read-only preview of the latest public incidents. |

## 5. Hotspot analysis with DBSCAN

DBSCAN (Ester, Kriegel, Sander and Xu, 1996) was chosen because it does not need the number of clusters in advance, finds clusters of any shape and labels sparse points as noise, which is exactly the "isolated report versus recurring problem area" distinction the map needs.

- Input: `[lat, lng]` of non-rejected incidents (optionally filtered by category, status and date range), capped at 20,000 points.
- Distance: haversine. scikit-learn's `DBSCAN(metric="haversine")` works on radians, so `eps` in metres is divided by the Earth radius (6,371,000 m).
- Parameters: `eps` 50 to 2000 m (default 200 m) and `min_samples` 3 to 20 (default 4). 200 m is roughly a block in a dense city, so reports of the same stretch of road fall into one cluster while reports two blocks apart do not; `min_samples = 4` is the usual choice for two-dimensional data in the original paper (k = 4 for the k-distance heuristic) and keeps a pair of coincidental reports from becoming a hotspot. Administrators can change both on the hotspot page and see the effect.
- Output per cluster from the ML service: id, centroid (mean of member coordinates), radius (maximum haversine distance from the centroid to a member, floored at 30 m for visibility), member count, member incident ids; plus the list of noise ids. The backend adds the dominant category and category counts per cluster by looking up the member ids it already fetched; the ML service never sees categories.
- Caching: the backend caches each parameter set for ten minutes, so panning the map does not recompute clusters.
- Small data: with fewer than `min_samples` points the response has no clusters and the UI says "not enough data for hotspots".
- Wording: the UI and documentation call these "clusters of reported incidents". They describe where reports are dense; they are not an output of the risk classifier and are not weighted by severity in this version.

The demo seed set includes several deliberate clusters (5 to 9 incidents within about 150 m) and isolated points, so the default parameters find clusters and label noise during a demonstration.

## 6. Usage terms

- Map tiles carry the OpenStreetMap attribution; the tile URL is configurable so a different provider can be used under heavier traffic.
- Nominatim usage follows the published policy: at most one request per second (debounced), results cached, an identifying Referer (browsers send it automatically), and a configurable URL.
