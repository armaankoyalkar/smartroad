#!/usr/bin/env python
"""Generate the SmartRoad DEMO incident dataset.

Everything this script writes is SYNTHETIC. No real road, incident, person or
measurement is represented. The dataset exists only so that the ML pipeline in
`ml/training/` can be run end to end and its outputs demonstrated. Metrics
obtained on it describe the pipeline, not any real road network.

Usage (from the repository root or from ml/):

    python data/generate_demo_dataset.py [--rows 6000] [--seed 42] [--out data/processed/demo_incidents.csv]

Columns written (the "prepared CSV" schema documented in data/README.md):
    timestamp, latitude, longitude, light_conditions, weather, road_surface,
    road_type, speed_limit, area_type, category, severity

How the rows are made (all draws come from numpy's default_rng seeded with --seed):
    * Coordinates: about 35 % of rows are drawn from eight Gaussian clusters
      (sigma about 165 m) inside the Hyderabad bounding box 17.30..17.52 N,
      78.30..78.60 E; the rest are uniform inside the box. The clusters give the
      research model's nearby_density feature something to measure.
    * Timestamps: a random day inside 24 months starting 2024-09-01, an hour drawn
      from a day/night weighting, a uniform minute. Written as local wall-clock
      ISO 8601 without a UTC offset.
    * Weather depends on the month (monsoon June..September has more rain, winter
      has more fog), road surface depends on weather, speed limit depends on road
      type, light conditions depend on hour and area type, category weights change
      when the surface is flooded (waterlogging becomes likely).
    * Severity (the target) follows the documented stochastic rule below: a
      score adds fixed contributions for higher speed limits, darkness, wet or
      flooded surfaces, rain or fog, highways and junctions, accident-like
      categories, late-night hours, weekends, rural areas and cluster membership,
      then Gaussian noise (sigma 0.6) is added and the score is cut at two fixed
      thresholds. The noise keeps every model well below 100 % accuracy; HIGH is a
      minority class (documented bound: 12 % to 20 % of rows) so class weighting
      matters.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

SEED = 42
DEFAULT_ROWS = 6000
DEFAULT_OUT = Path(__file__).resolve().parent / "processed" / "demo_incidents.csv"

COLUMNS = [
    "timestamp",
    "latitude",
    "longitude",
    "light_conditions",
    "weather",
    "road_surface",
    "road_type",
    "speed_limit",
    "area_type",
    "category",
    "severity",
]

# Vocabulary (must match ml/app/constants.py; a test checks that).
CATEGORIES = [
    "POTHOLE",
    "ROAD_DAMAGE",
    "ACCIDENT",
    "TRAFFIC_CONGESTION",
    "TRAFFIC_SIGNAL",
    "STREET_LIGHT",
    "UNSAFE_ROAD",
    "OBSTRUCTION",
    "WATERLOGGING",
    "OTHER",
]
LIGHT_CONDITIONS = ["DAYLIGHT", "DARK_LIT", "DARK_UNLIT"]
WEATHER = ["CLEAR", "RAIN", "FOG", "OTHER"]
ROAD_SURFACE = ["DRY", "WET", "FLOODED"]
ROAD_TYPE = ["HIGHWAY", "ARTERIAL", "LOCAL", "JUNCTION"]
AREA_TYPE = ["URBAN", "RURAL"]
SEVERITIES = ["LOW", "MEDIUM", "HIGH"]

BBOX = {"lat_min": 17.30, "lat_max": 17.52, "lng_min": 78.30, "lng_max": 78.60}
TEMPORAL_START = pd.Timestamp("2024-09-01")
TEMPORAL_MONTHS = 24
TEMPORAL_DAYS = 730  # 2024-09-01 .. 2026-08-31
N_CLUSTERS = 8
CLUSTER_SHARE = 0.35
CLUSTER_SIGMA_DEG = 0.0015  # about 165 m of latitude

# Documented class-balance bounds for the default generator (checked by tests).
HIGH_SHARE_BOUNDS = (0.12, 0.20)
LOW_SHARE_BOUNDS = (0.40, 0.62)

# Severity rule constants (see module docstring).
SPEED_WEIGHT = 1.6  # times (speed_limit - 20) / 100
LIGHT_SCORE = {"DAYLIGHT": 0.0, "DARK_LIT": 0.4, "DARK_UNLIT": 0.8}
SURFACE_SCORE = {"DRY": 0.0, "WET": 0.4, "FLOODED": 0.7}
WEATHER_SCORE = {"CLEAR": 0.0, "RAIN": 0.2, "FOG": 0.4, "OTHER": 0.1}
ROAD_TYPE_SCORE = {"HIGHWAY": 0.6, "JUNCTION": 0.5, "ARTERIAL": 0.2, "LOCAL": 0.0}
CATEGORY_SCORE = {
    "ACCIDENT": 0.9,
    "UNSAFE_ROAD": 0.6,
    "OBSTRUCTION": 0.3,
    "WATERLOGGING": 0.3,
    "TRAFFIC_SIGNAL": 0.2,
}
LATE_NIGHT_HOURS = {23, 0, 1, 2, 3, 4}
LATE_NIGHT_SCORE = 0.5
WEEKEND_SCORE = 0.15
RURAL_SCORE = 0.2
CLUSTER_SCORE = 0.35
NOISE_SIGMA = 0.6
THRESHOLD_MEDIUM = 1.55
THRESHOLD_HIGH = 2.55

HOUR_WEIGHTS = np.array(
    [0.35, 0.35, 0.35, 0.35, 0.35, 0.5, 0.8, 1.4, 1.4, 1.4, 1.4, 1.1]
    + [1.1, 1.1, 1.1, 1.1, 1.1, 1.5, 1.5, 1.5, 1.5, 0.9, 0.9, 0.5]
)

SEVERITY_RULE = (
    "Synthetic rule: score = 1.6*(speed_limit-20)/100 + light (DARK_LIT 0.4, DARK_UNLIT 0.8) "
    "+ surface (WET 0.4, FLOODED 0.7) + weather (RAIN 0.2, FOG 0.4, OTHER 0.1) "
    "+ road type (HIGHWAY 0.6, JUNCTION 0.5, ARTERIAL 0.2) + category (ACCIDENT 0.9, UNSAFE_ROAD 0.6, "
    "OBSTRUCTION 0.3, WATERLOGGING 0.3, TRAFFIC_SIGNAL 0.2) + 0.5 late night (23:00-04:59) "
    "+ 0.15 weekend + 0.2 rural + 0.35 inside a spatial cluster + Normal(0, 0.6); "
    "LOW below 1.55, MEDIUM up to 2.55, HIGH above."
)

DATASET_CARD = {
    "name": "SmartRoad demo incident dataset (synthetic)",
    "is_demo_data": True,
    "source": "SmartRoad team, generated by data/generate_demo_dataset.py",
    "url": None,
    "access_date": None,
    "licence": "project-internal, synthetic",
    "target_definition": (
        "severity in {LOW, MEDIUM, HIGH} assigned by a documented stochastic rule over the "
        "generated features (see data/README.md); it is not an observed outcome."
    ),
    "geographic_coverage": "synthetic points inside the Hyderabad bounding box 17.30..17.52 N, 78.30..78.60 E",
    "temporal_coverage": "synthetic timestamps across 24 months (2024-09-01 to 2026-08-31)",
    "limitations": [
        "Entirely synthetic: no real road, incident or measurement is represented.",
        "The target is produced by a hand-written rule plus noise, so any metric only demonstrates "
        "that the pipeline works; it says nothing about real roads.",
        "The spatial clusters and the feature-to-severity relations were chosen by the team, "
        "not observed.",
        "Feature values are drawn independently of any real Hyderabad road network or weather record.",
    ],
}


def _choice(rng: np.random.Generator, values: list[str], probs: list[float], size: int) -> np.ndarray:
    p = np.asarray(probs, dtype=float)
    return rng.choice(np.asarray(values, dtype=object), size=size, p=p / p.sum())


def _grouped_choice(
    rng: np.random.Generator,
    groups: np.ndarray,
    table: dict[str, tuple[list[str], list[float]]],
) -> np.ndarray:
    """Draw a categorical value per row whose probabilities depend on the row's group."""
    out = np.empty(len(groups), dtype=object)
    for key, (values, probs) in table.items():
        mask = groups == key
        if mask.any():
            out[mask] = _choice(rng, values, probs, int(mask.sum()))
    return out


