"""Step 6: candidate models as scikit-learn Pipelines (preprocessing included)."""

from __future__ import annotations

from typing import Any

from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.tree import DecisionTreeClassifier

from app.constants import CATEGORICAL_FEATURES

MAJORITY = "MajorityClass"
LOGISTIC = "LogisticRegression"
TREE = "DecisionTree"
FOREST = "RandomForest"
CANDIDATE_ORDER = [MAJORITY, LOGISTIC, TREE, FOREST]
SELECTABLE = [LOGISTIC, TREE, FOREST]  # the majority baseline is never shipped
MODEL_CODES = {LOGISTIC: "lr", TREE: "dt", FOREST: "rf"}  # short codes for the version label


def build_preprocessor(features: list[str]) -> ColumnTransformer:
    """One-hot encode categoricals (unknown values ignored at inference), pass integers through."""
    categorical = [name for name in features if name in CATEGORICAL_FEATURES]
    numeric = [name for name in features if name not in CATEGORICAL_FEATURES]
    return ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical),
            ("num", "passthrough", numeric),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )


def build_random_forest(params: dict[str, Any], random_state: int, quick: bool, quick_trees: int) -> Pipeline:
    settings = {"n_estimators": 300, "min_samples_leaf": 2, "max_features": "sqrt", **params}
    if quick:
        settings["n_estimators"] = quick_trees
    return RandomForestClassifier(class_weight="balanced", random_state=random_state, n_jobs=-1, **settings)


def build_candidates(
    features: list[str], model_params: dict[str, Any], random_state: int, quick: bool = False
) -> dict[str, Pipeline]:
    """Return the four candidates in CANDIDATE_ORDER, each wrapped in a Pipeline."""
    lr_params = {"C": 1.0, "max_iter": 5000, **dict(model_params.get("logistic_regression") or {})}
    dt_params = {"min_samples_leaf": 5, **dict(model_params.get("decision_tree") or {})}
    quick_trees = int(model_params.get("quick_n_estimators", 100))
    estimators = {
        MAJORITY: DummyClassifier(strategy="most_frequent"),
        LOGISTIC: LogisticRegression(class_weight="balanced", random_state=random_state, **lr_params),
        TREE: DecisionTreeClassifier(class_weight="balanced", random_state=random_state, **dt_params),
        FOREST: build_random_forest(
            dict(model_params.get("random_forest") or {}), random_state, quick, quick_trees
        ),
    }
    return {
        name: Pipeline([("preprocess", build_preprocessor(features)), ("model", estimator)])
        for name, estimator in estimators.items()
    }


def build_research_forest(
    features: list[str], model_params: dict[str, Any], random_state: int, quick: bool = False
) -> Pipeline:
    forest = build_random_forest(
        dict(model_params.get("random_forest") or {}),
        random_state,
        quick,
        int(model_params.get("quick_n_estimators", 100)),
    )
    return Pipeline([("preprocess", build_preprocessor(features)), ("model", forest)])


def estimator_name(pipeline: Pipeline) -> str:
    return type(pipeline.named_steps["model"]).__name__


def output_feature_origins(pipeline: Pipeline) -> list[str]:
    """For every column produced by the fitted preprocessor, the original feature it came from."""
    preprocessor: ColumnTransformer = pipeline.named_steps["preprocess"]
    origins: list[str] = []
    for _, transformer, columns in preprocessor.transformers_:
        if transformer == "drop" or len(columns) == 0:
            continue
        if isinstance(transformer, OneHotEncoder):
            for column, categories in zip(columns, transformer.categories_, strict=True):
                origins.extend([column] * len(categories))
        else:
            origins.extend(list(columns))
    return origins
