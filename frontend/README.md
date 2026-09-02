# SmartRoad frontend

React 19 + Vite 7 + TypeScript + Tailwind CSS 4 single-page application. It talks only to the Express API (`VITE_API_URL`); map tiles and reverse geocoding come from OpenStreetMap services.

## Commands

```bash
npm install          # inside OneDrive this takes a while
cp .env.example .env # adjust VITE_API_URL if the API is not on http://localhost:5000
npm run dev          # Vite dev server on http://localhost:5173
npm run build        # tsc -b && vite build -> dist/
npm run preview      # serve dist/ on http://localhost:4173
npm test             # vitest run (jsdom + Testing Library)
npm run test:watch
npm run typecheck    # tsc -b
npm run lint         # eslint .
npm run format       # prettier --write src
```

Environment variables (all optional, see `.env.example`): `VITE_API_URL`, `VITE_TILE_URL`, `VITE_TILE_ATTRIBUTION`, `VITE_GEOCODE_URL`. Defaults live in `src/config.ts`.

## Structure

```
src/
  main.tsx, App.tsx      provider stack (Query, Auth, Meta, Toast, Router) and the lazy route table
  config.ts              env-derived configuration with development defaults
  constants/             enums.ts (docs/api.md section 2), colors.ts (status, severity, priority, risk, verification)
  types/                 api.ts and ml.ts: every request and response shape in docs/api.md
  api/                   client.ts (axios + ApiError), one module per resource, queries.ts / mutations.ts (TanStack Query)
  auth/                  AuthContext.tsx (provider), context.ts, useAuth.ts, RequireAuth, RequireRole, redirects.ts
  meta/                  MetaContext.tsx (provider), useMeta.ts: categories with API colours, enums, labels, map defaults
  components/ui/         design-system primitives (import from "@/components/ui")
  components/layout/     PublicLayout, AppLayout (citizen), AdminLayout, Logo, Footer, UserMenu
  components/map/        MapCanvas, IncidentMarkers, Legend, MapFilters, LocationPicker, MiniMap, HotspotLayer, MapStatusBar
  components/charts/     ChartCard, Recharts wrappers and the domain charts (breakdown, timeline, confusion matrix, importance, probabilities)
  features/public|citizen|admin   page-specific helpers and sections
  hooks/                 useQueryParams, useGeolocation, useReverseGeocode, useDebounce, useDocumentTitle, useFocusTrap
  utils/                 format.ts, validation.ts (zod), files.ts, formErrors.ts, cn.ts
  pages/public|citizen|admin   one file per route (all 18 pages implemented)
  test/                  setup.ts (jest-dom, browser API stubs) and utils.tsx (renderWithProviders, fixtures)
```

Conventions: server state through the hooks in `src/api`, filters in the URL (`useQueryParams`), forms with react-hook-form + zod (`utils/validation.ts`, `utils/formErrors.ts`), category colours only from `useMeta()`, every asynchronous view shows loading, empty and error states, and the wording rules in the root `CLAUDE.md` apply to all UI text.
