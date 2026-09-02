"""FastAPI routes through TestClient, with and without artifacts, with and without an API key."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.constants import DISCLAIMER, FEATURE_SCHEMA, NOT_TRAINED_DETAIL, RISK_LEVELS
from app.main import create_app

BASE = (17.40, 78.45)


def make_client(artifacts_dir: Path, api_key: str = "") -> TestClient:
    settings = Settings(
        _env_file=None, api_key=api_key, artifacts_dir=str(artifacts_dir), log_level="warning"
    )
    return TestClient(create_app(settings))


def cluster_points(n: int = 6) -> list[dict[str, float | str]]:
    rng = np.random.default_rng(1)
    return [
        {
            "id": f"p{i}",
            "lat": BASE[0] + rng.uniform(-0.0003, 0.0003),
            "lng": BASE[1] + rng.uniform(-0.0003, 0.0003),
        }
        for i in range(n)
    ]


@pytest.fixture(scope="module")
def client(artifacts_dir):
    with make_client(artifacts_dir) as client:
        yield client


def test_without_artifacts(tmp_path, sample_features):
    with make_client(tmp_path) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json() == {
            "status": "ok",
            "model_loaded": False,
            "model_version": None,
            "is_demo_model": None,
        }

        for method, path, body in (
            ("GET", "/model/info", None),
            ("POST", "/estimate/risk", {"features": sample_features}),
            ("POST", "/estimate/risk/batch", {"items": [{"id": "x", "features": sample_features}]}),
        ):
            response = client.request(method, path, json=body)
            assert response.status_code == 503, path
            assert response.json() == {"detail": NOT_TRAINED_DETAIL}

        hotspots = client.post("/hotspots", json={"points": cluster_points()})
        assert hotspots.status_code == 200
        assert hotspots.json()["clusters"][0]["count"] == 6


def test_health_with_artifacts(client, expected_version):
    assert client.get("/health").json() == {
        "status": "ok",
        "model_loaded": True,
        "model_version": expected_version,
        "is_demo_model": True,
    }


def test_model_info_shape(client, metrics_document, expected_version):
    body = client.get("/model/info").json()
    assert body["model_version"] == expected_version
    assert body["is_demo_model"] is True
    assert body["dataset"]["is_demo_data"] is True
    assert body["features"] == FEATURE_SCHEMA
    assert body["classes"] == RISK_LEVELS
    assert body["metrics"] == metrics_document["metrics"]
    assert body["confusion_matrix"] == metrics_document["confusion_matrix"]
    assert [row["model"] for row in body["comparison"]] == [
        row["model"] for row in metrics_document["comparison"]
    ]
    assert body["hotspot_defaults"] == {"eps_meters": 200, "min_samples": 4}
    assert body["disclaimer"] == DISCLAIMER
    assert {"research_model", "preprocessing", "feature_importance", "class_distribution"} <= set(body)


def test_estimate_risk_success(client, sample_features, expected_version):
    response = client.post("/estimate/risk", json={"features": sample_features})
    assert response.status_code == 200
    body = response.json()
    assert body["risk_level"] in RISK_LEVELS
    assert list(body["probabilities"]) == RISK_LEVELS
    assert sum(body["probabilities"].values()) == pytest.approx(1.0, abs=1e-4)
    assert body["model_version"] == expected_version and body["is_demo_model"] is True
    assert body["disclaimer"] == DISCLAIMER
    assert len(body["contributions"]) == 10
    assert {"feature", "value", "effect"} == set(body["contributions"][0])


@pytest.mark.parametrize(
    "override",
    [
        {"hour": 24},
        {"hour": -1},
        {"month": 13},
        {"speed_limit": 10},
        {"speed_limit": 121},
        {"weather": "SNOW"},
        {"day_of_week": "MONDAY"},
        {"category": "pothole-ish"},
        {"road_type": None},
    ],
)
def test_estimate_risk_rejects_bad_values(client, sample_features, override):
    response = client.post("/estimate/risk", json={"features": {**sample_features, **override}})
    assert response.status_code == 422
    field = next(iter(override))
    assert any(field in err["loc"] for err in response.json()["detail"])


def test_estimate_risk_requires_all_ten_features(client, sample_features):
    partial = {k: v for k, v in sample_features.items() if k != "area_type"}
    response = client.post("/estimate/risk", json={"features": partial})
    assert response.status_code == 422


def test_estimate_risk_batch(client, sample_features, expected_version):
    items = [
        {"id": "one", "features": sample_features},
        {"id": "two", "features": {**sample_features, "speed_limit": 20, "category": "STREET_LIGHT"}},
    ]
    response = client.post("/estimate/risk/batch", json={"items": items})
    assert response.status_code == 200
    body = response.json()
    assert body["model_version"] == expected_version and body["is_demo_model"] is True
    assert [r["id"] for r in body["results"]] == ["one", "two"]
    assert all(r["risk_level"] in RISK_LEVELS for r in body["results"])
    assert client.post("/estimate/risk/batch", json={"items": []}).json()["results"] == []
    too_many = {"items": [{"id": str(i), "features": sample_features} for i in range(5001)]}
    assert client.post("/estimate/risk/batch", json=too_many).status_code == 422


def test_hotspots_endpoint(client):
    points = cluster_points(7) + [{"id": "far", "lat": 17.9, "lng": 78.9}]
    response = client.post("/hotspots", json={"points": points, "eps_m": 250, "min_samples": 5})
    assert response.status_code == 200
    body = response.json()
    assert body["total_points"] == 8
    assert body["params"] == {"eps_m": 250.0, "min_samples": 5, "algorithm": "DBSCAN (haversine)"}
    assert body["noise_ids"] == ["far"]
    cluster = body["clusters"][0]
    assert cluster["id"] == 0 and cluster["count"] == 7
    assert set(cluster) == {"id", "centroid", "radius_m", "count", "member_ids"}
    assert set(cluster["centroid"]) == {"lat", "lng"}

    assert client.post("/hotspots", json={"points": points, "eps_m": 10}).status_code == 422
    assert client.post("/hotspots", json={"points": points, "min_samples": 2}).status_code == 422
    assert client.post("/hotspots", json={"points": [{"id": "x", "lat": 95, "lng": 0}]}).status_code == 422


def test_api_key_enforced_when_set(artifacts_dir, sample_features):
    with make_client(artifacts_dir, api_key="s3cret") as client:
        assert client.get("/health").status_code == 200  # liveness stays open
        assert client.get("/model/info").status_code == 401
        assert client.get("/model/info", headers={"X-API-Key": "wrong"}).status_code == 401
        assert client.post("/hotspots", json={"points": []}).status_code == 401
        assert client.post("/estimate/risk", json={"features": sample_features}).status_code == 401
        ok = client.get("/model/info", headers={"X-API-Key": "s3cret"})
        assert ok.status_code == 200
        assert (
            client.post("/hotspots", json={"points": []}, headers={"x-api-key": "s3cret"}).status_code == 200
        )


def test_api_key_skipped_when_empty(client):
    assert client.get("/model/info").status_code == 200
    assert client.get("/model/info", headers={"X-API-Key": "anything"}).status_code == 200
