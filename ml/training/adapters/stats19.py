"""Column mapping from the UK STATS19 collisions CSV to the prepared schema (data/README.md).

No download happens here. Point the pipeline at a local copy:
    python -m training.run_pipeline --adapter stats19 --dataset path/to/<stats19-collisions>.csv

Code values follow the DfT "Road Safety Data" variable lookup. Codes that do not fit the prepared
vocabulary (unknown, missing, oil/diesel, mud, unallocated area) become missing values and the
validation step drops those rows and reports how many. Approximations made here:
    * accident_severity 1 fatal -> HIGH, 2 serious -> MEDIUM, 3 slight -> LOW.
    * light_conditions 1 daylight -> DAYLIGHT; 4 darkness, lights lit -> DARK_LIT;
      5 lights unlit and 6 no lighting -> DARK_UNLIT; 7 lighting unknown -> missing.
    * weather_conditions 1/4 fine -> CLEAR; 2/5 raining -> RAIN; 7 fog or mist -> FOG;
      3/6 snowing and 8 other -> OTHER; 9 unknown -> missing.
    * road_surface_conditions 1 dry -> DRY; 2 wet/damp, 3 snow, 4 frost/ice -> WET;
      5 flood over 3 cm -> FLOODED; 6 oil/diesel, 7 mud, 9 unknown -> missing.
    * road_type 3 dual carriageway and 7 slip road -> HIGHWAY; 6 single carriageway -> ARTERIAL;
      2 one-way street and 12 one-way/slip road -> LOCAL; 1 roundabout -> JUNCTION; 9 unknown -> missing.
      When the optional junction_detail column is present and holds a junction code (1 roundabout,
      2 mini-roundabout, 3 T or staggered, 5 slip road, 6 crossroads, 7 more than four arms, 8 private
      drive, 9 other junction; 0 = not at or within 20 m of a junction), road_type becomes JUNCTION.
    * speed_limit is mph in STATS19; converted to km/h (x 1.609344, rounded) so 30 mph -> 48 km/h.
      Codes -1 and 99 (unknown) and results outside 20..120 km/h -> missing.
    * urban_or_rural_area 1 -> URBAN, 2 -> RURAL, 3 unallocated -> missing.
    * category is the constant ACCIDENT: every STATS19 row is a collision.
    * timestamp = date (dd/mm/yyyy) + time (HH:MM), local time, no offset.
"""

from __future__ import annotations

import pandas as pd

REQUIRED_STATS19_COLUMNS = [
    "date",
    "time",
    "latitude",
    "longitude",
    "accident_severity",
    "light_conditions",
    "weather_conditions",
    "road_surface_conditions",
    "road_type",
    "speed_limit",
    "urban_or_rural_area",
]
OPTIONAL_JUNCTION_COLUMN = "junction_detail"

SEVERITY_MAP = {1: "HIGH", 2: "MEDIUM", 3: "LOW"}
LIGHT_MAP = {1: "DAYLIGHT", 4: "DARK_LIT", 5: "DARK_UNLIT", 6: "DARK_UNLIT"}
WEATHER_MAP = {1: "CLEAR", 2: "RAIN", 3: "OTHER", 4: "CLEAR", 5: "RAIN", 6: "OTHER", 7: "FOG", 8: "OTHER"}
SURFACE_MAP = {1: "DRY", 2: "WET", 3: "WET", 4: "WET", 5: "FLOODED"}
ROAD_TYPE_MAP = {1: "JUNCTION", 2: "LOCAL", 3: "HIGHWAY", 6: "ARTERIAL", 7: "HIGHWAY", 12: "LOCAL"}
AREA_MAP = {1: "URBAN", 2: "RURAL"}
AT_JUNCTION_CODES = {1, 2, 3, 5, 6, 7, 8, 9}
MPH_TO_KMH = 1.609344
SPEED_KMH_RANGE = (20, 120)

PREPARED_COLUMNS = [
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


def _codes(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").astype("Int64")


def _map_codes(series: pd.Series, mapping: dict[int, str]) -> pd.Series:
    return _codes(series).map(mapping).astype(object)


def _speed_kmh(series: pd.Series) -> pd.Series:
    mph = pd.to_numeric(series, errors="coerce")
    mph = mph.where((mph > 0) & (mph < 99))
    kmh = (mph * MPH_TO_KMH).round()
    low, high = SPEED_KMH_RANGE
    return kmh.where((kmh >= low) & (kmh <= high)).astype("Int64")


def _timestamp(date: pd.Series, time: pd.Series) -> pd.Series:
    combined = date.astype("string").str.strip() + " " + time.astype("string").str.strip()
    parsed = pd.to_datetime(combined, format="%d/%m/%Y %H:%M", errors="coerce")
    return parsed.dt.strftime("%Y-%m-%dT%H:%M:00").astype(object)


def map_stats19_collisions(raw: pd.DataFrame) -> pd.DataFrame:
    """Map a STATS19 collisions table to the prepared schema; unmappable cells become missing."""
    missing = [column for column in REQUIRED_STATS19_COLUMNS if column not in raw.columns]
    if missing:
        raise KeyError(f"STATS19 collisions CSV is missing columns: {', '.join(missing)}")

    road_type = _map_codes(raw["road_type"], ROAD_TYPE_MAP)
    if OPTIONAL_JUNCTION_COLUMN in raw.columns:
        at_junction = _codes(raw[OPTIONAL_JUNCTION_COLUMN]).isin(list(AT_JUNCTION_CODES)).fillna(False)
        road_type = road_type.where(~at_junction.astype(bool), "JUNCTION")

    prepared = pd.DataFrame(
        {
            "timestamp": _timestamp(raw["date"], raw["time"]),
            "latitude": pd.to_numeric(raw["latitude"], errors="coerce"),
            "longitude": pd.to_numeric(raw["longitude"], errors="coerce"),
            "light_conditions": _map_codes(raw["light_conditions"], LIGHT_MAP),
            "weather": _map_codes(raw["weather_conditions"], WEATHER_MAP),
            "road_surface": _map_codes(raw["road_surface_conditions"], SURFACE_MAP),
            "road_type": road_type,
            "speed_limit": _speed_kmh(raw["speed_limit"]),
            "area_type": _map_codes(raw["urban_or_rural_area"], AREA_MAP),
            "category": "ACCIDENT",
            "severity": _map_codes(raw["accident_severity"], SEVERITY_MAP),
        },
        columns=PREPARED_COLUMNS,
    )
    return prepared
