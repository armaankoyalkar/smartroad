"""DBSCAN hotspot service on synthetic clusters and noise."""

from __future__ import annotations

import numpy as np

from app.services.hotspots import MIN_RADIUS_M, find_hotspots, haversine_m

BASE = (17.40, 78.45)


def offset(lat: float, lng: float, north_m: float, east_m: float) -> tuple[float, float]:
    return lat + north_m / 111_320.0, lng + east_m / (111_320.0 * np.cos(np.radians(lat)))


def blob(prefix: str, centre: tuple[float, float], spread_m: float, n: int) -> list[tuple[str, float, float]]:
    rng = np.random.default_rng(len(prefix))
    return [(f"{prefix}{i}", *offset(*centre, *rng.uniform(-spread_m, spread_m, 2))) for i in range(n)]


def test_haversine_distance_is_sane():
    lat, lng = offset(*BASE, 1000, 0)
    assert (
        haversine_m(BASE[0], BASE[1], np.array([lat]), np.array([lng]))[0] == 1000.0
        or abs(haversine_m(BASE[0], BASE[1], np.array([lat]), np.array([lng]))[0] - 1000.0) < 2.0
    )


def test_two_clusters_and_noise():
    big = blob("big", BASE, 40, 8)
    small = blob("small", offset(*BASE, 3000, 3000), 40, 5)
    noise = [(f"n{i}", *offset(*BASE, -6000 - 800 * i, 6000 + 800 * i)) for i in range(4)]
    result = find_hotspots(big + small + noise, eps_m=200, min_samples=4)

    assert result.total_points == 17
    assert [c.count for c in result.clusters] == [8, 5]
    assert [c.id for c in result.clusters] == [0, 1]
    assert set(result.clusters[0].member_ids) == {p[0] for p in big}
    assert set(result.clusters[1].member_ids) == {p[0] for p in small}
    assert sorted(result.noise_ids) == sorted(p[0] for p in noise)
    assert result.eps_m == 200 and result.min_samples == 4

    centroid = result.clusters[0]
    distance = haversine_m(centroid.lat, centroid.lng, np.array([BASE[0]]), np.array([BASE[1]]))[0]
    assert distance < 60
    assert MIN_RADIUS_M <= centroid.radius_m < 120


def test_radius_is_floored_at_thirty_metres():
    points = [(f"p{i}", *BASE) for i in range(5)]
    result = find_hotspots(points, eps_m=200, min_samples=4)
    assert len(result.clusters) == 1
    assert result.clusters[0].radius_m == MIN_RADIUS_M


def test_fewer_points_than_min_samples_gives_no_clusters():
    points = blob("p", BASE, 10, 3)
    result = find_hotspots(points, eps_m=200, min_samples=4)
    assert result.clusters == []
    assert sorted(result.noise_ids) == sorted(p[0] for p in points)
    assert result.total_points == 3
    empty = find_hotspots([], eps_m=200, min_samples=4)
    assert empty.clusters == [] and empty.noise_ids == [] and empty.total_points == 0


def test_eps_in_metres_controls_reachability():
    # DBSCAN counts the point itself: with 90 m spacing an interior point has 5 neighbours within
    # 200 m (core) but only 3 within 100 m (not core), so eps in metres decides the outcome.
    line = [(f"l{i}", *offset(*BASE, 0, 90 * i)) for i in range(6)]
    joined = find_hotspots(line, eps_m=200, min_samples=4)
    assert [c.count for c in joined.clusters] == [6]
    assert joined.noise_ids == []
    split = find_hotspots(line, eps_m=100, min_samples=4)
    assert split.clusters == []
    assert len(split.noise_ids) == 6


def test_min_samples_controls_cluster_formation():
    points = blob("p", BASE, 20, 4)
    assert len(find_hotspots(points, eps_m=200, min_samples=4).clusters) == 1
    assert len(find_hotspots(points, eps_m=200, min_samples=5).clusters) == 0


def test_output_is_deterministic():
    points = blob("a", BASE, 50, 6) + blob("b", offset(*BASE, 2000, 0), 50, 6)
    first = find_hotspots(points, eps_m=200, min_samples=4)
    second = find_hotspots(list(points), eps_m=200, min_samples=4)
    assert first == second
