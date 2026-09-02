"""Validation raises clear errors and cleans rows with missing required values."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from training.validate import DataValidationError, validate_and_clean


def test_clean_demo_frame_passes(demo_frame):
    cleaned, report = validate_and_clean(demo_frame)
    assert len(cleaned) == len(demo_frame)
    assert report.rows_in == report.rows_out == 800
    assert report.dropped_missing == 0
    assert report.time_source == "timestamp"
    assert str(cleaned["speed_limit"].dtype) == "int64"
    assert str(cleaned["timestamp"].dtype).startswith("datetime64")


def test_missing_column_is_reported(demo_frame):
    with pytest.raises(DataValidationError, match="missing required columns: road_surface"):
        validate_and_clean(demo_frame.drop(columns=["road_surface"]))


def test_needs_a_time_source(demo_frame):
    with pytest.raises(DataValidationError, match="timestamp"):
        validate_and_clean(demo_frame.drop(columns=["timestamp"]))
    with_columns = demo_frame.drop(columns=["timestamp"]).assign(hour=9, day_of_week="MON", month=3)
    cleaned, report = validate_and_clean(with_columns)
    assert report.time_source == "columns"
    assert len(cleaned) == len(demo_frame)


def test_unknown_category_value_is_reported(demo_frame):
    broken = demo_frame.copy()
    broken.loc[0, "weather"] = "SNOW"
    with pytest.raises(DataValidationError, match="'weather'.*'SNOW'"):
        validate_and_clean(broken)


def test_values_are_normalised_before_checking(demo_frame):
    lowered = demo_frame.copy()
    lowered["weather"] = lowered["weather"].str.lower().str.pad(8)
    cleaned, _ = validate_and_clean(lowered)
    assert set(cleaned["weather"]) <= {"CLEAR", "RAIN", "FOG", "OTHER"}


def test_out_of_range_speed_limit_is_reported(demo_frame):
    broken = demo_frame.copy()
    broken.loc[3, "speed_limit"] = 150
    with pytest.raises(DataValidationError, match="'speed_limit' must be within 20..120; found 150"):
        validate_and_clean(broken)


def test_non_numeric_latitude_is_reported(demo_frame):
    broken = demo_frame.copy()
    broken["latitude"] = broken["latitude"].astype(object)
    broken.loc[5, "latitude"] = "north"
    with pytest.raises(DataValidationError, match="'latitude' has 1 non-numeric"):
        validate_and_clean(broken)


def test_rows_with_missing_required_values_are_dropped_and_counted(demo_frame):
    frame = demo_frame.copy()
    frame["severity"] = frame["severity"].astype(object)
    frame.loc[[1, 2, 3], "severity"] = np.nan
    frame.loc[[10], "latitude"] = np.nan
    frame.loc[[20], "timestamp"] = "not a date"
    cleaned, report = validate_and_clean(frame)
    assert len(cleaned) == 800 - 5
    assert report.dropped_missing == 4
    assert report.dropped_unparseable_timestamp == 1
    assert report.missing_by_column["severity"] == 3


def test_all_three_classes_are_required(demo_frame):
    two_classes = demo_frame[demo_frame["severity"] != "HIGH"]
    with pytest.raises(DataValidationError, match="all of"):
        validate_and_clean(two_classes)


def test_empty_after_cleaning_is_an_error(demo_frame):
    frame = demo_frame.head(3).copy()
    frame["severity"] = pd.Series([np.nan] * 3, dtype=object)
    with pytest.raises(DataValidationError, match="no rows left"):
        validate_and_clean(frame)
