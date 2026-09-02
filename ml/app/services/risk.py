"""Risk estimation on top of the loaded pipeline: single, batch and sensitivity contributions."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd

from app.constants import FEATURE_NAMES, RISK_LEVELS
from app.model_loader import LoadedArtifacts


@dataclass(frozen=True)
class Contribution:
    feature: str
    value: Any
    effect: float


@dataclass(frozen=True)
class RiskResult:
    risk_level: str
    probabilities: dict[str, float]
    contributions: list[Contribution]


@dataclass(frozen=True)
class BatchResult:
    id: str
    risk_level: str
    probabilities: dict[str, float]


def _frame(rows: list[dict[str, Any]]) -> pd.DataFrame:
    return pd.DataFrame(rows, columns=FEATURE_NAMES)


def _predict_proba(artifacts: LoadedArtifacts, frame: pd.DataFrame) -> tuple[np.ndarray, list[str]]:
    pipeline = artifacts.pipeline
    proba = np.asarray(pipeline.predict_proba(frame), dtype=float)
    classes = [str(c) for c in pipeline.classes_]
    return proba, classes


def _probabilities(row: np.ndarray, classes: list[str]) -> dict[str, float]:
    by_class = {name: float(row[i]) for i, name in enumerate(classes)}
    return {level: round(by_class.get(level, 0.0), 6) for level in RISK_LEVELS}


def predict(artifacts: LoadedArtifacts, features: dict[str, Any]) -> RiskResult:
    """Estimate one feature vector and compute baseline-substitution contributions.

    Contributions are a local sensitivity measure: for each feature the value is replaced by
    the training-set baseline (mode for categorical, median for integer) and the change in the
    probability of the predicted class is recorded. Positive values pushed the estimate towards
    the predicted class. All 1 + n_features rows are scored in a single predict_proba call.
    """
    baseline = artifacts.baseline
    rows: list[dict[str, Any]] = [dict(features)]
    for name in FEATURE_NAMES:
        substituted = dict(features)
        substituted[name] = baseline[name]
        rows.append(substituted)

    proba, classes = _predict_proba(artifacts, _frame(rows))
    predicted = int(np.argmax(proba[0]))
    level = classes[predicted]
    p_original = float(proba[0, predicted])

    contributions = [
        Contribution(
            feature=name, value=features[name], effect=round(p_original - float(proba[i + 1, predicted]), 6)
        )
        for i, name in enumerate(FEATURE_NAMES)
    ]
    contributions.sort(key=lambda c: abs(c.effect), reverse=True)
    return RiskResult(
        risk_level=level, probabilities=_probabilities(proba[0], classes), contributions=contributions
    )


def predict_batch(artifacts: LoadedArtifacts, items: list[tuple[str, dict[str, Any]]]) -> list[BatchResult]:
    """Estimate many feature vectors in one predict_proba call (no contributions)."""
    if not items:
        return []
    proba, classes = _predict_proba(artifacts, _frame([features for _, features in items]))
    results: list[BatchResult] = []
    for (item_id, _), row in zip(items, proba, strict=True):
        predicted = int(np.argmax(row))
        results.append(
            BatchResult(id=item_id, risk_level=classes[predicted], probabilities=_probabilities(row, classes))
        )
    return results
