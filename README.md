# SmartRoad

**An Intelligent Web-Based Road Safety, Traffic Incident Management and Risk Prediction System**

Final-year engineering project (academic prototype).

| Role | Name |
|---|---|
| Project lead | Balaji Lakshmipathi |
| Team members | Vivek Reddy, Arman Koyalkar |
| Project guide | Rajesh Adluri |
| Project acceptance | Aruja Jyothi Ma'am |

SmartRoad is a web platform where citizens report road incidents (potholes, road damage, accidents, congestion, broken signals, street-light issues, unsafe conditions, obstructions, waterlogging) with a map location and a photo, and administrators verify, prioritise and track them to resolution. Administrators also get a GIS map, analytics, DBSCAN hotspot analysis of reported incidents and a Random Forest risk estimator trained by a documented scikit-learn pipeline.

## Stack

| Part | Technology |
|---|---|
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS 4, react-router 7, TanStack Query, react-hook-form + zod, Leaflet + react-leaflet 5 + OpenStreetMap, Recharts 3, vitest + Testing Library |
| Backend | Node.js, Express 5, TypeScript, Mongoose 9, zod 4, JWT + bcryptjs, helmet, express-rate-limit, multer + file-type, vitest + supertest |
| Database | MongoDB (2dsphere geospatial index) |
| Machine learning | Python, pandas, NumPy, scikit-learn (Random Forest, Logistic Regression, Decision Tree, DBSCAN), joblib, FastAPI, pytest |

## Repository layout

```
smartroad/
  backend/        Express + TypeScript REST API (Balaji)
  frontend/       React + TypeScript single-page application (Vivek)
  ml/             Training pipeline and FastAPI ML service (Arman)
  data/           Dataset card and the demo dataset generator (raw data is never committed)
  docs/           Documentation (docs/design/ holds the Phase 1 design record)
  tests/e2e/      End-to-end smoke test against running services
  scripts/        Cross-platform helpers (ML venv wrapper, banned-phrase check)
  .env.example    Reference copy of every environment variable
  docker-compose.yml   Optional local MongoDB
```

## Quick start

Prerequisites: Node.js 20.11+ (24 used), Python 3.11+ (3.14 used), MongoDB 5+ (local service, `docker compose up -d mongo`, or Atlas).

```bash
npm run install:all
```

```bash
cp backend/.env.example backend/.env && cp frontend/.env.example frontend/.env && cp ml/.env.example ml/.env
```

Edit `backend/.env`: set `MONGODB_URI` if it is not the local default, replace `JWT_SECRET` with 32+ random characters, and choose the demo passwords.

```bash
npm run ml:train
```

```bash
npm run seed
```

```bash
npm run dev
```

Open http://localhost:5173. The API runs on http://localhost:5000/api and the ML service on http://127.0.0.1:8000.

## Commands

| Command | What it does |
|---|---|
| `npm run install:all` | Install root tooling, backend, frontend and the Python venv (`ml/.venv`) |
| `npm run dev` | Start API, frontend and ML service together |
| `npm run dev:web` | Start API and frontend only (ML panels show "unavailable") |
| `npm run dev:backend`, `npm run dev:frontend`, `npm run dev:ml` | Start one service |
| `npm run ml:train` | Run the training pipeline; writes `ml/artifacts/` |
| `npm run seed` | Create the demo admin, three demo citizens and the curated demo incidents |
| `npm run seed:load` | Add 1000 generated incidents for performance checks |
| `npm run seed:clear` | Remove every seed incident (user reports are never touched) |
| `npm run test:all` | Backend, frontend and ML test suites |
| `npm run test:backend`, `npm run test:frontend`, `npm run ml:test` | One suite |
| `npm run test:e2e` | End-to-end smoke test against the running services (`E2E_REQUIRE_ML=1` to require the ML service) |
| `npm run install:ml` | Create `ml/.venv` and install the Python requirements only |
| `npm run build:all` | Production builds (`backend/dist`, `frontend/dist`) |
| `npm run lint:all` | ESLint for backend and frontend |
| `npm run check:phrases` | Fails if the product or docs claim something the system does not do |