def _coordinates(rng: np.random.Generator, rows: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    margin = 0.02
    centres_lat = rng.uniform(BBOX["lat_min"] + margin, BBOX["lat_max"] - margin, N_CLUSTERS)
    centres_lng = rng.uniform(BBOX["lng_min"] + margin, BBOX["lng_max"] - margin, N_CLUSTERS)
    in_cluster = rng.random(rows) < CLUSTER_SHARE
    lat = rng.uniform(BBOX["lat_min"], BBOX["lat_max"], rows)
    lng = rng.uniform(BBOX["lng_min"], BBOX["lng_max"], rows)
    n_in = int(in_cluster.sum())
    which = rng.integers(0, N_CLUSTERS, n_in)
    lng_sigma = CLUSTER_SIGMA_DEG / np.cos(np.deg2rad(17.41))
    lat[in_cluster] = centres_lat[which] + rng.normal(0.0, CLUSTER_SIGMA_DEG, n_in)
    lng[in_cluster] = centres_lng[which] + rng.normal(0.0, lng_sigma, n_in)
    lat = np.clip(lat, BBOX["lat_min"], BBOX["lat_max"])
    lng = np.clip(lng, BBOX["lng_min"], BBOX["lng_max"])
    return np.round(lat, 6), np.round(lng, 6), in_cluster


def _timestamps(rng: np.random.Generator, rows: int) -> pd.Series:
    days = rng.integers(0, TEMPORAL_DAYS, rows)
    hours = rng.choice(24, size=rows, p=HOUR_WEIGHTS / HOUR_WEIGHTS.sum())
    minutes = rng.integers(0, 60, rows)
    delta = pd.to_timedelta(days, unit="D") + pd.to_timedelta(hours, unit="h") + pd.to_timedelta(minutes, unit="m")
    return pd.Series(TEMPORAL_START + delta)


def _season(month: np.ndarray) -> np.ndarray:
    season = np.full(len(month), "other", dtype=object)
    season[np.isin(month, [6, 7, 8, 9])] = "monsoon"
    season[np.isin(month, [11, 12, 1])] = "winter"
    return season


def generate(rows: int = DEFAULT_ROWS, seed: int = SEED) -> pd.DataFrame:
    """Return the synthetic dataset as a DataFrame with the prepared-CSV columns."""
    if rows < 1:
        raise ValueError("rows must be at least 1")
    rng = np.random.default_rng(seed)

    lat, lng, in_cluster = _coordinates(rng, rows)
    ts = _timestamps(rng, rows)
    hour = ts.dt.hour.to_numpy()
    month = ts.dt.month.to_numpy()
    weekday = ts.dt.dayofweek.to_numpy()  # 0 = Monday

    area = _choice(rng, AREA_TYPE, [0.8, 0.2], rows)
    area[in_cluster] = "URBAN"

    weather = _grouped_choice(
        rng,
        _season(month),
        {
            "monsoon": (WEATHER, [0.58, 0.35, 0.02, 0.05]),
            "winter": (WEATHER, [0.76, 0.05, 0.15, 0.04]),
            "other": (WEATHER, [0.84, 0.08, 0.03, 0.05]),
        },
    )
    surface = _grouped_choice(
        rng,
        weather,
        {
            "CLEAR": (ROAD_SURFACE, [0.92, 0.07, 0.01]),
            "RAIN": (ROAD_SURFACE, [0.15, 0.70, 0.15]),
            "FOG": (ROAD_SURFACE, [0.70, 0.30, 0.0]),
            "OTHER": (ROAD_SURFACE, [0.60, 0.30, 0.10]),
        },
    )
    road_type = _grouped_choice(
        rng,
        area,
        {
            "URBAN": (ROAD_TYPE, [0.15, 0.30, 0.40, 0.15]),
            "RURAL": (ROAD_TYPE, [0.35, 0.20, 0.40, 0.05]),
        },
    )
    speed = _grouped_choice(
        rng,
        road_type,
        {
            "HIGHWAY": (["80", "100", "120"], [0.4, 0.4, 0.2]),
            "ARTERIAL": (["50", "60", "70", "80"], [0.3, 0.35, 0.2, 0.15]),
            "LOCAL": (["20", "30", "40", "50"], [0.15, 0.35, 0.35, 0.15]),
            "JUNCTION": (["30", "40", "50"], [0.35, 0.4, 0.25]),
        },
    ).astype(int)

    is_dark = (hour < 6) | (hour >= 18)
    light = np.full(rows, "DAYLIGHT", dtype=object)
    dark_values = _grouped_choice(
        rng,
        area,
        {
            "URBAN": (["DARK_LIT", "DARK_UNLIT"], [0.75, 0.25]),
            "RURAL": (["DARK_LIT", "DARK_UNLIT"], [0.40, 0.60]),
        },
    )
    light[is_dark] = dark_values[is_dark]

    base_weights = [0.20, 0.12, 0.15, 0.12, 0.06, 0.07, 0.08, 0.07, 0.06, 0.07]
    flooded_weights = [0.08, 0.06, 0.08, 0.08, 0.02, 0.03, 0.05, 0.05, 0.50, 0.05]
    category = _grouped_choice(
        rng,
        np.where(surface == "FLOODED", "FLOODED", "NORMAL"),
        {"NORMAL": (CATEGORIES, base_weights), "FLOODED": (CATEGORIES, flooded_weights)},
    )

    score = SPEED_WEIGHT * (speed - 20) / 100.0
    score = score + np.vectorize(LIGHT_SCORE.get)(light)
    score = score + np.vectorize(SURFACE_SCORE.get)(surface)
    score = score + np.vectorize(WEATHER_SCORE.get)(weather)
    score = score + np.vectorize(ROAD_TYPE_SCORE.get)(road_type)
    score = score + np.vectorize(lambda c: CATEGORY_SCORE.get(c, 0.0))(category)
    score = score + np.where(np.isin(hour, list(LATE_NIGHT_HOURS)), LATE_NIGHT_SCORE, 0.0)
    score = score + np.where(weekday >= 5, WEEKEND_SCORE, 0.0)
    score = score + np.where(area == "RURAL", RURAL_SCORE, 0.0)
    score = score + np.where(in_cluster, CLUSTER_SCORE, 0.0)
    score = score + rng.normal(0.0, NOISE_SIGMA, rows)
    severity = np.where(score < THRESHOLD_MEDIUM, "LOW", np.where(score < THRESHOLD_HIGH, "MEDIUM", "HIGH"))

    frame = pd.DataFrame(
        {
            "timestamp": ts.dt.strftime("%Y-%m-%dT%H:%M:00"),
            "latitude": lat,
            "longitude": lng,
            "light_conditions": light.astype(str),
            "weather": weather.astype(str),
            "road_surface": surface.astype(str),
            "road_type": road_type.astype(str),
            "speed_limit": speed.astype(int),
            "area_type": area.astype(str),
            "category": category.astype(str),
            "severity": severity.astype(str),
        },
        columns=COLUMNS,
    )
    return frame.sort_values("timestamp", kind="stable").reset_index(drop=True)


def class_balance(frame: pd.DataFrame) -> dict[str, float]:
    counts = frame["severity"].value_counts()
    return {level: float(counts.get(level, 0)) / len(frame) for level in SEVERITIES}


def write(frame: pd.DataFrame, out: Path) -> Path:
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(out, index=False)
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate the SmartRoad DEMO (synthetic) incident dataset.")
    parser.add_argument("--rows", type=int, default=DEFAULT_ROWS, help=f"number of rows (default {DEFAULT_ROWS})")
    parser.add_argument("--seed", type=int, default=SEED, help=f"random seed (default {SEED})")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="output CSV path")
    args = parser.parse_args(argv)

    frame = generate(rows=args.rows, seed=args.seed)
    path = write(frame, args.out)
    balance = class_balance(frame)
    print(f"DEMO DATA (synthetic): wrote {len(frame)} rows to {path}")
    print("Class balance: " + ", ".join(f"{k} {v:.1%}" for k, v in balance.items()))
    print("This dataset is generated, not collected. Do not describe it as real data.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
