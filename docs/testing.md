# SmartRoad testing

This document describes the test strategy and records the results of the runs executed on 2 September 2026 on the development machine (Windows 11, Node 24, Python 3.14, local MongoDB). Only executed results are recorded; re-run the commands to reproduce them.

## 1. Strategy

| Layer | Runner | What it covers | Command |
|---|---|---|---|
| Backend unit | vitest | enums and transitions, environment parsing, geo helpers, serializer privacy variants, pagination and sort parsing, incident filter builder, time-zone helpers, case conversion, storage adapter, upload middleware, validation schemas, risk-feature derivation, timeline gap filling, hotspot post-processing | `cd backend && npm test` |
| Backend integration | vitest + supertest against MongoDB (`MONGODB_TEST_URI`, local server by default, `mongodb-memory-server` fallback) | models and indexes, seed idempotence, registration and login, token errors, authorization (citizen vs admin), profile and password, user management and self-protection, incident create (JSON and multipart with a real PNG, GIF rejected, oversize rejected), list filters, search, rank-order sort, pagination, privacy variants, edit rules, delete with image removal, every status transition and side effect, priority, analytics counts versus direct queries, map GeoJSON and bbox, hotspots and ML proxy with a mocked ML client (including 503 propagation), risk refresh and distribution | same |
| Frontend | vitest + Testing Library (jsdom) | UI primitives (button, field, dialog focus trap, pagination), API client error normalisation, auth restore and guards, enum/colour consistency, formatting and validation utilities, login and register pages, incident form, my reports and details pages, landing page, admin dashboard, incident management, status change form, risk estimation page, map page hotspot parameters, users page | `cd frontend && npm test` |
| ML | pytest | demo generator (determinism, schema, class balance, interaction terms), validation, preprocessing incl. leakage guard, the whole pipeline in quick mode into a temporary directory, prediction and contributions, batch, DBSCAN (clusters, noise, radius floor, small data), FastAPI routes (health, model info, 422 cases, API key), STATS19 adapter | `npm run ml:test` |
| End to end | Node script against running services | health, meta, registration, multipart report with photo, my reports, authorization, admin search, invalid and valid transitions, note requirement, priority, privacy for the reporter, edit lock after verification, GeoJSON map with bbox and public/admin variants, analytics, user management, ML model info, estimate, incident risk, hotspots, risk distribution, deletion and account deactivation (57 checks) | `npm run test:e2e` |
| Static checks | tsc, ESLint, Ruff, phrase checker | strict TypeScript, lint rules, Python style, banned wording | `npm run lint:all`, `npm run check:phrases`, backend/frontend `npm run typecheck`, `ruff check .` in `ml/` |

## 2. Executed results

| Suite | Result |
|---|---|
| Backend `npm test` (unit + integration on the local MongoDB) | 43 files, 376 tests passed, 0 failed, 0 skipped |
| Backend `npm run typecheck`, `npm run lint`, `npm run build` | all exit 0 |
| Frontend `npm test` | 25 files, 133 tests passed |
| Frontend `npm run typecheck`, `npm run lint`, `npm run build` | all exit 0 (production bundle built, charts and map code-split) |
| ML `pytest -q` | 77 passed |
| ML `ruff check .`, `ruff format --check .` | clean |
| ML training run `python -m training.run_pipeline` | exit 0; artifacts written; metrics in `docs/machine-learning.md` |
| End to end `node tests/e2e/run.mjs` | 57 passed, 0 failed, 0 skipped (5 DBSCAN clusters and 46 noise points found in the seeded data) |
| `npm run check:phrases` | passed |

## 3. Requirement coverage

| Requirement group | Where it is tested |
|---|---|
| FR-A authentication | `backend/tests/integration/a-auth.test.ts`, `a-users.test.ts`; frontend `LoginPage`, `RegisterPage`, `AuthContext` tests; e2e steps 2 and 3 |
| FR-R reporting | `a-incidents-create.test.ts`, `a-incidents-detail.test.ts`; frontend `IncidentForm`, `MyReportsPage`, `IncidentDetailsPage` tests; e2e step 2 |
| FR-M management | `a-incidents-list.test.ts`, `a-incidents-lifecycle.test.ts`, `a-users.test.ts`, unit `incidentStatus.service.test.ts`; frontend admin page tests; e2e step 3 |
| FR-G map and GIS | unit `geo.test.ts`, `incidentFilters.test.ts`; integration `b-map.test.ts`, `models.test.ts` (2dsphere queries); frontend map page test; e2e step 4 |
| FR-D dashboards and analytics | `b-analytics.test.ts`, unit `b-analytics.test.ts` (gap filling); frontend dashboard and analytics tests; e2e step 4 |
| FR-ML risk estimation | ML `test_pipeline.py`, `test_predict.py`, `test_api.py`; backend `b-ml.test.ts`, `b-riskFeatures.test.ts`; frontend risk page test; e2e step 5 |
| FR-H hotspots | ML `test_hotspots.py`; backend `b-hotspots.test.ts`, `b-hotspot.test.ts`; e2e step 5 |
| FR-S cross-cutting | unit `app.test.ts` (envelope, headers, CORS), `env.test.ts`, `pagination.test.ts`; `seed.test.ts` |
| NFR-3 security | `upload.test.ts`, `uploadsRoute.test.ts` (traversal, dotfiles, non-images), `storage.test.ts`, authorization tests above |
| NFR-13 honesty | `scripts/check-phrases.mjs` |

## 4. Manual browser walkthrough (executed)

Performed in the in-app browser against the running development stack after the automated suites:

1. Landing page renders with live public figures and the preview map.
2. Citizen sign-in as a demo citizen; "My reports" lists 27 seeded reports with status, verification, severity, priority and "Demo data" badges, filters and pagination.
3. Report form: category, title, description, severity cards, coordinate inputs and map; submission created a SUBMITTED report and opened its details page with the history entry.
4. Defect found and fixed: typing a latitude while the longitude box was still empty committed longitude 0 and reverse-geocoded an address in Mali; the picker now waits for both values (`frontend/src/components/map/LocationPicker.tsx`).
5. Admin sign-in page correctly refuses a citizen account, then accepts the demo administrator.
6. Admin dashboard, incident list with search, incident page (risk estimate computed and stored with assumed-feature chips and the demo notice; status changed to Under review with a history entry and narrowed transitions), map and hotspots (5 clusters from 75 points), analytics (period presets, breakdown tabs, timeline), risk estimation page (dataset card, metrics, comparison, confusion matrix), users page.
7. The walkthrough record was deleted through the API afterwards.

## 5. How to run everything

```bash
npm run test:all
```

```bash
npm run dev
```

then, in another terminal:

```bash
npm run test:e2e
```

Set `E2E_REQUIRE_ML=1` to make the ML checks mandatory instead of skipped when the ML service is down. Integration tests use the MongoDB at `MONGODB_TEST_URI` (default: the local server on 27017 when reachable); set `SMARTROAD_REQUIRE_DB=1` to fail instead of skipping when no database is available.
