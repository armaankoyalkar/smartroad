# SmartRoad: working conventions

SmartRoad is a final-year engineering project: an intelligent web-based road safety, traffic incident management and risk prediction system. Three deployable parts live in this repository and are owned by different team members, so keep them independent.

| Directory | Owner | Stack |
|---|---|---|
| `backend/` | Balaji Lakshmipathi | Node.js 20+, Express 5, TypeScript, Mongoose 9, zod 4, vitest |
| `frontend/` | Vivek Reddy | React 19, Vite 7, TypeScript, Tailwind CSS 4, react-router 7, TanStack Query, react-leaflet 5, Recharts 3, vitest |
| `ml/` | Arman Koyalkar | Python 3.11+, pandas, NumPy, scikit-learn, FastAPI, pytest |
| `docs/` | everyone | Current documentation; `docs/design/` holds the Phase 1 design record |
| `data/` | Arman | Dataset card and the demo dataset generator; raw data is never committed |
| `tests/` | everyone | Cross-service end-to-end smoke test (`tests/e2e`) |

## Rules that apply everywhere

- The contract is `docs/api.md`. Change the document first, then the code, then the tests.
- Enumerations (statuses, categories, severities, priorities, risk levels) are defined once per service and must match `docs/api.md` section 2: `backend/src/config/enums.ts` and `categories.ts`, `frontend/src/constants/enums.ts`, `ml/app/constants.py`.
- Coordinates: MongoDB stores GeoJSON `[longitude, latitude]`; the API exposes `latitude` and `longitude` as named fields; only `GET /api/map/incidents` returns GeoJSON. Convert only through `backend/src/lib/geo.ts`.
- Never fabricate numbers. Every statistic in the UI comes from the database; every ML metric comes from `ml/artifacts/metrics.json` written by an actual training run. Demo/seed data is marked `source: "seed"` and the ML demo dataset is marked `is_demo_data: true`; the UI labels both.
- Wording: "estimate", "historical data", "clusters of reported incidents". Do not write "AI-powered", "real-time" or "predicts accidents" anywhere in the product or the docs. OpenStreetMap tiles are a base map, not a traffic feed.
- Secrets live only in `.env` files (git-ignored). `.env.example` files document every variable with a safe placeholder.
- Errors are never swallowed: the backend returns the standard error envelope, the frontend shows a loading, empty and error state on every asynchronous view, and the ML service returns FastAPI error bodies.

## Backend conventions

- Layering: middleware -> route -> controller -> service -> model. Controllers never query Mongoose directly; services never read `req` or write `res`.
- Validation: zod schemas in `src/validation/*.schema.ts` passed to the `validate()` middleware; parsed values are on `req.validated`.
- Errors: throw `AppError` with a code from `src/lib/errors.ts`; the error handler produces the envelope.
- Tests: `npm test` runs unit tests (no database) and integration tests. Integration tests use `MONGODB_TEST_URI` when set, otherwise a MongoDB answering on 127.0.0.1:27017, otherwise `mongodb-memory-server`. Set `SMARTROAD_REQUIRE_DB=1` to fail instead of skipping.

## Frontend conventions

- Feature folders under `src/features/*`; shared UI primitives in `src/components/ui`; map components in `src/components/map` (reusable, no page logic).
- Server state through TanStack Query hooks in `src/api/*`; auth state in `src/auth/AuthContext.tsx`; filters in the URL.
- Forms: react-hook-form with zod resolvers; server `details[]` are mapped back to fields by name.
- Design tokens are Tailwind theme variables in `src/index.css`: dark navy background, deep blue surfaces, cyan accent, light text, semantic colours for status, severity, priority and risk. Category colours come from `GET /api/meta/categories`.
- Accessibility: every input has a label, colour is never the only carrier of meaning, focus outlines stay visible, dialogs trap focus.

## ML conventions

- `ml/training/` is the offline pipeline (`python -m training.run_pipeline`): load, validate, explore, preprocess, split, baseline, models, evaluate, persist. `ml/app/` is the FastAPI service that loads the artifacts. `ml/tests/` are pytest tests.
- Random seeds are fixed (`random_state=42`). Artifacts go to `ml/artifacts/` (git-ignored except the README).
- The demo dataset generator is documented in `data/README.md`; the pipeline also accepts a real dataset in the documented prepared-CSV schema.

## Commands

Root `package.json` wraps the common commands (`npm run install:all`, `npm run dev`, `npm run test:all`, `npm run build:all`, `npm run seed`). Each package also runs on its own; see `README.md` and `docs/deployment.md`.
