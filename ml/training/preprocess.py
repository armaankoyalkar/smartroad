"""Step 4: feature engineering for the shipped and the research feature sets.

Shipped features (fixed by docs/api.md section 9): hour, day_of_week, month, light_conditions,
weather, road_surface, road_type, speed_limit, area_type, category.
Research features add latitude, longitude and nearby_density; they are reported but never served
because coordinates encode the geography of the training data and do not transfer.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

from app.constants import CATEGORICAL_FEATURES, DAYS_OF_WEEK, FEATURE_NAMES, INTEGER_FEATURES

log = logging.getLogger(__name__)

EARTH_RADIUS_M = 6_371_000.0
SHIPPED_FEATURES: list[str] = list(FEATURE_NAMES)
RESEARCH_FEATURES: list[str] = SHIPPED_FEATURES + ["latitude", "longitude", "nearby_density"]
DAYLIGHT_HOURS = range(6, 18)


def parse_timestamps(series: pd.Series) -> pd.Series:
    """Parse to naive datetimes. Timezone-aware values keep their wall-clock time (not converted)."""
    parsed = pd.to_datetime(series, errors="coerce")
    if getattr(parsed.dt, "tz", None) is not None:
        parsed = parsed.dt.tz_localize(None)
    return parsed


def add_time_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Derive hour, day_of_week (MON..SUN) and month from `timestamp` when the column exists."""
    frame = frame.copy()
    if "timestamp" not in frame.columns:
        return frame
    stamps = parse_timestamps(frame["timestamp"])
    frame["hour"] = stamps.dt.hour.astype("int64")
    frame["day_of_week"] = stamps.dt.dayofweek.map(dict(enumerate(DAYS_OF_WEEK))).astype(object)
    frame["month"] = stamps.dt.month.astype("int64")
    return frame


def derive_light_conditions(frame: pd.DataFrame) -> tuple[pd.DataFrame, bool]:
    """Fill light_conditions from the hour when the dataset has no such column.

    Assumption (same as the backend's per-incident derivation): DAYLIGHT for 6 <= hour < 18,
    otherwise DARK_LIT. Returns (frame, derived_flag).
    """
    if "light_conditions" in frame.columns and frame["light_conditions"].notna().all():
        return frame, False
    frame = frame.copy()
    daylight = frame["hour"].isin(list(DAYLIGHT_HOURS))
    derived = np.where(daylight, "DAYLIGHT", "DARK_LIT")
    if "light_conditions" in frame.columns:
        frame["light_conditions"] = frame["light_conditions"].where(
            frame["light_conditions"].notna(), derived
        )
    else:
        frame["light_conditions"] = derived
    frame["light_conditions"] = frame["light_conditions"].astype(object)
    return frame, True


def feature_frame(frame: pd.DataFrame, features: list[str]) -> pd.DataFrame:
    """Select the feature columns with consistent dtypes (int64, float64 or str)."""
    missing = [name for name in features if name not in frame.columns]
    if missing:
        raise KeyError(f"missing feature columns: {', '.join(missing)}")
    out = pd.DataFrame(index=frame.index)
    for name in features:
        if name in INTEGER_FEATURES:
            out[name] = frame[name].astype("int64")
        elif name in CATEGORICAL_FEATURES:
            out[name] = frame[name].astype(str)
        else:
            out[name] = frame[name].astype("float64")
    return out


class NearbyDensity:
    """Number of training-fold records within `radius_m` of a point (haversine BallTree).

    Leakage guard: the tree is built from the training fold only, so test rows never influence
    the feature of any row. When transforming the training fold itself pass exclude_self=True so
    a record does not count itself.
    """

    def __init__(self, radius_m: float = 500.0) -> None:
        self.radius_m = float(radius_m)
        self._tree: BallTree | None = None

    def fit(self, latitude: np.ndarray, longitude: np.ndarray) -> NearbyDensity:
        coords = np.radians(np.column_stack([np.asarray(latitude, float), np.asarray(longitude, float)]))
        self._tree = BallTree(coords, metric="haversine")
        return self

    def transform(
        self, latitude: np.ndarray, longitude: np.ndarray, *, exclude_self: bool = False
    ) -> np.ndarray:
        if self._tree is None:
            raise RuntimeError("NearbyDensity.fit must be called first")
        coords = np.radians(np.column_stack([np.asarray(latitude, float), np.asarray(longitude, float)]))
        counts = self._tree.query_radius(coords, r=self.radius_m / EARTH_RADIUS_M, count_only=True)
        counts = np.asarray(counts, dtype="int64")
        return counts - 1 if exclude_self else counts


def add_nearby_density(
    train: pd.DataFrame, test: pd.DataFrame, radius_m: float
) -> tuple[pd.DataFrame, pd.DataFrame]:
    density = NearbyDensity(radius_m).fit(train["latitude"].to_numpy(), train["longitude"].to_numpy())
    train = train.copy()
    test = test.copy()
    train["nearby_density"] = density.transform(
        train["latitude"].to_numpy(), train["longitude"].to_numpy(), exclude_self=True
    )
    test["nearby_density"] = density.transform(test["latitude"].to_numpy(), test["longitude"].to_numpy())
    return train, test
