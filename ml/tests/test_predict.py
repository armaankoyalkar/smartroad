"""Risk estimation on the temporary artifacts: levels, probabilities, contributions and batches."""

from __future__ import annotations

import pytest

from app.constants import FEATURE_NAMES, RISK_LEVELS
from app.model_loader import ModelStore, NotTrainedError
from app.services import risk


@pytest.fixture(scope="module")
def artifacts(artifacts_dir, expected_version):
    store = ModelStore(artifacts_dir)
    assert store.load() is True
    assert store.loaded and store.version == expected_version and store.is_demo_model is True
    return store.require()


def test_predict_returns_a_valid_level_and_distribution(artifacts, sample_features):
    result = risk.predict(artifacts, sample_features)
    assert result.risk_level in RISK_LEVELS
    assert list(result.probabilities) == RISK_LEVELS
    assert sum(result.probabilities.values()) == pytest.approx(1.0, abs=1e-4)
    assert max(result.probabilities, key=result.probabilities.get) == result.risk_level


def test_contributions_cover_every_feature_sorted_by_effect(artifacts, sample_features):
    result = risk.predict(artifacts, sample_features)
    assert [c.feature for c in sorted(result.contributions, key=lambda c: c.feature)] == sorted(FEATURE_NAMES)
    effects = [abs(c.effect) for c in result.contributions]
    assert effects == sorted(effects, reverse=True)
    for contribution in result.contributions:
        assert contribution.value == sample_features[contribution.feature]
        assert -1.0 <= contribution.effect <= 1.0


def test_baseline_vector_has_zero_contributions(artifacts):
    result = risk.predict(artifacts, dict(artifacts.baseline))
    assert all(c.effect == 0.0 for c in result.contributions)


def test_batch_matches_single_predictions(artifacts, sample_features):
    variants = [dict(sample_features), {**sample_features, "speed_limit": 20, "road_type": "LOCAL"}]
    items = [("a", variants[0]), ("b", variants[1])]
    batch = risk.predict_batch(artifacts, items)
    assert [r.id for r in batch] == ["a", "b"]
    for (_, features), row in zip(items, batch, strict=True):
        single = risk.predict(artifacts, features)
        assert row.risk_level == single.risk_level
        assert row.probabilities == single.probabilities
    assert risk.predict_batch(artifacts, []) == []


def test_store_without_artifacts(tmp_path):
    store = ModelStore(tmp_path)
    assert store.load() is False
    assert store.loaded is False and store.version is None and store.is_demo_model is None
    assert "missing" in (store.load_error or "")
    with pytest.raises(NotTrainedError) as excinfo:
        store.require()
    assert excinfo.value.detail == "Model artifacts not found. Run the training pipeline first."


def test_store_with_corrupt_model_file(tmp_path, artifacts_dir):
    for name in ("metrics.json", "baseline.json"):
        (tmp_path / name).write_bytes((artifacts_dir / name).read_bytes())
    (tmp_path / "model.joblib").write_bytes(b"not a joblib file")
    store = ModelStore(tmp_path)
    assert store.load() is False
    assert store.load_error is not None
