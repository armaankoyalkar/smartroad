"""The demo generator is deterministic, schema-correct and honestly labelled."""

from __future__ import annotations

import pandas as pd
import pytest

from app import constants


def test_deterministic_for_a_seed(demo_generator):
    first = demo_generator.generate(rows=300, seed=42)
    second = demo_generator.generate(rows=300, seed=42)
    other = demo_generator.generate(rows=300, seed=7)
    assert first.equals(second)
    assert not first.equals(other)


def test_columns_and_row_count(demo_frame, demo_generator):
    assert list(demo_frame.columns) == demo_generator.COLUMNS
    assert len(demo_frame) == 800
    assert not demo_frame.isna().any().any()


def test_vocabulary_matches_app_constants(demo_generator):
    assert demo_generator.CATEGORIES == constants.CATEGORIES
    assert demo_generator.LIGHT_CONDITIONS == constants.LIGHT_CONDITIONS
    assert demo_generator.WEATHER == constants.WEATHER
    assert demo_generator.ROAD_SURFACE == constants.ROAD_SURFACE
    assert demo_generator.ROAD_TYPE == constants.ROAD_TYPE
    assert demo_generator.AREA_TYPE == constants.AREA_TYPE
    assert demo_generator.SEVERITIES == constants.RISK_LEVELS


def test_values_are_inside_the_schema(demo_frame, demo_generator):
    bbox = demo_generator.BBOX
    assert demo_frame["latitude"].between(bbox["lat_min"], bbox["lat_max"]).all()
    assert demo_frame["longitude"].between(bbox["lng_min"], bbox["lng_max"]).all()
    assert demo_frame["speed_limit"].between(20, 120).all()
    assert set(demo_frame["category"]) <= set(constants.CATEGORIES)
    assert set(demo_frame["severity"]) <= set(constants.RISK_LEVELS)
    stamps = pd.to_datetime(demo_frame["timestamp"], format="%Y-%m-%dT%H:%M:%S")
    assert stamps.min() >= pd.Timestamp("2024-09-01")
    assert stamps.max() < pd.Timestamp("2026-09-01")


def test_light_conditions_follow_the_hour(demo_frame):
    hour = pd.to_datetime(demo_frame["timestamp"]).dt.hour
    daylight = hour.between(6, 17)
    assert (demo_frame.loc[daylight, "light_conditions"] == "DAYLIGHT").all()
    assert (demo_frame.loc[~daylight, "light_conditions"] != "DAYLIGHT").all()


def test_class_balance_within_documented_bounds(demo_generator):
    frame = demo_generator.generate(rows=demo_generator.DEFAULT_ROWS, seed=demo_generator.SEED)
    balance = demo_generator.class_balance(frame)
    low, high = demo_generator.HIGH_SHARE_BOUNDS
    assert low <= balance["HIGH"] <= high
    low, high = demo_generator.LOW_SHARE_BOUNDS
    assert low <= balance["LOW"] <= high
    assert balance["HIGH"] < balance["MEDIUM"] < balance["LOW"]


def test_severity_depends_on_the_documented_rule(demo_frame):
    fast = demo_frame[demo_frame["speed_limit"] >= 100]
    slow = demo_frame[demo_frame["speed_limit"] <= 30]
    assert (fast["severity"] == "HIGH").mean() > (slow["severity"] == "HIGH").mean()
    accidents = demo_frame[demo_frame["category"] == "ACCIDENT"]
    potholes = demo_frame[demo_frame["category"] == "POTHOLE"]
    assert (accidents["severity"] == "HIGH").mean() > (potholes["severity"] == "HIGH").mean()


def test_dataset_card_is_labelled_as_demo(demo_generator):
    card = demo_generator.DATASET_CARD
    assert card["is_demo_data"] is True
    assert "synthetic" in card["name"].lower()
    assert card["url"] is None and card["access_date"] is None
    assert any("synthetic" in item.lower() for item in card["limitations"])


def test_cli_writes_a_csv(demo_generator, tmp_path, capsys):
    out = tmp_path / "demo.csv"
    assert demo_generator.main(["--rows", "50", "--out", str(out)]) == 0
    frame = pd.read_csv(out)
    assert len(frame) == 50
    assert "DEMO DATA" in capsys.readouterr().out


def test_rejects_zero_rows(demo_generator):
    with pytest.raises(ValueError):
        demo_generator.generate(rows=0)
