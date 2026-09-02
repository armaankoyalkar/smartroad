# SmartRoad ML service and training pipeline

Python part of SmartRoad: an offline scikit-learn pipeline that trains a LOW / MEDIUM / HIGH
risk-level classifier and evaluates it honestly, plus a FastAPI service that serves the trained
artifacts and DBSCAN clusters of reported incidents to the Express backend. The contract is
`docs/api.md` sections 9 and 10; the rationale is `docs/design/02-architecture.md` sections 6 and 7.

**What DEMO means.** No real dataset ships with the repository and none is downloaded. By default the
pipeline trains on a synthetic dataset produced by `data/generate_demo_dataset.py` (documented in
`data/README.md`). Every artifact carries `is_demo_model: true` and `dataset.is_demo_data: true`, the
service returns those flags on every answer, and the numbers describe the pipeline only, not any
real road. The section "Training on a real dataset" below explains how to replace the demo data.

## Layout

```
ml/
  app/                 FastAPI service (loads artifacts; no CORS, backend-only)
    main.py            app factory + lifespan, config.py, constants.py (vocabulary, feature schema),
    schemas.py         pydantic request/response models, security.py (X-API-Key), model_loader.py,
    routers/           health.py, model.py, estimate.py, hotspots.py
    services/          risk.py (predict, batch, sensitivity contributions), hotspots.py (DBSCAN)
  training/            offline pipeline: python -m training.run_pipeline
    config.yaml        dataset path (null = demo), seeds, split, model parameters, dataset card slots
    load_data.py  validate.py  explore.py  preprocess.py  split.py  models.py  evaluate.py  persist.py
    adapters/stats19.py  column mapping for the UK STATS19 collisions CSV (tested on an inline fixture)
  artifacts/           outputs of a training run (git-ignored, see artifacts/README.md)
  tests/               pytest suite
  .env.example         ML_HOST, ML_PORT, ML_API_KEY, ML_ARTIFACTS_DIR, ML_LOG_LEVEL
```

## Install

Python 3.11 or newer (the project machine runs 3.14). From `ml/`:

```
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt   # Windows
.venv/bin/python -m pip install -r requirements.txt -r requirements-dev.txt          # macOS/Linux
```

or, from the repository root, `npm run install:ml` (wraps the same steps through `scripts/ml.js`).
All commands below assume the venv interpreter (`.venv\Scripts\python.exe` on Windows).

## Generate the demo dataset (optional)

```
python ../data/generate_demo_dataset.py            # writes data/processed/demo_incidents.csv (6000 rows)
python ../data/generate_demo_dataset.py --rows 800 --seed 7 --out /tmp/small.csv
```

The pipeline generates the same rows in memory when `dataset` is `null`, so this step is only
needed when you want the CSV itself. The output directory is git-ignored.

## Train

```
python -m training.run_pipeline                 # demo data, 300 trees, writes ml/artifacts/
python -m training.run_pipeline --quick         # 100 trees (used by the tests on an 800-row sample)
python -m training.run_pipeline --rows 2000     # smaller demo sample
python -m training.run_pipeline --out /some/dir
python -m training.run_pipeline --dataset path/prepared.csv                    # real prepared CSV
python -m training.run_pipeline --dataset path/stats19.csv --adapter stats19   # raw STATS19 export
```

Steps, in order: load (or generate), validate and clean (schema, enum and range checks with clear
errors; rows with missing required values are dropped and counted), explore (`eda.json`),
preprocess (hour, day_of_week, month from the timestamp; light_conditions derived from the hour only
when the dataset has no such column), stratified 80/20 split with `random_state = 42`, train the four
candidates, evaluate, persist. Candidates are scikit-learn `Pipeline`s with a `ColumnTransformer`
(`OneHotEncoder(handle_unknown="ignore")` for the seven categoricals, passthrough for the three
integers):

| Candidate | Estimator | Notes |
|---|---|---|
| MajorityClass | `DummyClassifier(most_frequent)` | baseline only, never shipped |
| LogisticRegression | `class_weight="balanced"`, `max_iter=5000` | |
| DecisionTree | `class_weight="balanced"`, `min_samples_leaf=5` | |
| RandomForest | 300 trees (100 with `--quick`), `class_weight="balanced"`, `min_samples_leaf=2`, `max_features="sqrt"` | |