Backend-only commands (from `backend/`): `npm run create-admin -- --email x@y.z --password "..." [--name "Name"]`, `npm run deactivate-user -- --email x@y.z [--reactivate]`, `npm run typecheck`.

## Demo accounts

`npm run seed` creates demo accounts from `backend/.env`. These are development accounts, not real people:

| Account | Email | Password |
|---|---|---|
| Administrator | `SEED_ADMIN_EMAIL` (example: `admin@smartroad.demo`) | `SEED_ADMIN_PASSWORD` |
| Demo citizens | `citizen1@smartroad.demo`, `citizen2@smartroad.demo`, `citizen3@smartroad.demo` | `SEED_DEMO_PASSWORD` |

The seeded incidents are fictional, placed at plausible Hyderabad locations, stored with `source: "seed"` and labelled "Demo data" in the interface. Public statistics exclude them.

## Demo workflow

1. Start MongoDB, then `npm run dev` (API, frontend, ML service).
2. Register a citizen at `/register` (or sign in as a demo citizen).
3. Report an incident at `/app/report`: pick a category, describe it, click the map (or use your location), attach a photo, submit.
4. Watch it appear in `/app/reports` as SUBMITTED / pending verification.
5. Sign in as the administrator at `/admin/login`.
6. Open `/admin/incidents`, find the report, move it to UNDER_REVIEW, then VERIFIED, set a priority.
7. See it on the GIS map at `/admin/map` (colour by category, severity, status or risk) and on the public map at `/map`.
8. Open `/admin/analytics` for category, status, priority, severity, risk and timeline charts.
9. On `/admin/map`, enable hotspots and adjust `eps` / `minSamples` to see DBSCAN clusters of the seeded incidents.
10. On `/admin/risk`, read the dataset card, metrics, confusion matrix and feature importance of the trained model; request an estimate from the form, then run "Estimate risk for all incidents" and open an incident's risk panel.

## Honesty notes

- Every number in the interface comes from the database or from `ml/artifacts/metrics.json` written by an actual training run.
- The bundled dataset is synthetic demo data (`data/README.md`). The model is labelled a demo model everywhere; its metrics describe the pipeline, not real roads. The pipeline accepts a real prepared dataset and includes a documented adapter for the UK STATS19 schema.
- Risk levels are estimates from historical data. Hotspots are density clusters of reported incidents. OpenStreetMap provides base-map tiles and reverse geocoding only.

## Documentation

| Document | Contents |
|---|---|
| `docs/project-overview.md` | Identity, objectives, deliverables |
| `docs/requirements.md` | Requirement IDs, roles, lifecycle, decision log |
| `docs/architecture.md` | Components, layering, request flows, technology choices |
| `docs/database.md` | Collections, fields, indexes, aggregations, seed data |
| `docs/api.md` | The REST contract (single source of truth) |
| `docs/gis.md` | Map data, components, DBSCAN parameters |
| `docs/machine-learning.md` | Dataset, pipeline, evaluation results, serving, limitations |
| `docs/security.md` | Controls and threats considered |
| `docs/testing.md` | Test strategy and executed results |
| `docs/deployment.md` | Environment variables, builds, deployment topology |
| `docs/user-manual.md` | Citizen and administrator guide |
| `docs/limitations.md`, `docs/future-scope.md` | What the prototype does not do, and what could come next |
| `docs/design/` | Phase 1 design record (requirements analysis, architecture, schema, API draft, page plan, project plan) |

## Ground rules for contributors

- Never commit `.env` files, uploads, datasets, model artifacts, `node_modules` or `ml/.venv` (all git-ignored).
- Change `docs/api.md` before changing the API; keep enums identical across services.
- Run `npm run check:phrases` before a commit; it enforces the wording rules in `CLAUDE.md`.
- If the folder lives inside OneDrive, exclude `node_modules`, `ml/.venv` and `backend/uploads` from syncing.
