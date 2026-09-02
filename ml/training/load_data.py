"""Step 1: load the prepared CSV, or generate the DEMO dataset when no dataset is configured."""

from __future__ import annotations

import importlib.util
import logging
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import Any

import pandas as pd

from training.adapters import stats19
from training.config import PipelineConfig

log = logging.getLogger(__name__)

DEMO_GENERATOR = Path(__file__).resolve().parents[2] / "data" / "generate_demo_dataset.py"
REQUIRED_CARD_FIELDS = (
    "name",
    "source",
    "licence",
    "target_definition",
    "geographic_coverage",
    "temporal_coverage",
)


@dataclass
class LoadedData:
    frame: pd.DataFrame
    dataset_card: dict[str, Any]
    is_demo_data: bool
    source_path: Path | None


def import_demo_generator(path: Path = DEMO_GENERATOR) -> ModuleType:
    """Import data/generate_demo_dataset.py by file path (data/ is not a package)."""
    spec = importlib.util.spec_from_file_location("generate_demo_dataset", path)
    if spec is None or spec.loader is None:
        raise FileNotFoundError(f"demo generator not found at {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_demo(rows: int, seed: int) -> LoadedData:
    generator = import_demo_generator()
    frame = generator.generate(rows=rows, seed=seed)
    card = dict(generator.DATASET_CARD)
    card["is_demo_data"] = True
    log.info("DEMO DATA: generated %d synthetic rows (seed %d)", len(frame), seed)
    return LoadedData(frame=frame, dataset_card=card, is_demo_data=True, source_path=None)


def load_csv(path: Path, adapter: str | None = None) -> pd.DataFrame:
    if not path.is_file():
        raise FileNotFoundError(f"dataset not found: {path}")
    frame = pd.read_csv(path, low_memory=False)
    if adapter == "stats19":
        frame = stats19.map_stats19_collisions(frame)
    elif adapter is not None:
        raise ValueError(f"unknown adapter {adapter!r}")
    return frame


def real_dataset_card(config_card: dict[str, Any]) -> dict[str, Any]:
    missing = [key for key in REQUIRED_CARD_FIELDS if not config_card.get(key)]
    if missing:
        raise ValueError(
            "training on a real dataset requires a completed dataset_card in training/config.yaml; "
            f"missing: {', '.join(missing)}"
        )
    card = {
        "name": config_card["name"],
        "is_demo_data": False,
        "source": config_card["source"],
        "url": config_card.get("url"),
        "access_date": config_card.get("access_date"),
        "licence": config_card["licence"],
        "target_definition": config_card["target_definition"],
        "geographic_coverage": config_card["geographic_coverage"],
        "temporal_coverage": config_card["temporal_coverage"],
        "limitations": list(config_card.get("limitations") or []),
    }
    return card


def load_data(config: PipelineConfig) -> LoadedData:
    if config.dataset is None:
        return load_demo(rows=config.demo_rows, seed=config.demo_seed)
    frame = load_csv(config.dataset, config.adapter)
    log.info("Loaded %d rows from %s (adapter: %s)", len(frame), config.dataset, config.adapter)
    return LoadedData(
        frame=frame,
        dataset_card=real_dataset_card(config.dataset_card),
        is_demo_data=False,
        source_path=config.dataset,
    )
