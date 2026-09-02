"""Feature engineering: time features, light derivation, dtypes and the nearby-density guard."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from app.constants import FEATURE_NAMES
from training.preprocess import (
    RESEARCH_FEATURES,
    SHIPPED_FEATURES,
    NearbyDensity,
    add_nearby_density,
    add_time_features,
    derive_light_conditions,
    feature_frame,
)


def test_time_features_from_timestamp():
    frame = pd.DataFrame({"timestamp": ["2025-03-14T18:22:00", "2024-12-01T00:05:00"]})
    out = add_time_features(frame)
    assert out["hour"].tolist() == [18, 0]
    assert out["day_of_week"].tolist() == ["FRI", "SUN"]
    assert out["month"].tolist() == [3, 12]
    assert "hour" not in frame.columns  # the input is not mutated


def test_timezone_aware_timestamps_keep_wall_clock_time():
    frame = pd.DataFrame({"timestamp": ["2025-03-14T18:22:00+05:30", "2025-03-14T23:50:00+05:30"]})
    out = add_time_features(frame)
    assert out["hour"].tolist() == [18, 23]


def test_without_timestamp_column_nothing_changes():
    frame = pd.DataFrame({"hour": [3], "day_of_week": ["MON"], "month": [1]})
    assert add_time_features(frame).equals(frame)


def test_light_conditions_derived_only_when_missing():
    frame = pd.DataFrame({"hour": [7, 17, 18, 2]})
    out, derived = derive_light_conditions(frame)
    assert derived is True
    assert out["light_conditions"].tolist() == ["DAYLIGHT", "DAYLIGHT", "DARK_LIT", "DARK_LIT"]

    given = frame.assign(light_conditions=["DARK_UNLIT", "DAYLIGHT", "DARK_LIT", "DARK_UNLIT"])
    out, derived = derive_light_conditions(given)
    assert derived is False
    assert out["light_conditions"].tolist() == given["light_conditions"].tolist()

    partial = frame.assign(light_conditions=["DARK_UNLIT", None, None, "DARK_UNLIT"])
    out, derived = derive_light_conditions(partial)
    assert derived is True
    assert out["light_conditions"].tolist() == ["DARK_UNLIT", "DAYLIGHT", "DARK_LIT", "DARK_UNLIT"]


def test_feature_frame_selects_and_casts(demo_frame):
    frame = add_time_features(demo_frame)
    shipped = feature_frame(frame, SHIPPED_FEATURES)
    assert list(shipped.columns) == FEATURE_NAMES
    assert str(shipped["hour"].dtype) == "int64"
    assert str(shipped["speed_limit"].dtype) == "int64"
    assert shipped["weather"].map(type).eq(str).all()
    with pytest.raises(KeyError, match="nearby_density"):
        feature_frame(frame, RESEARCH_FEATURES)


def _offset(lat: float, lng: float, north_m: float, east_m: float) -> tuple[float, float]:
    return lat + north_m / 111_320.0, lng + east_m / (111_320.0 * np.cos(np.radians(lat)))


def test_nearby_density_counts_training_points_only():
    base = (17.40, 78.45)
    near = [_offset(*base, 40, 0), _offset(*base, 0, 60), _offset(*base, -30, -30)]
    far = [_offset(*base, 5000, 5000)]
    train = pd.DataFrame(near + far, columns=["latitude", "longitude"])
    density = NearbyDensity(radius_m=500).fit(train["latitude"].to_numpy(), train["longitude"].to_numpy())

    own = density.transform(train["latitude"].to_numpy(), train["longitude"].to_numpy(), exclude_self=True)
    assert own.tolist() == [2, 2, 2, 0]

    query = pd.DataFrame(
        [_offset(*base, 100, 100), _offset(*base, 20000, 0)], columns=["latitude", "longitude"]
    )
    counts = density.transform(query["latitude"].to_numpy(), query["longitude"].to_numpy())
    assert counts.tolist() == [3, 0]


def test_add_nearby_density_uses_train_fold_for_test_rows():
    base = (17.40, 78.45)
    train = pd.DataFrame([_offset(*base, i * 10, 0) for i in range(5)], columns=["latitude", "longitude"])
    test = pd.DataFrame([_offset(*base, 5, 5), _offset(*base, 9000, 0)], columns=["latitude", "longitude"])
    train_out, test_out = add_nearby_density(train, test, radius_m=500)
    assert train_out["nearby_density"].tolist() == [4, 4, 4, 4, 4]
    assert test_out["nearby_density"].tolist() == [5, 0]
    assert "nearby_density" not in train.columns


def test_transform_before_fit_raises():
    with pytest.raises(RuntimeError):
        NearbyDensity().transform(np.array([17.4]), np.array([78.4]))
