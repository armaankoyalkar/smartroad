# SmartRoad known limitations

SmartRoad is an academic prototype. The points below are stated plainly so that the project review and the report do not claim more than the system does. The executed test results are in `docs/testing.md`.

## 1. Machine learning

- **The risk model is trained on synthetic demo data.** No real record-level road-incident dataset is bundled with the repository, and the build does not download one. `data/generate_demo_dataset.py` produces the dataset from a documented stochastic rule, so the evaluation metrics in the risk page describe how well the pipeline recovers that rule. They say nothing about real roads. The UI shows a "Demo model" notice on every estimate and the dataset card says `is_demo_data: true`.
- **Estimates for stored incidents rely on assumed context.** SmartRoad collects category, location and time. Weather, road surface, road type, speed limit and area type are defaulted (and listed as assumed) unless an administrator overrides them. Light conditions are approximated from the hour.
- **"Risk level" means estimated severity class given the context,** not the probability that an incident will occur at a place. The wording in the UI reflects this.
- **Contributing factors are a sensitivity measure,** not SHAP values or causal effects.
- **Hotspots depend on reporting density,** which depends on who reports. Areas with fewer smartphone users can be under-represented. Clusters are not weighted by severity.
- **A model trained on one geography does not transfer to another.** The shipped model therefore uses no raw coordinates; the research variant that does is reported only for the feature-importance discussion.

## 2. Data and demo content

- **Seed incidents are fictional.** They are placed at plausible Hyderabad coordinates with realistic wording so the demo looks like a working system, but they are labelled "Demo data", carry `source: "seed"`, are excluded from public statistics and can be removed with `npm run seed:clear`.
- **Public figures on the landing page may be zero** on a fresh installation, because they count real reports only.

## 3. Security and accounts

- **The JWT is stored in `localStorage`.** A cross-site scripting bug could read it. Mitigations: React escaping, no third-party scripts, 24-hour expiry, immediate rejection of deactivated accounts. An HttpOnly cookie design is listed as future work.
- **No password recovery, no two-factor authentication, no email verification,** because the project uses no email provider. Password change requires the current password.
- **Uploaded images are validated by magic bytes and size but not re-encoded,** so EXIF metadata (which may include GPS tags) is kept as uploaded. The form warns users not to photograph people or number plates.
- **Rate limiting is in-memory per API process.** Several API instances would need a shared store.
- **No CAPTCHA** on registration; spam is limited by rate limits and by administrators rejecting or deleting reports.
- **Known low-severity gaps from the security review:** on `PATCH /api/incidents/:id` the multipart body (up to the upload limit) is buffered before the ownership check runs, bounded only by the global per-IP limit; the hotspot cache is keyed by free-form admin parameters and has no size cap. Both are recorded rather than fixed in this version.

## 4. Product scope

- No notifications; status is visible in-app only.
- No work assignment to field crews, no integration with municipal systems.
- Hotspots and risk estimation are administrator-only views.
- Citizens can edit a report only while it is SUBMITTED.
- One image per incident.
- OpenStreetMap supplies base-map tiles and reverse geocoding; there is no live traffic information anywhere in the system.
- Nominatim usage must stay low-volume (one request per second, cached); a production deployment would need its own geocoder.

## 5. Engineering

- **Single-process assumptions:** the in-memory TTL cache and rate limiter do not scale across instances.
- **Local disk uploads:** a hosting platform without a persistent disk needs the cloud storage adapter listed in future scope.
- **Timeline buckets and derived temporal features use one configured timezone** (`ANALYTICS_TIMEZONE`, default Asia/Kolkata), not the reporter's timezone.
- **Public map markers are not keyboard-reachable.** Markers are canvas-drawn circle markers, so a keyboard or screen-reader user cannot open a marker on `/map`; the admin pages offer tables as an alternative, the public map does not yet. Listed as the first accessibility improvement in `docs/future-scope.md`.
- **Session restore during a network outage** sends the user to the sign-in page (the stored token is kept but not retried automatically).
- **End-to-end coverage is a smoke test,** not a browser automation suite; UI behaviour is covered by component tests.
- **Windows development inside OneDrive** slows `npm install` noticeably; the README recommends excluding `node_modules` from syncing.