Every candidate is scored on the held-out test set (accuracy, macro F1, weighted F1, per-class
precision/recall/F1/support, confusion matrix) and with 5-fold stratified cross-validation on the
training fold (macro F1 mean and standard deviation). **Selection rule:** the candidate with the
highest test macro F1 among LogisticRegression, DecisionTree and RandomForest is written to
`model.joblib`; `metrics.json` records the rule (`selection_rule`), the winner
(`selected_candidate`, `model_name`) and the full comparison. Selecting on the test set is a mild
optimistic bias, which is why the cross-validated score is shown next to it. The shipped model is
whichever candidate wins on test macro F1; nothing in the pipeline prefers the RandomForest. If the
forest is not the winner the run says so and ships the winner anyway. On the demo dataset the margin
between LogisticRegression and RandomForest is small: the synthetic severity rule is additive plus a
few documented interaction terms (`data/README.md`), so either can win depending on the sample, and
the two may disagree with the cross-validated ranking. Read the numbers from `metrics.json` of the
run you have; this README does not quote them.

The version label is `demo-{model}-1.0.0` with `{model}` set from the shipped candidate:
`demo-lr-1.0.0` for LogisticRegression, `demo-dt-1.0.0` for DecisionTree, `demo-rf-1.0.0` for
RandomForest. `model_version` and `model_name` in `metrics.json` (and therefore `/health` and
`/model/info`) always describe the model actually written to `model.joblib`.

Also produced: impurity importances (tree models, aggregated back to the ten original features),
permutation importance on the test set (macro F1 drop, 5 repeats, seed 42), per-feature baselines
for the service's contributions, and a **research model** that is never served: a RandomForest on
the ten shipped features plus `latitude`, `longitude` and `nearby_density` (number of training-fold
records within 500 m, computed with a BallTree built from the training fold only so test rows never
shape the feature). Its metrics are reported separately in `research_model`.

The run prints a summary and writes `model.joblib`, `metrics.json`, `baseline.json`,
`dataset_card.json`, `eda.json` (see `artifacts/README.md`). Nothing in the summary is typed in by hand.

## Serve

```
copy .env.example .env      # Windows (cp on macOS/Linux); leave ML_API_KEY empty for local development
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

or `node scripts/ml.js serve` from the repository root (reads `ml/.env`, used by `npm run dev`).

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | `{ status, model_loaded, model_version, is_demo_model }`; no API key needed |
| GET | `/model/info` | `metrics.json` (docs/api.md section 9 in snake_case) |
| POST | `/estimate/risk` | `{ "features": { ...ten features... } }` -> level, probabilities, contributions, disclaimer |
| POST | `/estimate/risk/batch` | `{ "items": [{ "id", "features" }] }` (max 5000) -> results per id |
| POST | `/hotspots` | `{ "points": [{ "id", "lat", "lng" }], "eps_m": 200, "min_samples": 4 }` (max 20000) -> DBSCAN clusters |

- `X-API-Key` is required on every route except `/health` when `ML_API_KEY` is set (it must equal
  the backend's `ML_SERVICE_API_KEY`). When it is empty the check is skipped and a warning is logged.
- Malformed input (out-of-range integers, unknown categories, missing features, too many items)
  returns 422 from pydantic. Categorical values are trimmed and upper-cased before checking.
- Without artifacts `/health` reports `model_loaded: false`; `/model/info` and `/estimate/*` return
  503 `{ "detail": "Model artifacts not found. Run the training pipeline first." }`; `/hotspots`
  keeps working because DBSCAN needs no trained model.
- `contributions` are a local sensitivity measure, not SHAP: each feature is replaced by its
  training baseline (mode for categorical, median for integer) and the change in the probability of
  the predicted class is recorded; positive values pushed the estimate towards the predicted class.
  They are sorted by absolute effect.
- Hotspots: `DBSCAN(metric="haversine")` on radians with `eps = eps_m / 6371000`. Each cluster has a
  centroid (mean latitude/longitude), `radius_m` (largest haversine distance from the centroid to a
  member, floored at 30 m), `count` and `member_ids`; the rest are `noise_ids`. Clusters are ordered
  by size. With fewer than `min_samples` points there are zero clusters. These are clusters of
  reported incidents, not an output of the risk model.

## Test and lint

```
python -m pytest -q          # trains a quick model on 800 demo rows once per session (about 10 s)
python -m ruff check .
python -m ruff format --check .
```

`node scripts/check-phrases.mjs` (from the root) scans `ml/app` and `ml/training` for wording the
project does not use.

## Training on a real dataset

1. Prepare a CSV in the schema documented in `data/README.md` (or use `--adapter stats19` on a raw
   STATS19 collisions export; `training/adapters/stats19.py` documents every code mapping).
2. Fill in every `dataset_card` field in `training/config.yaml` (name, source, url, access date,
   licence, target definition, coverage, limitations). The pipeline refuses to train on a real CSV
   with an incomplete card.
3. Run `python -m training.run_pipeline --dataset <path>`; the artifacts then carry
   `is_demo_model: false` and the card you wrote.

The shipped model only ever uses the ten transferable features of `docs/api.md` section 9, never raw
coordinates, so it can be applied to SmartRoad incidents regardless of where the training data came from.
