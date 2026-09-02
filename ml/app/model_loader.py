"""Loads the training artifacts (model.joblib, metrics.json, baseline.json) at start-up."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
from sklearn.pipeline import Pipeline

from app.constants import NOT_TRAINED_DETAIL

log = logging.getLogger(__name__)

MODEL_FILE = "model.joblib"
METRICS_FILE = "metrics.json"
BASELINE_FILE = "baseline.json"


class NotTrainedError(RuntimeError):
    """Raised when a route needs artifacts that are not on disk. Mapped to HTTP 503."""

    def __init__(self, detail: str = NOT_TRAINED_DETAIL) -> None:
        super().__init__(detail)
        self.detail = detail


@dataclass(frozen=True)
class LoadedArtifacts:
    pipeline: Pipeline
    metrics: dict[str, Any]
    baseline: dict[str, Any]


class ModelStore:
    """Holds the loaded artifacts. `loaded` is False until `load()` finds all three files."""

    def __init__(self, artifacts_dir: Path) -> None:
        self.artifacts_dir = Path(artifacts_dir)
        self._artifacts: LoadedArtifacts | None = None
        self.load_error: str | None = None

    @property
    def loaded(self) -> bool:
        return self._artifacts is not None

    @property
    def version(self) -> str | None:
        return self._artifacts.metrics.get("model_version") if self._artifacts else None

    @property
    def is_demo_model(self) -> bool | None:
        return bool(self._artifacts.metrics.get("is_demo_model")) if self._artifacts else None

    def load(self) -> bool:
        paths = {name: self.artifacts_dir / name for name in (MODEL_FILE, METRICS_FILE, BASELINE_FILE)}
        missing = [name for name, path in paths.items() if not path.is_file()]
        if missing:
            self.load_error = f"missing {', '.join(missing)} in {self.artifacts_dir}"
            log.warning("Model artifacts not loaded: %s", self.load_error)
            self._artifacts = None
            return False
        try:
            # joblib (pickle-based) is the standard persistence format for scikit-learn pipelines.
            # The file is written by ml/training on this machine and is never fetched from the
            # network or accepted from a request, so loading it is the intended trust boundary.
            pipeline = joblib.load(paths[MODEL_FILE])
            metrics = json.loads(paths[METRICS_FILE].read_text(encoding="utf-8"))
            baseline = json.loads(paths[BASELINE_FILE].read_text(encoding="utf-8"))
        except Exception as exc:  # a corrupt artifact must not crash the service; /health reports it
            self.load_error = f"{type(exc).__name__}: {exc}"
            log.error("Failed to load model artifacts from %s: %s", self.artifacts_dir, self.load_error)
            self._artifacts = None
            return False
        self._artifacts = LoadedArtifacts(pipeline=pipeline, metrics=metrics, baseline=baseline)
        self.load_error = None
        log.info(
            "Loaded %s version %s (demo model: %s) from %s",
            metrics.get("model_name"),
            metrics.get("model_version"),
            metrics.get("is_demo_model"),
            self.artifacts_dir,
        )
        return True

    def require(self) -> LoadedArtifacts:
        if self._artifacts is None:
            raise NotTrainedError()
        return self._artifacts

    def info(self) -> dict[str, Any]:
        return dict(self.require().metrics)
