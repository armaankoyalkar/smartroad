# SmartRoad backend

Node.js + Express 5 REST API with MongoDB (Mongoose 9). Phase 2 delivers the foundation: configuration, database models, error handling, health and meta endpoints, seed scripts and the test setup. Authentication routes arrive in Phase 3 and incident routes in Phase 4.

Design references: `docs/02-architecture.md` (section 2.1 for the layering), `docs/03-database-schema.md`, `docs/04-api-contract.md`.

## Requirements

- Node.js 20.11 or newer (22 LTS recommended). Check with `node -v`.
- A MongoDB server: either a local MongoDB Community Server or a free MongoDB Atlas cluster. Either works; only `MONGODB_URI` changes.
- npm (comes with Node).

## First run

```bash
cd backend
npm install
copy .env.example .env        # Windows (use `cp .env.example .env` on Linux or macOS)
```

Edit `.env`: set `MONGODB_URI`, replace `JWT_SECRET` with a long random string (the file shows a one-line command that generates one), and set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

```bash
npm run seed      # creates the administrator and three demo citizen accounts
npm run dev       # starts the API on http://localhost:5000 with auto-reload
```

Check it is alive: open `http://localhost:5000/api/health` in a browser. `checks.database.status` should be `up`; `checks.mlService.status` stays `down` until Phase 8.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start with `node --watch` and the variables from `.env`. |
| `npm start` | Start without watching (deployment). Variables come from the platform. |
| `npm test` | Run the whole test suite once (see Testing). |
| `npm run test:watch` | Re-run tests on change. |
| `npm run lint` | ESLint over `src/` and `tests/`. |
| `npm run format` | Prettier over `src/` and `tests/`. |
| `npm run seed` | Upsert the admin from `.env`, the demo citizens, and replace seed incidents. |
| `npm run seed:load` | Same, plus 1,000 generated Hyderabad incidents for performance checks (`source: "seed"`). |
| `npm run seed:clear` | Remove every seed incident; accounts and user reports are untouched. |
| `npm run create-admin -- --email x@y.z --password "..." --name "..."` | Add another administrator (decision D-03). |
| `npm run deactivate-user -- --email x@y.z [--reactivate]` | Block or unblock an account without deleting it. |

Demo citizen accounts created by the seed: `citizen1@smartroad.demo`, `citizen2@smartroad.demo`, `citizen3@smartroad.demo`, all with the password from `SEED_DEMO_PASSWORD`.

## Endpoints available after Phase 2

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | 200 with database up, 503 otherwise; also reports the ML service. |
| GET | `/api/meta/categories` | Category keys, labels, colours, descriptions. |
| GET | `/api/meta/enums` | Severities, priorities, statuses, allowed transitions, labels, map defaults, upload limits. |

Everything else returns the standard 404 envelope. Response and error shapes follow `docs/04-api-contract.md` section 1.

## Layout

```
src/
  server.js              start-up: connect, listen, graceful shutdown
  app.js                 express app: helmet, cors, json, rate limit, routes, error handler
  config/                env.js (validated environment), db.js, enums.js, categories.js
  middleware/            auth.js, requireRole.js, validate.js, rateLimit.js, errorHandler.js
  models/                User.js, Incident.js
  routes/ controllers/   one file per resource
  services/              business rules (incident lifecycle)
  lib/                   errors.js, geo.js, cache.js, mlClient.js, serializers.js
  scripts/               seed.js, createAdmin.js, deactivateUser.js (+ lib/)
tests/
  unit/                  no database needed
  integration/           need MongoDB (see below)
  setup/                 test environment, database helpers
```

Request flow: middleware, then route, then controller, then service, then model. Controllers never query Mongoose directly; services never touch `req` or `res`.

## Testing

`npm test` runs unit tests (no database) and integration tests. For the integration tests the setup looks for a database in this order:

1. `MONGODB_TEST_URI` if set (for example `mongodb://127.0.0.1:27017`), or
2. `mongodb-memory-server`, which downloads a MongoDB binary the first time (about 100 MB, cached in your user profile) and starts it in memory.

If neither is available the integration tests are skipped with a warning. Set `SMARTROAD_REQUIRE_DB=1` to make that a failure instead (recommended in CI and before a phase is called done).

Status at the end of Phase 2: the 72 unit tests pass in the environment where the code was written. The 12 integration tests are written but could not be executed there because MongoDB binaries were not downloadable from that network. Run `npm test` on your machine and record the result before starting Phase 3.

## Conventions worth knowing

- Enum keys (`REPORTED`, `POTHOLE`, `HIGH`) live in `src/config/enums.js` and `src/config/categories.js` only.
- Coordinates: the database stores GeoJSON `[longitude, latitude]`; the API always exposes `latitude` and `longitude`. Convert only through `src/lib/geo.js`.
- Validation happens in zod schemas passed to `validate()`; parsed values are on `req.validated`.
- Errors are thrown as `AppError` with a code from `src/lib/errors.js`; the error handler produces the envelope.
- Passwords are hashed with bcryptjs (the same bcrypt algorithm, pure JavaScript, so nothing native has to compile on Windows).
