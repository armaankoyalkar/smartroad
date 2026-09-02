"""The STATS19 column mapping on a tiny inline fixture (no download, no real data)."""

from __future__ import annotations

import pandas as pd
import pytest

from training.adapters.stats19 import PREPARED_COLUMNS, map_stats19_collisions
from training.validate import validate_and_clean

# Rows are made up for the test; they follow the DfT code lists, not any real collision.
FIXTURE = pd.DataFrame(
    {
        "accident_index": ["A", "B", "C", "D", "E"],
        "date": ["14/03/2023", "02/07/2023", "25/12/2023", "01/01/2023", "bad"],
        "time": ["18:22", "09:05", "23:59", "12:00", "12:00"],
        "latitude": [51.5, 53.4, 55.9, 52.0, 52.0],
        "longitude": [-0.12, -2.98, -3.19, -1.0, -1.0],
        "accident_severity": [1, 2, 3, -1, 3],
        "light_conditions": [4, 1, 6, 7, 1],
        "weather_conditions": [2, 1, 7, 9, 1],
        "road_surface_conditions": [2, 1, 5, 6, 1],
        "road_type": [3, 6, 2, 9, 6],
        "speed_limit": [70, 30, 20, -1, 99],
        "urban_or_rural_area": [1, 2, 1, 3, 1],
        "junction_detail": [0, 3, 0, 0, 0],
    }
)


def test_output_has_the_prepared_columns():
    prepared = map_stats19_collisions(FIXTURE)
    assert list(prepared.columns) == PREPARED_COLUMNS
    assert len(prepared) == len(FIXTURE)
    assert (prepared["category"] == "ACCIDENT").all()


def test_fully_coded_row_maps_to_the_prepared_vocabulary():
    row = map_stats19_collisions(FIXTURE).iloc[0]
    assert row["timestamp"] == "2023-03-14T18:22:00"
    assert row["severity"] == "HIGH"
    assert row["light_conditions"] == "DARK_LIT"
    assert row["weather"] == "RAIN"
    assert row["road_surface"] == "WET"
    assert row["road_type"] == "HIGHWAY"
    assert row["speed_limit"] == 113  # 70 mph
    assert row["area_type"] == "URBAN"
    assert row["latitude"] == 51.5 and row["longitude"] == -0.12


def test_junction_detail_overrides_road_type():
    row = map_stats19_collisions(FIXTURE).iloc[1]
    assert row["road_type"] == "JUNCTION"
    assert row["severity"] == "MEDIUM" and row["area_type"] == "RURAL" and row["speed_limit"] == 48


def test_flood_and_no_lighting_codes():
    row = map_stats19_collisions(FIXTURE).iloc[2]
    assert row["road_surface"] == "FLOODED"
    assert row["light_conditions"] == "DARK_UNLIT"
    assert row["weather"] == "FOG"
    assert row["road_type"] == "LOCAL"
    assert row["speed_limit"] == 32 and row["severity"] == "LOW"


def test_unknown_codes_become_missing():
    row = map_stats19_collisions(FIXTURE).iloc[3]
    for column in (
        "severity",
        "light_conditions",
        "weather",
        "road_surface",
        "road_type",
        "speed_limit",
        "area_type",
    ):
        assert pd.isna(row[column]), column
    bad_date = map_stats19_collisions(FIXTURE).iloc[4]
    assert pd.isna(bad_date["timestamp"]) and pd.isna(bad_date["speed_limit"])


def test_validation_drops_the_unmappable_rows():
    cleaned, report = validate_and_clean(map_stats19_collisions(FIXTURE))
    assert report.rows_in == 5 and report.rows_out == 3
    assert report.dropped_missing + report.dropped_unparseable_timestamp == 2
    assert cleaned["severity"].tolist() == ["HIGH", "MEDIUM", "LOW"]


def test_missing_columns_are_reported():
    with pytest.raises(KeyError, match="speed_limit"):
        map_stats19_collisions(FIXTURE.drop(columns=["speed_limit"]))
