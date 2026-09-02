"""Step 7: evaluation on the held-out test set, feature importance and cross-validation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.inspection import permutation_importance
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_recall_fscore_support
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline

from app.constants import RISK_LEVELS
from training.models import output_feature_origins


@dataclass
class Evaluation:
    accuracy: float
    macro_f1: float
    weighted_f1: float
    per_class: dict[str, dict[str, float | int]]
    confusion: dict[str, Any]

    def metrics_dict(self) -> dict[str, Any]:
        return {
            "accuracy": self.accuracy,
            "macro_f1": self.macro_f1,
            "weighted_f1": self.weighted_f1,
            "per_class": self.per_class,
        }


def evaluate(pipeline: Pipeline, x_test: pd.DataFrame, y_test: pd.Series) -> Evaluation:
    predicted = pipeline.predict(x_test)
    labels = list(RISK_LEVELS)
    precision, recall, f1, support = precision_recall_fscore_support(
        y_test, predicted, labels=labels, zero_division=0
    )
    per_class = {
        label: {
            "precision": round(float(precision[i]), 6),
            "recall": round(float(recall[i]), 6),
            "f1": round(float(f1[i]), 6),
            "support": int(support[i]),
        }
        for i, label in enumerate(labels)
    }
    matrix = confusion_matrix(y_test, predicted, labels=labels)
    return Evaluation(
        accuracy=round(float(accuracy_score(y_test, predicted)), 6),
        macro_f1=round(
            float(f1_score(y_test, predicted, average="macro", labels=labels, zero_division=0)), 6
        ),
        weighted_f1=round(
            float(f1_score(y_test, predicted, average="weighted", labels=labels, zero_division=0)), 6
        ),
        per_class=per_class,
        confusion={"labels": labels, "matrix": [[int(v) for v in row] for row in matrix]},
    )


def impurity_importance(pipeline: Pipeline) -> list[dict[str, Any]] | None:
    """Impurity importances of a tree model aggregated back to the original feature names."""
    model = pipeline.named_steps["model"]
    raw = getattr(model, "feature_importances_", None)
    if raw is None:
        return None
    origins = output_feature_origins(pipeline)
    totals: dict[str, float] = {}
    for origin, value in zip(origins, raw, strict=True):
        totals[origin] = totals.get(origin, 0.0) + float(value)
    items = [
        {"feature": name, "importance": round(value, 6), "method": "impurity"}
        for name, value in totals.items()
    ]
    return sorted(items, key=lambda item: item["importance"], reverse=True)


def permutation_importance_by_feature(
    pipeline: Pipeline, x_test: pd.DataFrame, y_test: pd.Series, n_repeats: int, random_state: int
) -> list[dict[str, Any]]:
    """Permutation importance (macro F1 drop) on the test set, one entry per original feature."""
    result = permutation_importance(
        pipeline, x_test, y_test, scoring="f1_macro", n_repeats=n_repeats, random_state=random_state, n_jobs=1
    )
    items = [
        {
            "feature": name,
            "importance": round(float(result.importances_mean[i]), 6),
            "importance_std": round(float(result.importances_std[i]), 6),
            "method": "permutation",
        }
        for i, name in enumerate(x_test.columns)
    ]
    return sorted(items, key=lambda item: item["importance"], reverse=True)


def cross_validated_macro_f1(
    pipeline: Pipeline, x_train: pd.DataFrame, y_train: pd.Series, folds: int, random_state: int
) -> tuple[float, float]:
    splitter = StratifiedKFold(n_splits=folds, shuffle=True, random_state=random_state)
    scores = cross_val_score(clone(pipeline), x_train, y_train, cv=splitter, scoring="f1_macro", n_jobs=1)
    return round(float(np.mean(scores)), 6), round(float(np.std(scores)), 6)
