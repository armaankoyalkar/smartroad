"""Pipeline configuration: training/config.yaml plus command-line overrides."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from app.constants import FEATURE_NAMES

TRAINING_DIR = Path(__file__).resolve().parent
ML_DIR = TRAINING_DIR.parent
DEFAULT_CONFIG = TRAINING_DIR / "config.yaml"
DEFAULT_OUT = ML_DIR / "artifacts"
SUPPORTED_ADAPTERS = ("stats19",)


@dataclass
class PipelineConfig:
    dataset: Path | None
    adapter: str | None
    demo_rows: int
    demo_seed: int
    target: str
    random_state: int
    test_size: float
    model_version: str
    features: list[str]
    research_extra_features: list[str]
    nearby_density_radius_m: float
    cv_folds: int
    permutation_repeats: int
    models: dict[str, Any]
    dbscan: dict[str, int]
    dataset_card: dict[str, Any]
    out_dir: Path = DEFAULT_OUT
    quick: bool = False
    extra: dict[str, Any] = field(default_factory=dict)


def load_config(
    path: Path = DEFAULT_CONFIG,
    *,
    dataset: Path | None = None,
    adapter: str | None = None,
    out: Path | None = None,
    quick: bool = False,
    rows: int | None = None,
) -> PipelineConfig:
    """Read the YAML file and apply overrides. Raises ValueError on an unusable configuration."""
    raw: dict[str, Any] = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}

    features = list(raw.get("features") or FEATURE_NAMES)
    if features != FEATURE_NAMES:
        raise ValueError(
            "config features must equal the shipped schema in app/constants.py "
            f"(expected {FEATURE_NAMES}, got {features})"
        )
    chosen_adapter = adapter or raw.get("adapter")
    if chosen_adapter is not None and chosen_adapter not in SUPPORTED_ADAPTERS:
        raise ValueError(f"unknown adapter {chosen_adapter!r}; supported: {', '.join(SUPPORTED_ADAPTERS)}")

    dataset_path = dataset or (Path(raw["dataset"]) if raw.get("dataset") else None)
    if dataset_path is not None and not dataset_path.is_absolute():
        dataset_path = (ML_DIR / dataset_path).resolve()

    out_dir = out or DEFAULT_OUT
    if not out_dir.is_absolute():
        out_dir = (ML_DIR / out_dir).resolve()

    test_size = float(raw.get("test_size", 0.2))
    if not 0.05 <= test_size <= 0.5:
        raise ValueError("test_size must be between 0.05 and 0.5")

    return PipelineConfig(
        dataset=dataset_path,
        adapter=chosen_adapter,
        demo_rows=int(rows or raw.get("demo_rows", 6000)),
        demo_seed=int(raw.get("demo_seed", 42)),
        target=str(raw.get("target", "severity")),
        random_state=int(raw.get("random_state", 42)),
        test_size=test_size,
        model_version=str(raw.get("model_version", "demo-{model}-1.0.0")),
        features=features,
        research_extra_features=list(raw.get("research_extra_features") or []),
        nearby_density_radius_m=float(raw.get("nearby_density_radius_m", 500)),
        cv_folds=int(raw.get("cv_folds", 5)),
        permutation_repeats=int(raw.get("permutation_repeats", 5)),
        models=dict(raw.get("models") or {}),
        dbscan={
            "eps_m": int((raw.get("dbscan") or {}).get("eps_m", 200)),
            "min_samples": int((raw.get("dbscan") or {}).get("min_samples", 4)),
        },
        dataset_card=dict(raw.get("dataset_card") or {}),
        out_dir=out_dir,
        quick=quick,
    )
