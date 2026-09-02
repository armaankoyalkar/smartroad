# SmartRoad backend

Express 5 + TypeScript REST API with MongoDB (Mongoose 9). The contract it implements is `docs/api.md`; the conventions are in `CLAUDE.md`.

## Requirements

- Node.js 20.11 or newer (24 recommended). Check with `node -v`.
- A MongoDB server: a local MongoDB Community Server or a MongoDB Atlas cluster. Only `MONGODB_URI` changes.

## First run

```bash
cd backend
npm install
cp .env.example .env          # Windows: copy .env.example .env
```

Edit `.env`: set `MONGODB_URI`, replace `JWT_SECRET` with a long random string (the file shows a one-line command that generates one) and set the `SEED_ADMIN_*` values.

```bash
npm run seed      # creates the administrator, three demo citizen accounts and the 80 curated demo incidents (incidents carry `source: "seed"`)
npm run dev       # starts the API on http://localhost:5000 with auto-reload (tsx watch)
```

Check it is alive: `http://localhost:5000/api/health`. `checks.database.status` should be `up`; `checks.mlService.status` is `down` until the ML service runs.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start from the TypeScript sources with `tsx watch` and the variables from `.env`. |
| `npm run build` | Compile `src/` to `dist/` (`tsconfig.build.json`). |
| `npm start` | Run the compiled `dist/server.js` (deployment). |
| `npm run typecheck` | `tsc --noEmit` over sources and tests. |
| `npm test` / `npm run test:watch` | Vitest: unit tests (no database) and integration tests (see Testing). |
| `npm run lint` / `npm run format` | ESLint (typescript-eslint) and Prettier. |
| `npm run seed` | Upsert the admin from `.env`, the demo citizens, and replace seed incidents. |
| `npm run seed:load` | Same, plus 1,000 generated Hyderabad incidents for performance checks (`source: "seed"`). |
| `npm run seed:clear` | Remove every seed incident; accounts and user reports are untouched. |
| `npm run create-admin -- --email x@y.z --password "..." --name "..."` | Add another administrator. |
| `npm run deactivate-user -- --email x@y.z [--reactivate]` | Block or unblock an account without deleting it. |

Demo citizen accounts created by the seed: `citizen1@smartroad.demo`, `citizen2@smartroad.demo`, `citizen3@smartroad.demo`, all with the password from `SEED_DEMO_PASSWORD`.

## Endpoints

All 32 routes (health, meta, auth, users, incidents, analytics, map, ML proxy and `/uploads/:filename`) are implemented; the contract with every request and response shape is `docs/api.md` section 3 onwards.

## Layout

```
src/
  server.ts              start-up: connect, create the upload directory, listen, graceful shutdown
  app.ts                 express app: helmet, cors, json, /uploads static, rate limit, routes, error handler
  config/                env.ts (validated environment), db.ts, enums.ts, categories.ts, mlFeatures.ts
  middleware/            auth.ts, requireRole.ts, validate.ts, upload.ts, rateLimit.ts, errorHandler.ts
  models/                User.ts, Incident.ts (typed schemas, documents and models)
  routes/ controllers/   one file per resource
  services/              auth, user, incident, incidentStatus, analytics, analyticsCharts, map, hotspot, ml, riskFeatures
  lib/                   errors, geo, cache, mlClient, serializers, storage, pagination,
                         incidentFilters, time, case, asyncHandler
  validation/            common.schema.ts plus auth, user, incident, analytics, map and ml schemas
  scripts/               seed.ts, createAdmin.ts, deactivateUser.ts (+ lib/)
  types/                 express.d.ts (req.user, req.validated)
tests/
  unit/                  no database needed
  integration/           need MongoDB (see below)
  setup/ helpers/        test environment, database helpers, image fixtures
```

Request flow: middleware, then route, then controller, then service, then model. Controllers never query Mongoose directly; services never touch `req` or `res`. Validation happens in zod schemas passed to `validate()`; parsed values are on `req.validated` (typed through `ValidatedRequest<typeof schemas>`). Errors are thrown as `AppError` with a code from `src/lib/errors.ts`.

## Testing

`npm test` runs unit tests and integration tests. For the integration tests the setup looks for a database in this order:

1. `MONGODB_TEST_URI` if set (for example `mongodb://127.0.0.1:27017`);
2. a MongoDB answering on `127.0.0.1:27017`;
3. `mongodb-memory-server`, which downloads a MongoDB binary the first time (about 100 MB, cached in your user profile).

If none is available the integration tests are skipped with a warning. Set `SMARTROAD_REQUIRE_DB=1` to make that a failure instead (use it in CI). Tests write uploads to a temporary directory, never to `uploads/`.

## Conventions worth knowing

- Enum keys (`SUBMITTED`, `POTHOLE`, `HIGH`) live in `src/config/enums.ts` and `src/config/categories.ts` only, and match `docs/api.md` section 2.
- Coordinates: the database stores GeoJSON `[longitude, latitude]`; the API exposes `latitude` and `longitude`. Convert only through `src/lib/geo.ts`.
- Seed data is marked `source: "seed"`; nothing in this service invents statistics.
- Passwords are hashed with bcryptjs (pure JavaScript, nothing native to compile on Windows).
