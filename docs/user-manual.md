# SmartRoad user manual

This manual describes the delivered interface for the two roles. Screens are described as they render at http://localhost:5173 in the development setup (`README.md`). Demo accounts created by `npm run seed` are listed in the README; every seeded incident carries a "Demo data" badge.

## 1. Everyone (no account)

### Landing page (`/`)

Explains the purpose of SmartRoad, how it works (report, verify, resolve), the key features, a read-only preview map of the latest public incidents, public figures (real reports only; demo data is excluded), the technology used, and the project team. Buttons lead to registration, sign-in and the map.

### Public map (`/map`)

- Markers show every incident that is not rejected. Nearby markers are grouped into numbered clusters; zoom in or click a cluster to expand it.
- **Colour by** switches the marker colour between category, severity and status. The legend on the right explains the colours; on phones use the "Legend" button.
- **Filters** (drawer on phones): category, status, severity and a date range. Filters are stored in the address bar, so a filtered map can be shared.
- Click a marker to see its title, badges, date and address. Signed-in users also get a "View details" link.
- The status bar shows how many incidents are displayed, whether demo data is included, and asks you to zoom in when more incidents exist than the map loaded.

### Register (`/register`) and sign in (`/login`)

Registration needs a name, an email address, a password of at least 8 characters (confirmed twice) and an optional phone number. Sign in with email and password. Administrators use `/admin/login`, which shows a clear message if a citizen account signs in there.

## 2. Citizens

After signing in, the citizen area has a side navigation (bottom navigation on phones): Dashboard, Report an incident, My reports, Map, Profile, Sign out.

### Dashboard (`/app`)

Your counts (total, pending, verified and in progress, resolved, rejected), your five most recent reports with their status, and a large "Report an incident" button.

### Report an incident (`/app/report`)

1. **Category**: pick the closest match; choose Other if nothing fits.
2. **Title** (5 to 120 characters) and **description** (10 to 2000 characters).
3. **Severity**: Low, Medium or High, your view of how bad it looks. An administrator sets the priority separately.
4. **Location**: click the map to place the marker, drag it, press "Use my location", or type latitude and longitude. When a point is chosen the address is looked up automatically (OpenStreetMap) and can be edited.
5. **Photo** (optional): one JPEG, PNG or WebP image up to 5 MB. Do not photograph people or number plates.
6. **Submit**. Field errors appear next to the fields; on success you are taken to the report's page.

New reports start as **Submitted**. You can edit a report (all fields, replace or remove the photo) until an administrator starts reviewing it.

### My reports (`/app/reports`)

A table (cards on phones) of your reports with category, severity, status, verification state, priority and date; filter by status and category, sort, and page through. Click a row to open it.

### Report details (`/app/reports/:id`)

Title, badges, description, photo (click to enlarge), a small map, facts (category, severity, priority, verification, address, coordinates, dates) and the **history**: every status and priority change with any note an administrator wrote, including the reason if the report was rejected. "Edit" is shown only while the report is Submitted.

### Profile (`/app/profile`)

Change your name and phone, change your password (current password required), see your role and membership date, sign out.

## 3. Administrators

Sign in at `/admin/login`. The admin area has a collapsible side navigation: Dashboard, Incidents, Map & hotspots, Analytics, Risk estimation, Users. The search box at the top (Ctrl/Cmd+K) jumps to the incident list.

### Dashboard (`/admin`)

Counts (total, pending verification, verified, active including verified, resolved, rejected, high-priority open), charts by category, status and priority, incidents over time (30 days, 26 weeks or 12 months), a compact map with a hotspot toggle, a risk overview of stored estimates, and a "Needs attention" list of the newest submitted reports. A note states how many records are demo data.

### Incidents (`/admin/incidents`)

Search by words in the title, description or address; filter by status, category, priority (including Unassigned), severity, risk level (including "not estimated"), source (user or demo) and date range; sort by date, severity, priority or status. Each row has quick actions: **Change status** (only the moves allowed from the current status are offered; rejecting asks for a reason) and **Set priority**. Open a row for the full page.

### Incident page (`/admin/incidents/:id`)

Everything the reporter sees plus the reporter's name and email, who verified it, the admin note, the full history with actor names and the following panels:

- **Status**: choose an allowed transition, optionally add a note (required when rejecting). The lifecycle is Submitted, Under review, Verified, In progress, Resolved, with Rejected reachable from Submitted, Under review or Verified; a rejected report can be reconsidered and a resolved one reopened. The server refuses any other move and the page shows why.
- **Priority**: Low, Medium, High, Critical or clear it.
- **Edit**: category, title, description, severity, location, address, photo and admin note.
- **Risk estimate**: press "Estimate risk". The panel shows the level, the three class probabilities, the contributing factors (a sensitivity measure), the feature values used and which of them were assumed (weather, road type, speed limit, area type are not collected by SmartRoad), the model version and a demo-model notice. "Adjust context" lets you override those assumed values for a one-off estimate that is not stored.
- **Danger zone**: delete the incident (confirmation required; the photo is deleted too).

### Map & hotspots (`/admin/map`)

The full map with every filter (including rejected incidents, priority and risk level) and the **hotspot layer**. Hotspots are density clusters of reported incidents found with DBSCAN; they show where reports concentrate and are not produced by the risk model. Adjust the radius (eps, 50 to 2000 m; default 200 m) and the minimum points per cluster (3 to 20; default 4), then press "Recompute". The table lists each cluster with its dominant category, category counts, point count, radius and centre; clicking a row flies the map to it. Points outside any cluster are noise. With too few incidents the page says so.

### Analytics (`/admin/analytics`)

Choose a period (30 days, 90 days, 6 months, 12 months, all time, custom) and whether demo data is included. Tabs show breakdowns by category, status, priority, severity and risk level, each as a chart and as a table, and the timeline by day, week or month. "Export CSV" downloads the displayed table.

### Risk estimation (`/admin/risk`)

The page behind the risk levels:

- **Dataset card**: what the model was trained on. With the bundled data it says DEMO DATA and lists the limitations.
- **Shipped model**: name, version, training date, features, preprocessing steps.
- **Metrics**: accuracy, macro and weighted F1, per-class precision, recall and F1, the comparison of all candidate models, the confusion matrix, feature importance and the class distribution. Every number comes from the training run.
- **Try an estimate**: fill in the ten features and press "Estimate". The result shows the level, probabilities, contributing factors and the disclaimer.
- **Risk distribution**: how many stored incidents have each level, and a button to run the estimation for every incident (this stores an estimate on each non-rejected incident and enables the risk colouring on the map and the risk filter in the list).

If the ML service is not running, the page says "ML service unavailable" and the rest of the application keeps working.

### Users (`/admin/users`)

Search by name or email, filter by role and active state. Deactivate or reactivate accounts and change roles (each change asks for confirmation). You cannot change your own role or deactivate yourself. Open a user to see their incident counts by status.

## 4. Wording you will see everywhere

- "Estimate from historical data; not a prediction that an incident will occur" on every risk output.
- "Demo model" and "Demo data" wherever the synthetic dataset or seed records are involved.
- "Clusters of reported incidents" for hotspots.
