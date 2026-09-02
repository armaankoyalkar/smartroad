"""Offline training pipeline: load, validate, explore, preprocess, split, train, evaluate, persist.

    python -m training.run_pipeline [--dataset PATH] [--adapter stats19] [--out DIR] [--quick] [--rows N]

Every number printed or written comes from this run; nothing is typed in by hand.
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path
from typing import Any

import pandas as pd
from sklearn.pipeline import Pipeline

from training.config import DEFAULT_CONFIG, PipelineConfig, load_config
from training.evaluate import (
    Evaluation,
    cross_validated_macro_f1,
    evaluate,
    impurity_importance,
    permutation_importance_by_feature,
)
from training.explore import maybe_plot, summarise
from training.load_data import load_data
from training.models import (
    FOREST,
    MODEL_CODES,
    SELECTABLE,
    build_candidates,
    build_research_forest,
    estimator_name,
)
from training.persist import MetricsInputs, build_metrics_document, compute_baselines, save_artifacts
from training.preprocess import (
    SHIPPED_FEATURES,
    add_nearby_density,
    add_time_features,
    derive_light_conditions,
    feature_frame,
)
from training.split import class_distribution, stratified_split
from training.summary import print_summary
from training.validate import ValidationReport, validate_and_clean

log = logging.getLogger("training")

SELECTION_RULE = (
    "Highest macro F1 on the held-out test set among LogisticRegression, DecisionTree and RandomForest; "
    "ties go to the earlier (simpler) candidate. MajorityClass is reported as a baseline only. "
    "Selecting on the test set is a mild optimistic bias; the cross-validated score on the training "
    "fold is reported next to it."
)
RESEARCH_NOTE = (
    "Research variant only: a RandomForest on the shipped features plus latitude, longitude and "
    "nearby_density (training-fold records within {radius:.0f} m, computed from the training fold only "
    "so test rows never shape the feature). Reported for the feature-importance discussion and never "
    "served: coordinates encode the geography of the training data and do not transfer elsewhere."
)


def preprocessing_notes(report: ValidationReport, light_derived: bool, config: PipelineConfig) -> list[str]:
    notes = []
    if report.time_source == "timestamp":
        notes.append(
            "Derived hour, day_of_week (MON..SUN) and month from the timestamp (local wall-clock time)."
        )
    else:
        notes.append("Used the hour, day_of_week and month columns supplied by the dataset.")
    if light_derived:
        notes.append(
            "light_conditions derived from the hour: DAYLIGHT for 6 <= hour < 18, otherwise DARK_LIT."
        )
    notes.append("Trimmed and upper-cased categorical values; unknown categories fail validation.")
    dropped = report.dropped_missing + report.dropped_unparseable_timestamp
    notes.append(
        f"Dropped {dropped} of {report.rows_in} rows with missing required values or unparseable timestamps."
    )
    notes.append(
        "One-hot encoded the seven categorical features (handle_unknown='ignore'); integers passed through."
    )
    notes.append(
        f"Stratified {int((1 - config.test_size) * 100)}/{int(config.test_size * 100)} train/test split, "
        f"random_state {config.random_state}."
    )
    notes.append(
        "class_weight='balanced' on LogisticRegression, DecisionTree and RandomForest (no resampling)."
    )
    return notes


def train_candidates(
    config: PipelineConfig, x_train: pd.DataFrame, y_train: pd.Series, x_test: pd.DataFrame, y_test: pd.Series
) -> tuple[dict[str, Pipeline], dict[str, Evaluation], list[dict[str, Any]]]:
    candidates = build_candidates(SHIPPED_FEATURES, config.models, config.random_state, config.quick)
    evaluations: dict[str, Evaluation] = {}
    comparison: list[dict[str, Any]] = []
    for name, pipeline in candidates.items():
        started = time.perf_counter()
        pipeline.fit(x_train, y_train)
        fit_seconds = time.perf_counter() - started
        result = evaluate(pipeline, x_test, y_test)
        cv_mean, cv_std = cross_validated_macro_f1(
            pipeline, x_train, y_train, config.cv_folds, config.random_state
        )
        evaluations[name] = result
        comparison.append(
            {
                "model": name,
                "accuracy": result.accuracy,
                "macro_f1": result.macro_f1,
                "weighted_f1": result.weighted_f1,
                "cv_macro_f1": cv_mean,
                "cv_macro_f1_std": cv_std,
                "fit_seconds": round(fit_seconds, 2),
            }
        )
        log.info(
            "%s: accuracy %.4f, macro F1 %.4f, CV macro F1 %.4f +/- %.4f",
            name,
            result.accuracy,
            result.macro_f1,
            cv_mean,
            cv_std,
        )
    return candidates, evaluations, comparison


def select_winner(evaluations: dict[str, Evaluation]) -> str:
    best = SELECTABLE[0]
    for name in SELECTABLE:
        if evaluations[name].macro_f1 > evaluations[best].macro_f1:
            best = name
    return best


def research_experiment(
    config: PipelineConfig, train: pd.DataFrame, test: pd.DataFrame, y_train: pd.Series, y_test: pd.Series
) -> dict[str, Any]:
    train, test = add_nearby_density(train, test, config.nearby_density_radius_m)
    features = SHIPPED_FEATURES + [name for name in config.research_extra_features if name in train.columns]
    pipeline = build_research_forest(features, config.models, config.random_state, config.quick)
    pipeline.fit(feature_frame(train, features), y_train)
    result = evaluate(pipeline, feature_frame(test, features), y_test)
    return {
        "features": features,
        "metrics": {
            "accuracy": result.accuracy,
            "macro_f1": result.macro_f1,
            "weighted_f1": result.weighted_f1,
        },
        "feature_importance": impurity_importance(pipeline),
        "note": RESEARCH_NOTE.format(radius=config.nearby_density_radius_m),
    }


def run_pipeline(config: PipelineConfig) -> tuple[dict[str, Any], dict[str, Path]]:
    started = time.perf_counter()
    data = load_data(config)
    frame, report = validate_and_clean(data.frame)
    frame = add_time_features(frame)
    frame, light_derived = derive_light_conditions(frame)
    eda = summarise(frame, config.target, config.random_state)
    eda["plots"] = maybe_plot(frame, config.target, config.out_dir)
    eda["validation"] = report.as_dict()

    train, test = stratified_split(frame, config.target, config.test_size, config.random_state)
    x_train, y_train = feature_frame(train, SHIPPED_FEATURES), train[config.target].astype(str)
    x_test, y_test = feature_frame(test, SHIPPED_FEATURES), test[config.target].astype(str)

    candidates, evaluations, comparison = train_candidates(config, x_train, y_train, x_test, y_test)
    winner = select_winner(evaluations)
    pipeline, result = candidates[winner], evaluations[winner]
    if winner != FOREST:
        log.warning(
            "%s had the best test macro F1 (%.4f); the RandomForest scored %.4f. Shipping %s as the "
            "documented selection rule requires.",
            winner,
            result.macro_f1,
            evaluations[FOREST].macro_f1,
            winner,
        )
    importance = (impurity_importance(pipeline) or []) + permutation_importance_by_feature(
        pipeline, x_test, y_test, config.permutation_repeats, config.random_state
    )
    research = research_experiment(config, train, test, y_train, y_test)

    card = dict(data.dataset_card)
    card.update(
        {
            "records": int(len(frame)),
            "records_before_cleaning": report.rows_in,
            "train_records": int(len(train)),
            "test_records": int(len(test)),
        }
    )
    document = build_metrics_document(
        MetricsInputs(
            model_name=estimator_name(pipeline),
            model_version=config.model_version.format(model=MODEL_CODES[winner]),
            is_demo_model=data.is_demo_data,
            dataset_card=card,
            preprocessing=preprocessing_notes(report, light_derived, config),
            class_distribution={"train": class_distribution(y_train), "test": class_distribution(y_test)},
            metrics=result.metrics_dict(),
            confusion_matrix=result.confusion,
            feature_importance=importance,
            comparison=comparison,
            research_model=research,
            hotspot_defaults={
                "eps_meters": config.dbscan["eps_m"],
                "min_samples": config.dbscan["min_samples"],
            },
            selection_rule=SELECTION_RULE,
            selected_candidate=winner,
            validation={
                **report.as_dict(),
                "light_conditions_derived": light_derived,
                "quick_mode": config.quick,
            },
            training_seconds=time.perf_counter() - started,
        )
    )
    paths = save_artifacts(config.out_dir, pipeline, document, compute_baselines(x_train), eda)
    return document, paths


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Train the SmartRoad risk model and write the artifacts.")
    parser.add_argument(
        "--config", type=Path, default=DEFAULT_CONFIG, help="YAML config (training/config.yaml)"
    )
    parser.add_argument("--dataset", type=Path, default=None, help="prepared CSV; omit to generate demo data")
    parser.add_argument("--adapter", choices=["stats19"], default=None, help="map a raw dataset first")
    parser.add_argument("--out", type=Path, default=None, help="artifacts directory (default ml/artifacts)")
    parser.add_argument("--quick", action="store_true", help="fewer trees (100) for a fast run")
    parser.add_argument("--rows", type=int, default=None, help="demo rows to generate (default from config)")
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args(argv)
    logging.basicConfig(level=args.log_level.upper(), format="%(levelname)s %(name)s: %(message)s")

    config = load_config(
        args.config,
        dataset=args.dataset,
        adapter=args.adapter,
        out=args.out,
        quick=args.quick,
        rows=args.rows,
    )
    document, paths = run_pipeline(config)
    print_summary(document, paths)
    return 0


if __name__ == "__main__":
    sys.exit(main())
