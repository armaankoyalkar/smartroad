# ml/artifacts

Outputs of the training pipeline. Everything here except this README and `.gitkeep` is
git-ignored (see the root `.gitignore`): artifacts are regenerated, never committed.

Regenerate with (from `ml/`, using `ml/.venv`):

```
python -m training.run_pipeline            # full run, ~10 s on the demo dataset
python -m training.run_pipeline --quick    # 100 trees instead of 300
```

| File | Written by | Read by | Content |
|---|---|---|---|
| `model.joblib` | `training/persist.py` | `app/model_loader.py` | The winning scikit-learn `Pipeline` (ColumnTransformer preprocessing + classifier). |
| `metrics.json` | `training/persist.py` | `GET /model/info` | The snake_case model-info object of `docs/api.md` section 9: dataset card, preprocessing notes, feature schema, metrics, confusion matrix, feature importance, candidate comparison, research-model result, hotspot defaults, disclaimer, versions, training time. |
| `baseline.json` | `training/persist.py` | `app/services/risk.py` | Per-feature training baselines (mode for categorical, median for integer) used for the sensitivity contributions. |
| `dataset_card.json` | `training/persist.py` | people | The `dataset` block of `metrics.json` on its own. |
| `eda.json` | `training/explore.py` | people | Row count, class balance, per-feature value counts and ranges, bounding box, timestamp range, k-distance percentiles (k = 4) for choosing DBSCAN `eps`, validation report. |
| `class_balance.png` | `training/explore.py` | people | Only when matplotlib is installed (it is optional and not in `requirements.txt`). |

When `metrics.json` says `"is_demo_model": true` and `dataset.is_demo_data` is `true`, the
artifacts were trained on the synthetic demo dataset from `data/generate_demo_dataset.py`.
Their numbers describe the pipeline, not any real road.

The FastAPI service loads the first three files at start-up. If any is missing, `GET /health`
reports `model_loaded: false` and the estimation routes answer 503 until the pipeline has run.
