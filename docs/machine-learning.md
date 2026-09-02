# SmartRoad machine learning

Two machine-learning components exist: a **risk-level estimator** (a supervised classifier trained offline by a reproducible scikit-learn pipeline and served by a FastAPI service) and **hotspot detection** (DBSCAN over the platform's own incident coordinates, described in `docs/gis.md` section 5). This document covers the estimator, the dataset, the evaluation actually obtained, and the serving path. Every number below is copied from `ml/artifacts/metrics.json` written by the training run of 2 September 2026; re-running `npm run ml:train` regenerates the file and the admin risk page reads it, never this document.

## 1. What "risk" means

Decision D-15 (`docs/design/01-requirements.md`) and D-32 (`docs/requirements.md`): the risk level is the **severity class an incident is estimated to have given its context**, learned from historical records where the outcome severity is known. The output answers "given these conditions, how serious is an incident likely to be?" It does not answer "will an accident happen here?", and the interface labels every output "Estimate from historical data" with the model version and a demo-model notice.

## 2. Dataset

**No real dataset is bundled and none is downloaded by the build.** The pipeline trains on a synthetic demo dataset produced by `data/generate_demo_dataset.py` (seed 42, 6000 rows) and documented in the dataset card in `data/README.md`. Summary:

| Item | Value |
|---|---|
| Name | SmartRoad demo incident dataset (synthetic) |
| Records | 6000 (0 dropped by validation) |
| Columns | timestamp, latitude, longitude, light_conditions, weather, road_surface, road_type, speed_limit, area_type, category, severity |
| Target | `severity` in LOW, MEDIUM, HIGH from a documented stochastic rule: additive contributions (speed limit, darkness, wet or flooded surface, rain or fog, highway or junction, accident-like categories, late-night hours, weekends, rural area, spatial cluster membership) plus interaction terms that only count when conditions coincide (darkness with a wet or flooded surface, a speed limit of 80 km/h or more in darkness or rain, a junction late at night, a highway in fog, an accident or unsafe-road report at high speed, a weekend night), Gaussian noise (sigma 0.6), and two thresholds |
| Class balance | LOW 3262 (54.4%), MEDIUM 1843 (30.7%), HIGH 895 (14.9%) |
| Coverage | synthetic points inside the Hyderabad bounding box (17.30 to 17.52 N, 78.30 to 78.60 E) with a few deliberate spatial clusters; synthetic timestamps over 24 months |
| Limitations | entirely synthetic; the target is a rule, not an observed outcome; metrics show that the pipeline works and say nothing about real roads; which model wins reflects the shape of the rule |

Replacing the demo data: `ml/training/config.yaml` accepts a prepared CSV in the documented schema, and `ml/training/adapters/stats19.py` maps the UK STATS19 collisions schema (accident severity 1/2/3 to HIGH/MEDIUM/LOW, light, weather, surface, road type, speed limit, urban/rural, date, time, coordinates) into it. The adapter is unit-tested on an inline fixture; downloading the data and completing the dataset card is a team task before any real-data claim is made.

## 3. Pipeline

`python -m training.run_pipeline` (or `npm run ml:train`) runs, in order:

1. **Load** (`load_data.py`): the configured CSV, or the in-memory demo generator when `dataset` is null (the run is then flagged `is_demo_data`).
2. **Validate** (`validate.py`): required columns, enum vocabularies, numeric ranges, timestamps, missing values; all three classes must be present. The cleaning report is stored in `metrics.json` under `validation`.
3. **Explore** (`explore.py`): row count, class balance, per-feature value counts and ranges, written to `artifacts/eda.json` (plots only if matplotlib is installed; it is optional).
4. **Preprocess** (`preprocess.py`): derive `hour`, `day_of_week` (MON to SUN) and `month` from the timestamp; normalise categorical values; assemble the ten shipped features. The research feature set adds `latitude`, `longitude` and `nearby_density` (count of training-fold records within 500 m, computed with a BallTree over the training fold only so the test fold cannot leak).
5. **Split** (`split.py`): stratified 80/20, `random_state = 42`.
6. **Models** (`models.py`): each candidate is a scikit-learn `Pipeline` with a `ColumnTransformer` (one-hot encoding with `handle_unknown="ignore"` for the seven categorical features, pass-through for the three integers): a majority-class baseline, `LogisticRegression` (class_weight balanced), `DecisionTreeClassifier` (balanced) and `RandomForestClassifier` (300 trees, balanced, `random_state = 42`).
7. **Evaluate** (`evaluate.py`): accuracy, macro and weighted F1, per-class precision, recall, F1 and support, confusion matrix, impurity-based feature importances aggregated back to the original feature names (tree models), permutation importance on the test set (5 repeats, seed 42), and 5-fold stratified cross-validated macro F1 on the training fold.
8. **Select and persist** (`persist.py`): the candidate with the highest test macro F1 among LR, DT and RF is shipped (ties to the simpler model). Selecting on the test set is a mild optimistic bias, stated in `selection_rule`; the cross-validated score is reported next to it. Outputs: `model.joblib` (the whole pipeline), `metrics.json` (the model-info object of `docs/api.md` section 9), `baseline.json` (per-feature baselines for the sensitivity explanation), `dataset_card.json`, `eda.json`.

Class imbalance is handled with `class_weight="balanced"` and stratified splitting; no resampling is used. Random seeds are fixed everywhere, so a run is reproducible on the same library versions (scikit-learn 1.9.0, Python 3.14.7 during development).

## 4. Results of the training run (demo data)

Held-out test set: 1200 records (LOW 652, MEDIUM 369, HIGH 179). Training set: 4800 (LOW 2610, MEDIUM 1474, HIGH 716).

| Candidate | Accuracy | Macro F1 (test) | Weighted F1 | CV macro F1 (5-fold, train) |
|---|---|---|---|---|
| Majority class (baseline) | 0.5433 | 0.2347 | 0.3826 | 0.2348 |
| Logistic Regression | 0.6933 | 0.6781 | 0.7000 | 0.6944 ± 0.0060 |
| Decision Tree | 0.6367 | 0.6133 | 0.6459 | 0.6016 ± 0.0085 |
| **Random Forest (shipped, `demo-rf-1.0.0`)** | **0.7092** | **0.6875** | **0.7140** | 0.6793 ± 0.0062 |

The Random Forest wins on the selection metric. The Logistic Regression has a slightly higher cross-validated score on the training fold (0.6944 vs 0.6793); the margin is small and the pipeline reports both rather than claiming that one model is generally better. Before interaction terms were added to the synthetic rule, the Logistic Regression won (macro F1 0.6509 vs 0.6172); that history is recorded here because it shows how strongly the outcome depends on the shape of the synthetic rule.

Per-class results of the shipped model:

| Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| LOW | 0.847 | 0.771 | 0.807 | 652 |
| MEDIUM | 0.531 | 0.585 | 0.557 | 369 |
| HIGH | 0.663 | 0.737 | 0.698 | 179 |

Confusion matrix (rows = actual, columns = estimated; order LOW, MEDIUM, HIGH):

| | LOW | MEDIUM | HIGH |
|---|---|---|---|
| **LOW** | 503 | 144 | 5 |
| **MEDIUM** | 91 | 216 | 62 |
| **HIGH** | 0 | 47 | 132 |

No HIGH record was estimated as LOW and only five LOW records were estimated as HIGH; the confusion sits between neighbouring classes, which is what the noisy thresholded rule should produce. MEDIUM is the hardest class, as expected for a middle band.

Feature importance of the shipped model (permutation importance on the test set, decrease in macro F1; impurity importance in brackets):

| Feature | Permutation | Impurity |
|---|---|---|
| light_conditions | 0.124 | 0.120 |
| road_type | 0.122 | 0.167 |
| category | 0.072 | 0.168 |
| speed_limit | 0.067 | 0.144 |
| road_surface | 0.040 | 0.057 |
| hour | 0.014 | 0.110 |
| weather | 0.013 | 0.049 |
| day_of_week | 0.006 | 0.093 |
| month | 0.004 | 0.076 |
| area_type | -0.001 | 0.017 |

Permutation importance is the more trustworthy of the two (impurity importance favours high-cardinality features such as hour and day of week). The ranking mirrors the generator's rule, which is the expected outcome on synthetic data.

Research model (Random Forest with latitude, longitude and nearby_density added; reported for the feature-importance discussion, never served): accuracy 0.7108, macro F1 0.6892. Its top impurity importances are road_type, category, speed_limit, latitude and longitude. The shipped model excludes coordinates because a model trained on one geography does not transfer to another.

## 5. Serving

The FastAPI service (`ml/app`) loads the artifacts at start-up and exposes `/health`, `/model/info`, `/estimate/risk`, `/estimate/risk/batch` and `/hotspots` (contract in `docs/api.md` section 10). Only the Express backend calls it, with a shared `X-API-Key` in deployment. Without artifacts the service starts, `/health` reports `model_loaded: false`, the estimate routes return 503 with "Model artifacts not found. Run the training pipeline first.", and `/hotspots` keeps working.

Each estimate returns the level, the three class probabilities, the model version, the demo flag, a disclaimer and **contributing factors (sensitivity)**: for each feature, the change in the probability of the estimated class when that feature is replaced by its training baseline (mode for categorical features, median for integers), sorted by absolute effect. This is a simple local sensitivity measure that is easy to explain; it is not SHAP.

The backend integrates the estimator in three places (`docs/api.md` section 9): a form on the admin risk page (all ten features typed by the administrator), an estimate for a stored incident (`hour`, `day_of_week`, `month` from `createdAt` in `ANALYTICS_TIMEZONE`, `category` from the record, `light_conditions` approximated from the hour, `road_surface` FLOODED for waterlogging reports, and assumed defaults for weather, road type, speed limit and area type, all listed as assumed in the response and shown as such in the interface), and a batch refresh that stores an estimate on every non-rejected incident so the map, the incident list and the analytics can show the distribution.

## 6. Tests

`npm run ml:test` runs 77 pytest tests (about 20 seconds): demo generator (determinism, schema, vocabulary sync with the service constants, class-balance bounds, rule sanity including the interaction terms), validation, preprocessing (time features, light derivation, BallTree leakage guard), the whole pipeline in `--quick` mode on an 800-row sample into a temporary directory (all artifacts present, every contract key, metrics in range, confusion matrix sums to the test size, the winner beats the majority baseline), prediction (valid level, probabilities sum to one, contributions cover every feature, batch equals single), DBSCAN (two clusters plus noise, radius floor, fewer than `min_samples`, eps in metres), the HTTP API through the FastAPI TestClient (health without artifacts, 503 detail, model-info shape, 422 cases, API-key enforcement) and the STATS19 adapter.

## 7. Honesty statement for the report and the viva

- The metrics above measure how well the pipeline recovers a rule the team wrote. They are not evidence about road safety.
- The shipped model is whichever candidate wins the documented selection rule on the data at hand; the version label (`demo-rf-1.0.0`, `demo-lr-1.0.0`, `demo-dt-1.0.0`) names it, and the risk page displays the comparison table so nobody has to trust a single number.
- Replacing the demo data with a licensed real dataset is the first item in `docs/future-scope.md`; the pipeline, the dataset card and the STATS19 adapter exist so that step is a data task, not a rewrite.
