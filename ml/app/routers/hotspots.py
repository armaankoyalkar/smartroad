"""POST /hotspots: DBSCAN clusters of incident coordinates. Works without trained artifacts."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas import Centroid, Cluster, HotspotParams, HotspotRequest, HotspotResponse
from app.security import require_api_key
from app.services.hotspots import find_hotspots

router = APIRouter(tags=["hotspots"], dependencies=[Depends(require_api_key)])


@router.post("/hotspots", response_model=HotspotResponse)
def hotspots(body: HotspotRequest) -> HotspotResponse:
    result = find_hotspots(
        [(point.id, point.lat, point.lng) for point in body.points],
        eps_m=body.eps_m,
        min_samples=body.min_samples,
    )
    return HotspotResponse(
        clusters=[
            Cluster(
                id=c.id,
                centroid=Centroid(lat=c.lat, lng=c.lng),
                radius_m=c.radius_m,
                count=c.count,
                member_ids=c.member_ids,
            )
            for c in result.clusters
        ],
        noise_ids=result.noise_ids,
        params=HotspotParams(eps_m=result.eps_m, min_samples=result.min_samples),
        total_points=result.total_points,
    )
