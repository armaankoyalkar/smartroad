"""Clusters of reported incident coordinates with DBSCAN (haversine metric, eps in metres).

These are density clusters of reports, not an output of the risk classifier.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, replace

import numpy as np
from sklearn.cluster import DBSCAN

EARTH_RADIUS_M = 6_371_000.0
MIN_RADIUS_M = 30.0


@dataclass(frozen=True)
class Cluster:
    id: int
    lat: float
    lng: float
    radius_m: float
    count: int
    member_ids: list[str]


@dataclass(frozen=True)
class HotspotResult:
    clusters: list[Cluster]
    noise_ids: list[str]
    eps_m: float
    min_samples: int
    total_points: int


def haversine_m(lat1: float, lng1: float, lat2: np.ndarray, lng2: np.ndarray) -> np.ndarray:
    """Great-circle distance in metres from one point to an array of points."""
    phi1, phi2 = np.radians(lat1), np.radians(lat2)
    dphi = phi2 - phi1
    dlambda = np.radians(lng2) - np.radians(lng1)
    a = np.sin(dphi / 2) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_M * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0)))


def find_hotspots(
    points: Sequence[tuple[str, float, float]], eps_m: float, min_samples: int
) -> HotspotResult:
    """Run DBSCAN over (id, lat, lng) points.

    eps is converted from metres to radians (eps_m / Earth radius) for the haversine metric.
    Clusters are ordered by size (descending, ties by first appearance) and re-numbered from 0.
    The radius is the largest haversine distance from the centroid to a member, floored at 30 m.
    With fewer than min_samples points every point is noise and there are zero clusters.
    """
    ids = [point[0] for point in points]
    total = len(points)
    if total < min_samples:
        return HotspotResult(
            clusters=[], noise_ids=ids, eps_m=eps_m, min_samples=min_samples, total_points=total
        )

    coords = np.array([[point[1], point[2]] for point in points], dtype=float)
    model = DBSCAN(
        eps=eps_m / EARTH_RADIUS_M, min_samples=min_samples, metric="haversine", algorithm="ball_tree"
    )
    labels = model.fit(np.radians(coords)).labels_

    unordered: list[tuple[int, Cluster]] = []
    for label in sorted(set(labels.tolist()) - {-1}):
        idx = np.flatnonzero(labels == label)
        members = coords[idx]
        lat_c = float(members[:, 0].mean())
        lng_c = float(members[:, 1].mean())
        radius = float(haversine_m(lat_c, lng_c, members[:, 0], members[:, 1]).max())
        cluster = Cluster(
            id=-1,
            lat=round(lat_c, 6),
            lng=round(lng_c, 6),
            radius_m=round(max(radius, MIN_RADIUS_M), 1),
            count=int(len(idx)),
            member_ids=[ids[i] for i in idx],
        )
        unordered.append((int(idx[0]), cluster))

    unordered.sort(key=lambda item: (-item[1].count, item[0]))
    clusters = [replace(cluster, id=number) for number, (_, cluster) in enumerate(unordered)]
    noise_ids = [ids[i] for i in np.flatnonzero(labels == -1)]
    return HotspotResult(
        clusters=clusters, noise_ids=noise_ids, eps_m=eps_m, min_samples=min_samples, total_points=total
    )
