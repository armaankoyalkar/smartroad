"""A quick-mode run on 800 demo rows writes every artifact the contract needs."""

from __future__ import annotations

import json

from app.constants import DISCLAIMER, FEATURE_NAMES, FEATURE_SCHEMA, RISK_LEVELS
from app.schemas import ModelInfo
from training.models import CANDIDATE_ORDER, SELECTABLE
from training.run_pipeline import main

REQUIRED_KEYS = [
    "model_name",
    "model_version",
    "trained_at",
    "is_demo_model",
    "dataset",
    "preprocessing",
    "features",
    "classes",
    "class_distribution",
    "metrics",
    "confusion_matrix",
    "feature_importance",
    "comparison",
    "research_model",
    "hotspot_defaults",
    "disclaimer",
    "sklearn_version",
    "python_version",
    "training_seconds",
]


def test_artifact_files_exist(artifacts_dir):
    for name in ("model.joblib", "metrics.json", "baseline.json", "dataset_card.json", "eda.json"):
        assert (artifacts_dir / name).is_file(), name


def test_metrics_document_has_every_contract_key(metrics_document, expected_version):
    missing = [key for key in REQUIRED_KEYS if key not in metrics_document]
    assert not missing, missing
    ModelInfo.model_validate(metrics_document)  # the service's response model accepts it
    assert metrics_document["classes"] == RISK_LEVELS
    assert metrics_document["features"] == FEATURE_SCHEMA
    assert metrics_document["disclaimer"] == DISCLAIMER
    assert metrics_document["hotspot_defaults"] == {"eps_meters": 200, "min_samples": 4}
    assert metrics_document["model_version"] == expected_version


def test_demo_run_is_labelled_honestly(metrics_document):
    assert metrics_document["is_demo_model"] is True
    dataset = metrics_document["dataset"]
    assert dataset["is_demo_data"] is True
    assert dataset["records"] == 800
    assert dataset["train_records"] + dataset["test_records"] == dataset["records"]
    assert dataset["test_records"] == 160
    assert metrics_document["validation"]["quick_mode"] is True


def test_metrics_are_within_unit_interval(metrics_document):
    metrics = metrics_document["metrics"]
    for key in ("accuracy", "macro_f1", "weighted_f1"):
        assert 0.0 <= metrics[key] <= 1.0, key
    for label in RISK_LEVELS:
        per_class = metrics["per_class"][label]
        for key in ("precision", "recall", "f1"):
            assert 0.0 <= per_class[key] <= 1.0
    for row in metrics_document["comparison"]:
        assert 0.0 <= row["accuracy"] <= 1.0
        assert 0.0 <= row["macro_f1"] <= 1.0
        assert 0.0 <= row["cv_macro_f1"] <= 1.0


def test_confusion_matrix_and_support_sum_to_test_records(metrics_document):
    test_records = metrics_document["dataset"]["test_records"]
    confusion = metrics_document["confusion_matrix"]
    assert confusion["labels"] == RISK_LEVELS
    assert sum(sum(row) for row in confusion["matrix"]) == test_records
    supports = [v["support"] for v in metrics_document["metrics"]["per_class"].values()]
    assert sum(supports) == test_records
    assert sum(metrics_document["class_distribution"]["test"].values()) == test_records
    assert sum(metrics_document["class_distribution"]["train"].values()) == 640


def test_winner_beats_the_majority_baseline(metrics_document):
    rows = {row["model"]: row for row in metrics_document["comparison"]}
    assert list(rows) == CANDIDATE_ORDER
    winner = metrics_document["selected_candidate"]
    assert winner in SELECTABLE
    assert rows[winner]["macro_f1"] > rows["MajorityClass"]["macro_f1"]
    assert rows[winner]["macro_f1"] == max(rows[name]["macro_f1"] for name in SELECTABLE)
    assert rows[winner]["macro_f1"] == metrics_document["metrics"]["macro_f1"]
    assert metrics_document["model_name"].endswith("Classifier")


def test_feature_importance_covers_every_feature_with_both_methods(metrics_document):
    by_method: dict[str, set[str]] = {}
    for item in metrics_document["feature_importance"]:
        by_method.setdefault(item["method"], set()).add(item["feature"])
    assert by_method["permutation"] == set(FEATURE_NAMES)
    if metrics_document["model_name"] in ("RandomForestClassifier", "DecisionTreeClassifier"):
        assert by_method["impurity"] == set(FEATURE_NAMES)


def test_research_model_is_separate_and_not_served(metrics_document):
    research = metrics_document["research_model"]
    assert set(FEATURE_NAMES) < set(research["features"])
    assert {"latitude", "longitude", "nearby_density"} <= set(research["features"])
    assert 0.0 <= research["metrics"]["macro_f1"] <= 1.0
    assert "never served" in research["note"]


def test_baseline_and_eda_artifacts(artifacts_dir, metrics_document):
    baseline = json.loads((artifacts_dir / "baseline.json").read_text(encoding="utf-8"))
    assert set(baseline) == set(FEATURE_NAMES)
    for spec in FEATURE_SCHEMA:
        value = baseline[spec["name"]]
        if spec["type"] == "integer":
            assert spec["min"] <= value <= spec["max"]
        else:
            assert value in spec["values"]
    eda = json.loads((artifacts_dir / "eda.json").read_text(encoding="utf-8"))
    assert sum(eda["class_balance"]["counts"].values()) == metrics_document["dataset"]["records"]
    assert "k_distance_m" in eda
    card = json.loads((artifacts_dir / "dataset_card.json").read_text(encoding="utf-8"))
    assert card == metrics_document["dataset"]


def test_cli_entry_point_prints_the_summary(tmp_path, capsys):
    assert main(["--quick", "--rows", "300", "--out", str(tmp_path)]) == 0
    out = capsys.readouterr().out
    assert "DEMO / SYNTHETIC DATA" in out
    assert "Candidate comparison" in out and "Shipped model:" in out
    assert (tmp_path / "metrics.json").is_file()
