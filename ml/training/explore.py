"""Step 3: exploratory summary written to artifacts/eda.json (plots only if matplotlib exists)."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

from app.constants import CATEGORICAL_FEATURES, INTEGER_FEATURES, RISK_LEVELS

log = logging.getLogger(__name__)

EARTH_RADIUS_M = 6_371_000.0
K_DISTANCE_K = 4
K_DISTANCE_SAMPLE = 5000


def _k_distance_percentiles(frame: pd.DataFrame, random_state: int) -> dict[str, float] | None:
    """Sorted k-NN distances (k = 4) in metres, as the DBSCAN paper suggests for choosing eps."""
    if not {"latitude", "longitude"}.issubset(frame.columns) or len(frame) <= K_DISTANCE_K:
        return None
    sample = (
        frame
        if len(frame) <= K_DISTANCE_SAMPLE
        else frame.sample(K_DISTANCE_SAMPLE, random_state=random_state)
    )
    coords = np.radians(sample[["latitude", "longitude"]].to_numpy(dtype=float))
    distances, _ = BallTree(coords, metric="haversine").query(coords, k=K_DISTANCE_K + 1)
    kth = np.sort(distances[:, K_DISTANCE_K] * EARTH_RADIUS_M)
    return {f"p{p}": round(float(np.percentile(kth, p)), 1) for p in (10, 25, 50, 75, 90, 95)}


def summarise(frame: pd.DataFrame, target: str, random_state: int = 42) -> dict[str, Any]:
    counts = frame[target].value_counts()
    class_counts = {level: int(counts.get(level, 0)) for level in RISK_LEVELS}
    total = int(len(frame))

    categorical: dict[str, dict[str, int]] = {}
    for column in CATEGORICAL_FEATURES:
        if column in frame.columns:
            categorical[column] = {str(k): int(v) for k, v in frame[column].value_counts().items()}

    integer: dict[str, dict[str, float]] = {}
    for column in INTEGER_FEATURES:
        if column in frame.columns:
            series = pd.to_numeric(frame[column], errors="coerce")
            integer[column] = {
                "min": float(series.min()),
                "max": float(series.max()),
                "mean": round(float(series.mean()), 4),
                "median": float(series.median()),
            }

    summary: dict[str, Any] = {
        "rows": total,
        "class_balance": {
            "counts": class_counts,
            "fractions": {k: round(v / total, 4) if total else 0.0 for k, v in class_counts.items()},
        },
        "categorical_value_counts": categorical,
        "integer_stats": integer,
        "missing_by_column": {c: int(frame[c].isna().sum()) for c in frame.columns if frame[c].isna().any()},
    }
    if {"latitude", "longitude"}.issubset(frame.columns):
        summary["bounding_box"] = {
            "lat_min": float(frame["latitude"].min()),
            "lat_max": float(frame["latitude"].max()),
            "lng_min": float(frame["longitude"].min()),
            "lng_max": float(frame["longitude"].max()),
        }
        summary["k_distance_m"] = {
            "k": K_DISTANCE_K,
            "percentiles": _k_distance_percentiles(frame, random_state),
        }
    if "timestamp" in frame.columns:
        stamps = pd.to_datetime(frame["timestamp"], errors="coerce")
        summary["timestamp_range"] = {"min": str(stamps.min()), "max": str(stamps.max())}
    return summary


def maybe_plot(frame: pd.DataFrame, target: str, out_dir: Path) -> list[str]:
    """Write a class-balance bar chart when matplotlib is importable; otherwise do nothing."""
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        log.info("matplotlib not installed; skipping EDA plots (they are optional)")
        return []
    out_dir.mkdir(parents=True, exist_ok=True)
    counts = frame[target].value_counts().reindex(RISK_LEVELS).fillna(0)
    fig, ax = plt.subplots(figsize=(4, 3))
    ax.bar(counts.index, counts.to_numpy())
    ax.set_title("Class balance (demo/seed data may apply)")
    ax.set_ylabel("rows")
    path = out_dir / "class_balance.png"
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)
    return [path.name]
