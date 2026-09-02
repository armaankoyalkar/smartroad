"""Pydantic request and response models for the ML service (docs/api.md sections 9 and 10).

Everything is snake_case; the backend converts to camelCase.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator

from app.constants import (
    DEFAULT_EPS_M,
    DEFAULT_MIN_SAMPLES,
    FEATURE_SCHEMA,
    HOTSPOT_ALGORITHM,
)

_SPEC_BY_NAME: dict[str, dict[str, Any]] = {spec["name"]: spec for spec in FEATURE_SCHEMA}

RiskLevel = Literal["LOW", "MEDIUM", "HIGH"]


class _Base(BaseModel):
    model_config = ConfigDict(protected_namespaces=())


# --- feature vector -------------------------------------------------------------------------


class FeatureVector(_Base):
    """The ten shipped features. Ranges and allowed values come from FEATURE_SCHEMA."""

    hour: int
    day_of_week: str
    month: int
    light_conditions: str
    weather: str
    road_surface: str
    road_type: str
    speed_limit: int
    area_type: str
    category: str

    @field_validator("hour", "month", "speed_limit")
    @classmethod
    def _within_range(cls, value: int, info: ValidationInfo) -> int:
        spec = _SPEC_BY_NAME[str(info.field_name)]
        if not spec["min"] <= value <= spec["max"]:
            raise ValueError(f"must be between {spec['min']} and {spec['max']}")
        return value

    @field_validator(
        "day_of_week", "light_conditions", "weather", "road_surface", "road_type", "area_type", "category"
    )
    @classmethod
    def _allowed_value(cls, value: str, info: ValidationInfo) -> str:
        spec = _SPEC_BY_NAME[str(info.field_name)]
        normalised = value.strip().upper()
        if normalised not in spec["values"]:
            raise ValueError(f"must be one of {', '.join(spec['values'])}")
        return normalised


# --- risk estimation ------------------------------------------------------------------------


class RiskRequest(_Base):
    features: FeatureVector


class Contribution(_Base):
    feature: str
    value: int | str
    effect: float


class RiskResponse(_Base):
    risk_level: RiskLevel
    probabilities: dict[str, float]
    model_version: str
    is_demo_model: bool
    contributions: list[Contribution]
    disclaimer: str


class BatchItem(_Base):
    id: str = Field(min_length=1, max_length=200)
    features: FeatureVector


class BatchRequest(_Base):
    items: list[BatchItem] = Field(max_length=5000)


class BatchResult(_Base):
    id: str
    risk_level: RiskLevel
    probabilities: dict[str, float]


class BatchResponse(_Base):
    model_version: str
    is_demo_model: bool
    results: list[BatchResult]


# --- hotspots -------------------------------------------------------------------------------


class Point(_Base):
    id: str = Field(min_length=1, max_length=200)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class HotspotRequest(_Base):
    points: list[Point] = Field(max_length=20000)
    eps_m: float = Field(default=DEFAULT_EPS_M, ge=50, le=2000)
    min_samples: int = Field(default=DEFAULT_MIN_SAMPLES, ge=3, le=20)


class Centroid(_Base):
    lat: float
    lng: float


class Cluster(_Base):
    id: int
    centroid: Centroid
    radius_m: float
    count: int
    member_ids: list[str]


class HotspotParams(_Base):
    eps_m: float
    min_samples: int
    algorithm: str = HOTSPOT_ALGORITHM


class HotspotResponse(_Base):
    clusters: list[Cluster]
    noise_ids: list[str]
    params: HotspotParams
    total_points: int


# --- health and model info ------------------------------------------------------------------


class Health(_Base):
    status: str = "ok"
    model_loaded: bool
    model_version: str | None = None
    is_demo_model: bool | None = None


class DatasetCard(_Base):
    name: str
    is_demo_data: bool
    source: str
    url: str | None = None
    access_date: str | None = None
    licence: str
    records: int
    records_before_cleaning: int | None = None
    train_records: int
    test_records: int
    target_definition: str
    geographic_coverage: str
    temporal_coverage: str
    limitations: list[str]


class IntegerFeatureSpec(_Base):
    name: str
    label: str
    type: Literal["integer"]
    min: int
    max: int
    description: str | None = None


class CategoricalFeatureSpec(_Base):
    name: str
    label: str
    type: Literal["categorical"]
    values: list[str]
    description: str | None = None


FeatureSpec = Annotated[IntegerFeatureSpec | CategoricalFeatureSpec, Field(discriminator="type")]


class ClassMetrics(_Base):
    precision: float
    recall: float
    f1: float
    support: int


class Metrics(_Base):
    accuracy: float
    macro_f1: float
    weighted_f1: float
    per_class: dict[str, ClassMetrics]


class ConfusionMatrix(_Base):
    labels: list[str]
    matrix: list[list[int]]


class FeatureImportanceItem(_Base):
    feature: str
    importance: float
    method: Literal["impurity", "permutation"]
    importance_std: float | None = None


class ComparisonItem(_Base):
    model: str
    accuracy: float
    macro_f1: float
    cv_macro_f1: float | None = None
    cv_macro_f1_std: float | None = None


class ResearchModel(_Base):
    features: list[str]
    metrics: dict[str, float]
    note: str
    feature_importance: list[FeatureImportanceItem] | None = None


class HotspotDefaults(_Base):
    eps_meters: int
    min_samples: int


class ModelInfo(_Base):
    model_name: str
    model_version: str
    trained_at: str
    is_demo_model: bool
    dataset: DatasetCard
    preprocessing: list[str]
    features: list[FeatureSpec]
    classes: list[str]
    class_distribution: dict[str, dict[str, int]]
    metrics: Metrics
    confusion_matrix: ConfusionMatrix
    feature_importance: list[FeatureImportanceItem]
    comparison: list[ComparisonItem]
    research_model: ResearchModel
    hotspot_defaults: HotspotDefaults
    disclaimer: str
    selection_rule: str
    selected_candidate: str
    validation: dict[str, Any] | None = None
    sklearn_version: str
    python_version: str
    training_seconds: float
