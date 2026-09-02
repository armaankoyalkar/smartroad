# SmartRoad

An Intelligent Web-Based Road Safety, Traffic Incident Management and Risk Prediction System.

Final-year major project, Department of Information Technology, academic year 2026 to 2027.

Team: Balaji Lakshmipathi (project lead), Vivek Reddy, Arman Koyalkar. Project guide: Rajesh Adluri. Acceptance: Aruja Jyothi Ma'am.

## What SmartRoad is

A web platform where citizens report road incidents (accidents, potholes, road damage, traffic signal issues, obstructions, waterlogging, other hazards) with a map location and an optional photo; administrators verify, prioritise and track those reports to resolution; everyone can see incidents on an OpenStreetMap-based map; and administrators get analytics plus a machine-learning research view that estimates incident risk from historical data and finds hotspots with DBSCAN.

Stack: React (Vite) frontend, Node.js + Express API, MongoDB with Mongoose, Python FastAPI service with scikit-learn, Leaflet + OpenStreetMap.

## Project status

| Phase | Scope | Status |
|---|---|---|
| 1 | Requirements and architecture | Delivered and approved (1 September 2026) |
| 2 | Database and backend foundation | Delivered (1 September 2026); unit tests pass, integration tests to be run by the team (`backend/README.md`) |
| 3 | Authentication | Not started |
| 4 | Incident reporting | Not started |
| 5 | Admin dashboard | Not started |
| 6 | GIS map | Not started |
| 7 | Analytics | Not started |
| 8 | ML pipeline | Not started |
| 9 | Hotspot detection | Not started |
| 10 | Integration | Not started |
| 11 | Testing | Not started |
| 12 | Deployment | Not started |
| 13 | Documentation | Not started |

## Documents

| File | Contents |
|---|---|
| `docs/01-requirements.md` | Problem, scope, roles, functional and non-functional requirements, vocabulary, incident lifecycle, decision log |
| `docs/02-architecture.md` | System architecture and flows, technology justification, GIS, ML and security architecture, deployment sketch, research foundation |
| `docs/03-database-schema.md` | MongoDB collections, fields, indexes, ER diagram, sample documents, seed plan |
| `docs/04-api-contract.md` | REST conventions, every endpoint with request and response shapes, internal ML service API |
| `docs/05-frontend-structure.md` | Routes, page specifications, component layout, state, mock-data policy, responsive plan, design tokens |
| `docs/06-project-plan.md` | Repository layout, dependencies, phases with exit criteria, team matrix, risks, dataset candidates, effort estimate |

## Repository layout

```
smartroad/
  frontend/     React application (Phase 3 onwards)
  backend/      Express API (Phase 2 onwards)
  ml-service/   FastAPI service and training scripts (Phase 8 onwards)
  dataset/      Dataset card and download scripts; raw data is never committed
  docs/         Design documents, later the report and presentation
  screenshots/  Images for the README and report
```

## Ground rules for everyone committing

- Never commit `.env` files, uploads, datasets or model artifacts. `.gitignore` already excludes them; check `git status` before every commit.
- Never write "AI-powered", "real-time" or "predicts accidents" anywhere in the product or the report. The system estimates risk from historical data and shows clusters of reports.
- Every number shown in the UI or the report comes from the database or from a metrics file written by an actual training run.
- Mock data is allowed only in `frontend/src/mocks/` with the marker comment, and is removed in Phase 10.
- Work happens on feature branches named `phase-N/short-description`; the lead merges to `main` after review.

## Running the project

- Backend: see `backend/README.md` (install, `.env`, seed, `npm run dev`, `npm test`).
- Frontend: added in Phase 3.
- ML service: added in Phase 8.

If this folder lives inside OneDrive, exclude `backend/node_modules` from syncing (or pause syncing while installing); it contains thousands of small files that OneDrive handles badly. Git ignores it either way.
