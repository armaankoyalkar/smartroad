"""Human-readable summary of a training run. Every number comes from the metrics document."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from training.models import FOREST


def print_summary(document: dict[str, Any], paths: dict[str, Path]) -> None:
    dataset = document["dataset"]
    flag = "DEMO / SYNTHETIC DATA" if dataset["is_demo_data"] else "real dataset"
    print(f"\nDataset: {dataset['name']} [{flag}]")
    print(f"Rows: {dataset['records']} (train {dataset['train_records']}, test {dataset['test_records']})")
    print("\nCandidate comparison (held-out test set; CV = 5-fold macro F1 on the training fold):")
    print(f"  {'model':<20}{'accuracy':>10}{'macro F1':>10}{'CV macro F1':>14}")
    for row in document["comparison"]:
        print(
            f"  {row['model']:<20}{row['accuracy']:>10.4f}{row['macro_f1']:>10.4f}"
            f"{row['cv_macro_f1']:>10.4f} +/- {row['cv_macro_f1_std']:.4f}"
        )
    print(
        f"\nShipped model: {document['selected_candidate']} ({document['model_name']}), "
        f"version {document['model_version']}"
    )
    metrics = document["metrics"]
    print(
        f"  accuracy {metrics['accuracy']:.4f}, macro F1 {metrics['macro_f1']:.4f}, "
        f"weighted F1 {metrics['weighted_f1']:.4f}"
    )
    for label, values in metrics["per_class"].items():
        print(
            f"  {label:<7} precision {values['precision']:.4f} recall {values['recall']:.4f} "
            f"f1 {values['f1']:.4f} support {values['support']}"
        )
    confusion = document["confusion_matrix"]
    print(f"  confusion matrix {confusion['labels']}: {confusion['matrix']}")
    permutation = [i for i in document["feature_importance"] if i["method"] == "permutation"][:5]
    print(
        "  top permutation importances: "
        + ", ".join(f"{i['feature']} {i['importance']:.4f}" for i in permutation)
    )
    research = document["research_model"]["metrics"]
    print(
        f"Research model (not served): accuracy {research['accuracy']:.4f}, "
        f"macro F1 {research['macro_f1']:.4f}"
    )
    print(f"Training took {document['training_seconds']} s. Artifacts:")
    for name, path in paths.items():
        print(f"  {name:<13}{path}")
    if document["selected_candidate"] != FOREST:
        print(
            f"\nNote: {document['selected_candidate']} beat the RandomForest on test macro F1 in this run, "
            "so it is the shipped model (see selection_rule in metrics.json)."
        )
    if dataset["is_demo_data"]:
        print("\nThese figures come from synthetic demo data and describe the pipeline only, not real roads.")
