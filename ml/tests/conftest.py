"""Shared fixtures: an in-memory demo sample and a quick training run into a temporary directory."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd
import pytest

from training.config import load_config
from training.load_data import import_demo_generator
from training.models import MODEL_CODES
from training.run_pipeline import run_pipeline

SAMPLE_FEATURES: dict[str, Any] = {
    "hour": 18,
    "day_of_week": "FRI",
    "month": 11,
    "light_conditions": "DARK_LIT",
    "weather": "RAIN",
    "road_surface": "WET",
    "road_type": "ARTERIAL",
    "speed_limit": 60,
    "area_type": "URBAN",
    "category": "ACCIDENT",
}

DEMO_ROWS = 800


@pytest.fixture(scope="session")
def demo_generator():
    return import_demo_generator()


@pytest.fixture(scope="session")
def demo_frame(demo_generator) -> pd.DataFrame:
    return demo_generator.generate(rows=DEMO_ROWS, seed=42)


@pytest.fixture(scope="session")
def artifacts_dir(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """Run the pipeline once per session in --quick mode on an 800-row demo sample."""
    out = tmp_path_factory.mktemp("artifacts")
    config = load_config(out=out, quick=True, rows=DEMO_ROWS)
    run_pipeline(config)
    return out


@pytest.fixture(scope="session")
def metrics_document(artifacts_dir: Path) -> dict[str, Any]:
    return json.loads((artifacts_dir / "metrics.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="session")
def expected_version(metrics_document: dict[str, Any]) -> str:
    return f"demo-{MODEL_CODES[metrics_document['selected_candidate']]}-1.0.0"


@pytest.fixture
def sample_features() -> dict[str, Any]:
    return dict(SAMPLE_FEATURES)
