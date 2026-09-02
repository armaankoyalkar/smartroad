# SmartRoad: project overview

**Full title:** An Intelligent Web-Based Road Safety, Traffic Incident Management and Risk Prediction System

**Type:** Final-year engineering project (academic prototype)

| Role | Name |
|---|---|
| Project lead | Balaji Lakshmipathi |
| Team member | Vivek Reddy |
| Team member | Arman Koyalkar |
| Project guide | Rajesh Adluri |
| Project acceptance | Aruja Jyothi Ma'am |

## 1. Problem

Road incidents such as accidents, potholes, damaged surfaces, faulty signals, dark stretches, obstructions and waterlogging are reported through scattered channels: phone calls, paper records, social media posts and unrelated apps. Because the reports are scattered, nobody can easily verify them, track what happened to them, see where they cluster, or study past incidents to decide where attention is needed.

## 2. What SmartRoad does

SmartRoad is a single web platform with two roles:

- **Citizens** register, report an incident with a category, description, map-picked location and an optional photo, and follow the report through its lifecycle.
- **Administrators** review, verify or reject reports, assign priority, move them to resolution, and study the data on a map, in analytics charts, through DBSCAN hotspot analysis and through a Random Forest risk estimator.

Everything the administrators see is computed from the live database. The machine-learning views show only numbers produced by an actual training run, and the pipeline ships with a clearly labelled synthetic demo dataset because no real road-incident dataset is bundled with the repository.

## 3. Objectives

1. A secure, role-based web application (JWT, bcrypt, validation, safe uploads).
2. A complete incident lifecycle: SUBMITTED, UNDER_REVIEW, VERIFIED, IN_PROGRESS, RESOLVED, plus REJECTED, enforced on the server.
3. A reusable GIS layer on Leaflet and OpenStreetMap: incident markers, filters, clustering, location picking, hotspot circles.
4. Analytics computed by MongoDB aggregations: totals, status, category, priority, severity, risk and time series.
5. Spatial hotspot detection with DBSCAN (haversine distance) on the platform's own incident coordinates.
6. A reproducible scikit-learn pipeline (baseline, Logistic Regression, Decision Tree, Random Forest) that estimates an incident risk level (LOW, MEDIUM, HIGH) from context features, with honest evaluation and a per-estimate explanation of contributing factors.
7. Tests across the stack, documentation, and a demo workflow that can be shown in a project review and defended in a viva.

## 4. Deliverables in this repository

| Part | Location | Owner |
|---|---|---|
| Express + TypeScript REST API | `backend/` | Balaji Lakshmipathi |
| React + TypeScript single-page application | `frontend/` | Vivek Reddy |
| Python training pipeline and FastAPI service | `ml/`, `data/` | Arman Koyalkar |
| Documentation | `docs/` (current), `docs/design/` (Phase 1 design record) | everyone |
| End-to-end smoke test | `tests/e2e/` | everyone |

## 5. Honesty rules that shape the product

- Nothing in the UI is a placeholder number. Empty states are shown when there is no data.
- Seed records are stored with `source: "seed"` and labelled "Demo data" in the UI; public statistics exclude them.
- The ML model is a risk-level estimator trained on historical (here: synthetic demo) data. The UI calls its output an estimate and never a prediction that an accident will happen.
- Hotspots are density clusters of reported incidents. They are not an output of the risk model.
- OpenStreetMap supplies base-map tiles and reverse geocoding only; there is no live traffic feed.

## 6. Where to read next

- `README.md`: how to install, run and demo the system.
- `docs/architecture.md`: components, request flows and technology choices.
- `docs/requirements.md`: functional and non-functional requirements with IDs.
- `docs/api.md`: the REST contract.
- `docs/database.md`, `docs/gis.md`, `docs/machine-learning.md`, `docs/security.md`, `docs/testing.md`, `docs/deployment.md`, `docs/user-manual.md`, `docs/limitations.md`, `docs/future-scope.md`.
