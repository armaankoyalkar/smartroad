"""Step 9: write the artifacts (model.joblib, metrics.json, baseline.json, dataset_card.json, eda.json)."""

from __future__ import annotations

import json
import platform
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.pipeline import Pipeline

from app.constants import (
    CATEGORICAL_FEATURES,
    DISCLAIMER,
    FEATURE_SCHEMA,
    INTEGER_FEATURES,
    RISK_LEVELS,
)

MODEL_FILE = "model.joblib"
METRICS_FILE = "metrics.json"
BASELINE_FILE = "baseline.json"
DATASET_CARD_FILE = "dataset_card.json"
EDA_FILE = "eda.json"


def to_jsonable(value: Any) -> Any:
    """Convert numpy/pandas scalars and containers into plain JSON types."""
    if isinstance(value, dict):
        return {str(k): to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_jsonable(v) for v in value]
    if isinstance(value, np.ndarray):
        return [to_jsonable(v) for v in value.tolist()]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, Path):
        return str(value)
    if value is pd.NA or (isinstance(value, float) and np.isnan(value)):
        return None
    return value


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(to_jsonable(payload), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def compute_baselines(x_train: pd.DataFrame) -> dict[str, Any]:
    """Per-feature baselines for the sensitivity contributions: mode (categorical), median (integer)."""
    baseline: dict[str, Any] = {}
    for column in x_train.columns:
        if column in INTEGER_FEATURES:
            baseline[column] = int(round(float(x_train[column].median())))
        elif column in CATEGORICAL_FEATURES:
            baseline[column] = str(x_train[column].mode(dropna=True).iloc[0])
    return baseline


@dataclass
class MetricsInputs:
    model_name: str
    model_version: str
    is_demo_model: bool
    dataset_card: dict[str, Any]
    preprocessing: list[str]
    class_distribution: dict[str, dict[str, int]]
    metrics: dict[str, Any]
    confusion_matrix: dict[str, Any]
    feature_importance: list[dict[str, Any]]
    comparison: list[dict[str, Any]]
    research_model: dict[str, Any]
    hotspot_defaults: dict[str, int]
    selection_rule: str
    selected_candidate: str
    validation: dict[str, Any]
    training_seconds: float


def build_metrics_document(inputs: MetricsInputs) -> dict[str, Any]:
    """Assemble the snake_case model-info object of docs/api.md section 9."""
    return {
        "model_name": inputs.model_name,
        "model_version": inputs.model_version,
        "trained_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "is_demo_model": inputs.is_demo_model,
        "dataset": inputs.dataset_card,
        "preprocessing": inputs.preprocessing,
        "features": FEATURE_SCHEMA,
        "classes": list(RISK_LEVELS),
        "class_distribution": inputs.class_distribution,
        "metrics": inputs.metrics,
        "confusion_matrix": inputs.confusion_matrix,
        "feature_importance": inputs.feature_importance,
        "comparison": inputs.comparison,
        "research_model": inputs.research_model,
        "hotspot_defaults": inputs.hotspot_defaults,
        "disclaimer": DISCLAIMER,
        "selection_rule": inputs.selection_rule,
        "selected_candidate": inputs.selected_candidate,
        "validation": inputs.validation,
        "sklearn_version": sklearn.__version__,
        "python_version": platform.python_version(),
        "training_seconds": round(inputs.training_seconds, 2),
    }


def save_artifacts(
    out_dir: Path,
    pipeline: Pipeline,
    metrics_document: dict[str, Any],
    baseline: dict[str, Any],
    eda: dict[str, Any],
) -> dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = {
        "model": out_dir / MODEL_FILE,
        "metrics": out_dir / METRICS_FILE,
        "baseline": out_dir / BASELINE_FILE,
        "dataset_card": out_dir / DATASET_CARD_FILE,
        "eda": out_dir / EDA_FILE,
    }
    joblib.dump(pipeline, paths["model"])
    write_json(paths["metrics"], metrics_document)
    write_json(paths["baseline"], baseline)
    write_json(paths["dataset_card"], metrics_document["dataset"])
    write_json(paths["eda"], eda)
    return paths


def platform_summary() -> str:
    return f"python {platform.python_version()}, scikit-learn {sklearn.__version__}"
