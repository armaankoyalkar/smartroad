"""Step 2: schema, range and missing-value checks on the prepared data with clear errors."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

import pandas as pd

from app.constants import (
    AREA_TYPE,
    CATEGORIES,
    DAYS_OF_WEEK,
    LIGHT_CONDITIONS,
    RISK_LEVELS,
    ROAD_SURFACE,
    ROAD_TYPE,
    WEATHER,
)

TARGET = "severity"
TIME_COLUMNS = ["hour", "day_of_week", "month"]
REQUIRED_COLUMNS = [
    "latitude",
    "longitude",
    "weather",
    "road_surface",
    "road_type",
    "speed_limit",
    "area_type",
    "category",
    TARGET,
]
OPTIONAL_COLUMNS = ["light_conditions"]  # derived from hour when absent (documented assumption)

CATEGORICAL_VALUES: dict[str, list[str]] = {
    "day_of_week": DAYS_OF_WEEK,
    "light_conditions": LIGHT_CONDITIONS,
    "weather": WEATHER,
    "road_surface": ROAD_SURFACE,
    "road_type": ROAD_TYPE,
    "area_type": AREA_TYPE,
    "category": CATEGORIES,
    TARGET: RISK_LEVELS,
}
INTEGER_RANGES: dict[str, tuple[int, int]] = {"speed_limit": (20, 120), "hour": (0, 23), "month": (1, 12)}
FLOAT_RANGES: dict[str, tuple[float, float]] = {"latitude": (-90, 90), "longitude": (-180, 180)}


class DataValidationError(ValueError):
    """The dataset cannot be used as-is; the message says exactly why."""


@dataclass
class ValidationReport:
    rows_in: int
    rows_out: int
    dropped_missing: int
    dropped_unparseable_timestamp: int
    time_source: str
    missing_by_column: dict[str, int] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def _time_source(frame: pd.DataFrame) -> str:
    if "timestamp" in frame.columns:
        return "timestamp"
    if all(column in frame.columns for column in TIME_COLUMNS):
        return "columns"
    raise DataValidationError(
        "the dataset needs either a 'timestamp' column or all of hour, day_of_week and month"
    )


def _check_columns(frame: pd.DataFrame) -> str:
    missing = [column for column in REQUIRED_COLUMNS if column not in frame.columns]
    if missing:
        raise DataValidationError(f"missing required columns: {', '.join(missing)}")
    return _time_source(frame)


def _normalise_strings(frame: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    for column in columns:
        frame[column] = frame[column].astype("string").str.strip().str.upper().astype(object)
    return frame


def _check_categorical(frame: pd.DataFrame, column: str, allowed: list[str]) -> None:
    present = frame[column].dropna()
    bad = sorted(set(present.unique()) - set(allowed))
    if bad:
        shown = ", ".join(repr(value) for value in bad[:5])
        raise DataValidationError(f"column {column!r} has values outside {allowed}: {shown}")


def _check_numeric(frame: pd.DataFrame, column: str, low: float, high: float, integer: bool) -> pd.Series:
    values = pd.to_numeric(frame[column], errors="coerce")
    unparseable = int(values.isna().sum() - frame[column].isna().sum())
    if unparseable:
        raise DataValidationError(f"column {column!r} has {unparseable} non-numeric value(s)")
    present = values.dropna()
    if integer and not (present == present.round()).all():
        raise DataValidationError(f"column {column!r} must contain whole numbers")
    out_of_range = present[(present < low) | (present > high)]
    if len(out_of_range):
        sample = ", ".join(str(v) for v in out_of_range.unique()[:5])
        raise DataValidationError(f"column {column!r} must be within {low}..{high}; found {sample}")
    return values


def validate_and_clean(frame: pd.DataFrame) -> tuple[pd.DataFrame, ValidationReport]:
    """Validate the prepared schema, drop rows with missing required values, return a report.

    Categorical values are trimmed and upper-cased before checking. Unknown categories, non-numeric
    or out-of-range numbers and a missing target class raise DataValidationError.
    """
    rows_in = len(frame)
    time_source = _check_columns(frame)
    frame = frame.copy()

    categorical_present = [column for column in CATEGORICAL_VALUES if column in frame.columns]
    frame = _normalise_strings(frame, categorical_present)
    for column in categorical_present:
        _check_categorical(frame, column, CATEGORICAL_VALUES[column])
    for column, (low, high) in INTEGER_RANGES.items():
        if column in frame.columns:
            frame[column] = _check_numeric(frame, column, low, high, integer=True)
    for column, (low, high) in FLOAT_RANGES.items():
        frame[column] = _check_numeric(frame, column, low, high, integer=False)

    dropped_unparseable = 0
    if time_source == "timestamp":
        parsed = pd.to_datetime(frame["timestamp"], errors="coerce")
        dropped_unparseable = int(parsed.isna().sum() - frame["timestamp"].isna().sum())
        frame["timestamp"] = parsed

    required_now = REQUIRED_COLUMNS + (["timestamp"] if time_source == "timestamp" else TIME_COLUMNS)
    missing_by_column = {column: int(frame[column].isna().sum()) for column in frame.columns}
    cleaned = frame.dropna(subset=required_now).reset_index(drop=True)
    dropped_missing = rows_in - len(cleaned) - dropped_unparseable

    if cleaned.empty:
        raise DataValidationError("no rows left after dropping rows with missing required values")
    classes_present = set(cleaned[TARGET].unique())
    if classes_present != set(RISK_LEVELS):
        raise DataValidationError(
            f"the target must contain all of {RISK_LEVELS}; found {sorted(classes_present)}"
        )
    for column in INTEGER_RANGES:
        if column in cleaned.columns:
            cleaned[column] = cleaned[column].astype("int64")

    report = ValidationReport(
        rows_in=rows_in,
        rows_out=len(cleaned),
        dropped_missing=dropped_missing,
        dropped_unparseable_timestamp=dropped_unparseable,
        time_source=time_source,
        missing_by_column={k: v for k, v in missing_by_column.items() if v},
    )
    return cleaned, report
