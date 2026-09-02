# SmartRoad Phase 1: frontend page structure

Document 05 of 06, Phase 1 deliverable. Version 0.1, draft for team review, 1 September 2026.

React 19 with Vite, react-router, react-leaflet 5, Recharts, react-hook-form with zod, axios (D-23). Plain CSS with design tokens and CSS Modules (D-20). All 14 pages from the brief's page list are kept (Admin login and Profile are thin, see section 2), plus the ML research view that the brief describes separately as the "ML dashboard", an edit page for a citizen's own report, and a not-found page.

## 1. Route map

| Route | Page | Access | Layout |
|---|---|---|---|
| `/` | Landing | everyone | `PublicLayout` (top nav, footer) |
| `/login` | Login | everyone | `PublicLayout` |
| `/register` | Registration | everyone | `PublicLayout` |
| `/admin/login` | Admin login | everyone | `PublicLayout` (admin styling) |
| `/map` | Map view | everyone (more filters and links when signed in) | `PublicLayout` full-height |
| `/app` | Citizen dashboard | citizen, admin | `AppLayout` (side nav on desktop, bottom nav on mobile) |
| `/app/report` | Report incident | citizen, admin | `AppLayout` |
| `/app/reports` | My reports | citizen, admin | `AppLayout` |
| `/app/reports/:id` | Incident details (own report, or another user's non-rejected report) | citizen, admin | `AppLayout` |
| `/app/reports/:id/edit` | Edit incident (own report while REPORTED) | citizen, admin | `AppLayout` |
| `/app/profile` | Profile | citizen, admin | `AppLayout` |
| `/admin` | Admin dashboard | admin | `AdminLayout` |
| `/admin/incidents` | Incident management | admin | `AdminLayout` |
| `/admin/incidents/:id` | Incident details (admin view) | admin | `AdminLayout` |
| `/admin/analytics` | Analytics | admin | `AdminLayout` |
| `/admin/risk-map` | Hotspot map (the brief's "Risk/Hotspot Map"; navigation says "Hotspot map" until per-incident risk labels exist, NFR-13) | admin | `AdminLayout` |
| `/admin/ml` | ML research view | admin | `AdminLayout` |
| `*` | Not found | everyone | `PublicLayout` |

Route guards: `RequireAuth` redirects to `/login` with `returnTo`; `RequireRole("admin")` redirects citizens to `/app` with a message. Guards only hide pages; the API enforces permissions.

## 2. Page-by-page specification

Each page lists its purpose, the endpoints it calls, its main components, and the states it must handle. "States" always includes loading, empty and error unless noted.

### 2.1 Landing (`/`)

Purpose: explain SmartRoad in one screen and lead visitors to register, log in or open the map. Hero with the name and the line "Making Roads Smarter. Making Travel Safer."

Data: `GET /api/analytics/public` for the statistics strip; `GET /api/map/incidents?limit=200` for the preview map (read-only, no popups needed).

Components: `Hero` (headline, two buttons, animated road-network illustration built with inline SVG, no stock template), `StatsStrip` (`reportsFiled`, `reportsResolved`, `reportsLast30Days`, `resolvedLast30Days` with captions; hidden entirely while loading or on error so no fake numbers ever show; real reports only, seed records are excluded by the endpoint), `MiniMap` (Leaflet, non-interactive zoom, category-coloured dots, with the caption "Map includes demo data" when `meta.seedCount` is above zero), `HowItWorks` (three short steps: report, verify, resolve), `RolesSection` (citizen versus administrator), `Footer` with OSM attribution and team names.

Design direction: dark navy background with a light grid suggesting a city map, one accent colour for calls to action, category colours as small glowing dots, generous spacing, one typeface family. Not a corporate template: no stock photos, no three-column icon grid with lorem ipsum.

### 2.2 Login (`/login`) and admin login (`/admin/login`)

Data: `POST /api/auth/login`. On success store the token, load `/api/auth/me`, redirect: admins to `/admin`, citizens to `/app` (or `returnTo`).

Admin login is the same `LoginForm` component rendered inside an admin-styled card with the text "Administrator sign-in". If a citizen account signs in here, show "This account is not an administrator" and offer the citizen area. Reason for keeping the page: D-04.

States: invalid credentials (message under the form, no field hints about which part was wrong), rate limited (429 message with retry hint), network error.

### 2.3 Registration (`/register`)

Data: `POST /api/auth/register`. Fields: name, email, password, confirm password. zod schema mirrors the server rules; password strength hint (length only, no arbitrary symbol rules). Email taken shows an inline message with a link to log in.

### 2.4 Citizen dashboard (`/app`)

Data: `GET /api/analytics/mine`, `GET /api/incidents/mine?limit=5`.

Components: `StatCard` x5 (total, pending, active labelled "Verified and in progress", resolved, rejected), a large primary button "Report an incident", `RecentReportsList` (five rows: title, category chip, status badge, date), an empty state for new users ("You have not reported anything yet") with the same button.

### 2.5 Report incident (`/app/report`)

Data: `GET /api/meta/categories`, `GET /api/meta/enums`, `POST /api/incidents`. Reverse geocoding to Nominatim from the browser.

Components: `IncidentForm` (react-hook-form + zod), `LocationPicker` (Leaflet map with click-to-place draggable marker, "use my location" button, latitude and longitude inputs kept in sync both ways, address field auto-filled and editable), `ImageDropzone` (single file, preview, client-side type and size check, warning text about not photographing people), `SeveritySelect` with one-line descriptions of LOW, MEDIUM and HIGH.

Validation messages (client and server agree): title 5 to 120 characters; description 10 to 2000; category required; severity required; latitude between -90 and 90; longitude between -180 and 180; "Pick a location on the map or enter coordinates"; image type JPEG, PNG or WebP; image at most 5 MB.

States: submitting (button disabled, spinner), success (redirect to My reports with a toast), server validation errors mapped back to fields, upload errors, geolocation denied (fall back to map click).

### 2.6 My reports (`/app/reports`)

Data: `GET /api/incidents/mine` with `status`, `category`, `sort`, `page`.

Components: `FilterBar` (status, category), `IncidentTable` on desktop and `IncidentCardList` on mobile, `StatusBadge`, `SeverityChip`, `PriorityChip` ("Unassigned" when null), `Pagination`.

### 2.7 Incident details (`/app/reports/:id` and `/admin/incidents/:id`)

Data: `GET /api/incidents/:id`; admin actions call `PATCH .../status`, `PATCH .../priority`, `DELETE`, `PATCH /api/incidents/:id`.

Components: `IncidentHeader` (title, badges, dates), `IncidentImage` (lightbox), `IncidentMiniMap` (single marker, centred), `IncidentFacts` (category, severity, priority, address, coordinates, reporter for admins, "Demo data" tag for seed records), `StatusTimeline` (vertical list from `statusHistory`, notes shown where the viewer is allowed), and for admins `StatusChangeForm` (only the transitions allowed from the current status are offered, note textarea, note required when rejecting), `PriorityForm`, `AdminEditForm` (category and admin note, the two fields `PATCH /api/incidents/:id` allows admins to change beyond the reporter's fields), `DangerZone` (delete with confirmation dialog). Citizens see an "Edit" button linking to `/app/reports/:id/edit` only while status is REPORTED.

States: not found (404 page inside the layout), forbidden, transition rejected by the server (show the server message; the form reloads the incident to resync).

### 2.7a Edit incident (`/app/reports/:id/edit`)

Data: `GET /api/incidents/:id` to prefill, `PATCH /api/incidents/:id` (multipart when the image changes, `removeImage=true` to drop it).

Components: `IncidentForm` in edit mode (same validation as the report page), `LocationPicker` prefilled, `ImageDropzone` showing the current image with a remove option. If the incident is no longer REPORTED when the page loads, it shows "This report is under review and can no longer be edited" and links back to the details page.

### 2.8 Map view (`/map`)

Data: `GET /api/map/incidents` with filters and `bbox`; `GET /api/meta/categories` for colours; `GET /api/map/hotspots` when an admin toggles the hotspot layer.

Components: `MapCanvas` (react-leaflet `MapContainer`, tile layer from `VITE_TILE_URL`, attribution), `IncidentMarkers` (circle markers, colour by category or severity, popup with title, chips, date, address, and a "View details" link only for signed-in users because details need an account), `MapFilters` (category multi-select, status multi-select, severity, priority for admins, date range, colour-by toggle), `Legend` (driven by the same colour sources as the markers), `HotspotLayer` (admin only, a simple on/off toggle using the default `eps` and `minSamples`; the parameter controls live on the hotspot map page), `MapStatus` (count shown, "zoom in to see all" when truncated, "includes demo data" when `seedCount` is above zero, "ML service unavailable" when hotspots fail).

Behaviour: filters live in the URL query so a filtered map can be shared; the map refetches on `moveend` with a debounce once truncation has ever been reported, otherwise fetches once per filter change.

### 2.9 Admin dashboard (`/admin`)

Data: `GET /api/analytics/summary`, `GET /api/analytics/breakdown?by=category`, `?by=status`, `?by=priority`, `GET /api/analytics/timeline?granularity=day`, `GET /api/map/incidents?limit=1000`, optionally `GET /api/map/hotspots`.

Components: `StatCard` x7 (total, pending verification, verified, active with the caption "includes verified", resolved, rejected, high-priority open), `CategoryBarChart`, `StatusDonut`, `PriorityBarChart`, `TimelineLineChart` with a range selector (30 days, 26 weeks, 12 months), `DashboardMap` (small map with markers and hotspot toggle), `SeedDataNotice` when `meta.includeSeed` is true and seed records exist. Every number is fetched; there is no default value other than a skeleton.

### 2.10 Incident management (`/admin/incidents`)

Data: `GET /api/incidents` with all admin filters, `q` search, sort and pagination; inline actions call the status and priority endpoints.

Components: `SearchBox` (debounced `q`; case-insensitive substring match over title, description and address, D-22), `FilterBar` (status, category, priority including Unassigned, severity, date range, source), `IncidentTable` with sortable columns limited to what the API sorts (date, severity, priority, status; the other columns are display only), row actions (open, quick status change limited to allowed transitions, set priority), `Pagination`. There are no bulk actions in this version.

### 2.11 Analytics (`/admin/analytics`)

Data: the analytics endpoints with a shared `from`/`to` range and `includeSeed` toggle.

Components: `RangePicker`, `BreakdownChart` (category, status, priority tabs), `TimelineChart` (day, week, month), `ExportButton` (downloads the currently displayed table as CSV generated in the browser, could-have). Charts use category colours from `/api/meta/categories` and status colours from the shared constants.

### 2.12 Hotspot map (`/admin/risk-map`)

Data: `GET /api/map/incidents` and `GET /api/map/hotspots` with the same `category`, `from` and `to`, so noise ids can be matched to loaded markers. If Phase 8 decides per-incident risk labels exist, the incident properties will include `riskLevel` and the page and its navigation label become "Risk and hotspot map".

Components: `MapCanvas` reused from the map view with the hotspot layer on by default, `HotspotList` (table of clusters: id, dominant category, count, radius, centre; clicking flies the map to the cluster), `HotspotParams` (eps, minSamples, category, date range with "recompute"; this is the only page with parameter controls), `MethodNote` (a short paragraph: "Hotspots are density clusters of reported incidents found with DBSCAN. They show where reports concentrate. They are not produced by the risk model.").

Why a separate page from the public map: the public map is for finding incidents; this page is for studying concentrations with parameters an administrator can change. Sharing the map components keeps the cost low.

### 2.13 ML research view (`/admin/ml`)

Data: `GET /api/ml/model-info`, `POST /api/ml/estimate-risk`.

Components: `DatasetCard` (name, source, URL, access date, licence, record counts, target definition, limitations), `PreprocessingList`, `ModelSummary` (shipped model, version, trained at, features used with the transfer note from `02-architecture.md` section 6.3), `MetricsTable` (overall and per class, shipped model), `ModelComparisonTable` (LR, DT, RF as trained), `ResearchModelPanel` (the research variant's feature list and metrics, clearly labelled as not the model behind the form), `ConfusionMatrixHeatmap`, `FeatureImportanceBarChart`, `ClassDistributionChart` (train and test), `RiskEstimateForm` (inputs generated from the feature schema; result shows level, probabilities and the disclaimer text returned by the API).

State when the ML service is unavailable: the whole page shows "ML service unavailable" with the last successful fetch time if cached; nothing is invented.

### 2.14 Profile (`/app/profile`)

Data: `GET /api/auth/me`, `PATCH /api/users/me`, `PATCH /api/users/me/password`.

Components: `ProfileForm` (name, phone; email read-only), `PasswordForm` (current, new, confirm), `AccountInfo` (role, member since), logout button.

Kept because the brief lists it and because password change is the only account-recovery path without email (D-11).

## 3. Component and folder layout

```
frontend/
  index.html
  vite.config.js
  .env.example
  src/
    main.jsx                # router + providers
    App.jsx                 # route table and guards
    api/
      client.js             # axios instance, auth header, error normalisation
      auth.js incidents.js analytics.js map.js ml.js meta.js users.js
    auth/
      AuthContext.jsx       # user, token, login(), logout(), restore on load
      RequireAuth.jsx RequireRole.jsx
    constants/
      enums.js              # mirrors backend enums; verified against /api/meta/enums at start
      colors.js             # status and severity colours (category colours come from the API)
    hooks/
      useApi.js             # loading/error/data for a request function
      useQueryParams.js     # filters in the URL
      useGeolocation.js
      useReverseGeocode.js  # geocoding service from VITE_GEOCODE_URL, debounce under 1 request/s, session cache
    components/
      ui/                   # Button, Input, Select, Badge, Card, Modal, Toast, Skeleton, Pagination, EmptyState, ErrorState
      layout/               # PublicLayout, AppLayout, AdminLayout, TopNav, SideNav, BottomNav, Footer
      map/                  # MapCanvas, IncidentMarkers, Legend, MapFilters, HotspotLayer, LocationPicker, MiniMap
      incidents/            # IncidentForm, ImageDropzone, IncidentTable, IncidentCardList, StatusBadge, StatusTimeline, StatusChangeForm, PriorityForm
      charts/               # CategoryBarChart, StatusDonut, PriorityBarChart, TimelineLineChart, ConfusionMatrixHeatmap, FeatureImportanceBarChart
    pages/
      public/               # Landing, Login, AdminLogin, Register, MapView, NotFound
      citizen/              # Dashboard, ReportIncident, EditIncident, MyReports, IncidentDetails, Profile
      admin/                # AdminDashboard, IncidentManagement, AdminIncidentDetails, Analytics, HotspotMap, MlResearch
    styles/
      tokens.css            # colours, spacing, radius, shadows, typography
      global.css            # reset, base elements, utilities
    mocks/                  # MOCK DATA for UI work before integration; deleted in Phase 10
    utils/
      format.js             # dates, numbers, coordinate rounding
      validation.js         # zod schemas shared by forms
```

## 4. State and data flow

- Authentication state lives in `AuthContext`; the token in `localStorage` under one key; an axios interceptor attaches it and a response interceptor logs the user out on 401 from `/api/auth/me`.
- Server data is fetched per page with `useApi`; there is no client-side cache layer beyond what a page holds in state. If the team finds repeated fetching painful, TanStack Query can be added in Phase 10; it is not assumed now.
- Filters are URL state (`useQueryParams`) so back/forward and sharing work.
- Forms use react-hook-form with zod resolvers; server-side `details[]` are mapped onto fields by name.
- Enums and colours: the app fetches `/api/meta/enums` and `/api/meta/categories` once at start and keeps them in a `MetaContext`; components never hard-code category lists.

## 5. Mock data policy

Until the corresponding backend endpoints exist, pages may import from `src/mocks/*.js`. Every mock file starts with the comment `// MOCK DATA: replace with API call in Phase 10` and every page using a mock renders a small "Mock data" ribbon in development builds. Phase 10 removes the folder and the ribbon component and switches on an ESLint `no-restricted-imports` rule for `mocks/`; because the `build` script runs `eslint . && vite build`, a leftover import fails the build.

## 6. Responsive and accessibility plan

- Breakpoints: 360 px (small phone), 640 px, 1024 px (side navigation appears), 1280 px.
- Tables collapse to card lists below 640 px; the map takes the full viewport height minus the header on phones; forms are single column.
- Touch targets at least 44 px; map controls sized for touch.
- Every input has a visible label; errors are announced with `aria-live`; colour-coded badges always include text; focus outlines are never removed; charts have a text summary under them (counts in a small table) so their content is available without colour vision or a screen.
- Contrast checked with the tokens file before Phase 3 ends.

## 7. Design tokens (starting values, to be tuned in Phase 3)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0B1220` (public pages), `#F5F7FA` (app pages) | page background |
| `--surface` | `#111A2E` / `#FFFFFF` | cards |
| `--text` | `#E6EDF7` / `#111827` | body text |
| `--accent` | `#22C55E` | primary buttons, links on dark |
| `--accent-2` | `#38BDF8` | map highlights, secondary actions |
| `--danger` | `#EF4444` | destructive actions, HIGH severity |
| `--warning` | `#F59E0B` | MEDIUM severity, pending states |
| `--radius` | `12px` | cards and inputs |
| `--font` | `"Inter", system-ui, sans-serif` | everything |

Status colours: REPORTED grey, UNDER_REVIEW blue, VERIFIED teal, IN_PROGRESS amber, RESOLVED green, REJECTED red. Severity colours: LOW green, MEDIUM amber, HIGH red. Category colours are served by the API (see `04-api-contract.md` section 4) so the legend, markers and charts cannot drift apart.
