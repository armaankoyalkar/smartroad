"""Domain vocabulary shared by the ML service and the training pipeline.

These lists mirror docs/api.md section 2 (risk levels, categories) and section 9
(the shipped model's feature schema). They are the single definition inside ml/.
"""

from __future__ import annotations

from typing import Any

RISK_LEVELS: list[str] = ["LOW", "MEDIUM", "HIGH"]

CATEGORIES: list[str] = [
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

DAYS_OF_WEEK: list[str] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
LIGHT_CONDITIONS: list[str] = ["DAYLIGHT", "DARK_LIT", "DARK_UNLIT"]
WEATHER: list[str] = ["CLEAR", "RAIN", "FOG", "OTHER"]
ROAD_SURFACE: list[str] = ["DRY", "WET", "FLOODED"]
ROAD_TYPE: list[str] = ["HIGHWAY", "ARTERIAL", "LOCAL", "JUNCTION"]
AREA_TYPE: list[str] = ["URBAN", "RURAL"]

# The shipped model's feature schema, exactly as docs/api.md section 9 publishes it.
FEATURE_SCHEMA: list[dict[str, Any]] = [
    {
        "name": "hour",
        "label": "Hour of day",
        "type": "integer",
        "min": 0,
        "max": 23,
        "description": "Hour of the day (0 to 23, local time) when the incident happened.",
    },
    {
        "name": "day_of_week",
        "label": "Day of week",
        "type": "categorical",
        "values": DAYS_OF_WEEK,
        "description": "Day of the week of the incident.",
    },
    {
        "name": "month",
        "label": "Month",
        "type": "integer",
        "min": 1,
        "max": 12,
        "description": "Calendar month of the incident (1 = January).",
    },
    {
        "name": "light_conditions",
        "label": "Light conditions",
        "type": "categorical",
        "values": LIGHT_CONDITIONS,
        "description": "Daylight, darkness with street lighting, or darkness without lighting.",
    },
    {
        "name": "weather",
        "label": "Weather",
        "type": "categorical",
        "values": WEATHER,
        "description": "Weather at the time of the incident.",
    },
    {
        "name": "road_surface",
        "label": "Road surface",
        "type": "categorical",
        "values": ROAD_SURFACE,
        "description": "Condition of the road surface.",
    },
    {
        "name": "road_type",
        "label": "Road type",
        "type": "categorical",
        "values": ROAD_TYPE,
        "description": "Type of road where the incident happened.",
    },
    {
        "name": "speed_limit",
        "label": "Speed limit (km/h)",
        "type": "integer",
        "min": 20,
        "max": 120,
        "description": "Posted speed limit in km/h.",
    },
    {
        "name": "area_type",
        "label": "Area type",
        "type": "categorical",
        "values": AREA_TYPE,
        "description": "Urban or rural surroundings.",
    },
    {
        "name": "category",
        "label": "Incident category",
        "type": "categorical",
        "values": CATEGORIES,
        "description": "SmartRoad incident category.",
    },
]

FEATURE_NAMES: list[str] = [spec["name"] for spec in FEATURE_SCHEMA]
INTEGER_FEATURES: list[str] = [spec["name"] for spec in FEATURE_SCHEMA if spec["type"] == "integer"]
CATEGORICAL_FEATURES: list[str] = [spec["name"] for spec in FEATURE_SCHEMA if spec["type"] == "categorical"]

DEFAULT_EPS_M: int = 200
DEFAULT_MIN_SAMPLES: int = 4
HOTSPOT_ALGORITHM: str = "DBSCAN (haversine)"

DISCLAIMER: str = "Estimate from historical data; not a prediction that an incident will occur."

NOT_TRAINED_DETAIL: str = "Model artifacts not found. Run the training pipeline first."
