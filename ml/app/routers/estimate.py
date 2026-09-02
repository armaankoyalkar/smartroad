"""POST /estimate/risk and POST /estimate/risk/batch."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.constants import DISCLAIMER
from app.dependencies import StoreDep
from app.model_loader import LoadedArtifacts
from app.schemas import (
    BatchRequest,
    BatchResponse,
    BatchResult,
    Contribution,
    RiskRequest,
    RiskResponse,
)
from app.security import require_api_key
from app.services import risk

router = APIRouter(prefix="/estimate", tags=["estimate"], dependencies=[Depends(require_api_key)])


def _version(artifacts: LoadedArtifacts) -> tuple[str, bool]:
    return str(artifacts.metrics["model_version"]), bool(artifacts.metrics["is_demo_model"])


@router.post("/risk", response_model=RiskResponse)
def estimate_risk(body: RiskRequest, store: StoreDep) -> RiskResponse:
    artifacts = store.require()
    result = risk.predict(artifacts, body.features.model_dump())
    version, is_demo = _version(artifacts)
    return RiskResponse(
        risk_level=result.risk_level,  # type: ignore[arg-type]  # the pipeline's classes are the three risk levels
        probabilities=result.probabilities,
        model_version=version,
        is_demo_model=is_demo,
        contributions=[
            Contribution(feature=c.feature, value=c.value, effect=c.effect) for c in result.contributions
        ],
        disclaimer=str(artifacts.metrics.get("disclaimer", DISCLAIMER)),
    )


@router.post("/risk/batch", response_model=BatchResponse)
def estimate_risk_batch(body: BatchRequest, store: StoreDep) -> BatchResponse:
    artifacts = store.require()
    results = risk.predict_batch(artifacts, [(item.id, item.features.model_dump()) for item in body.items])
    version, is_demo = _version(artifacts)
    return BatchResponse(
        model_version=version,
        is_demo_model=is_demo,
        results=[
            BatchResult(id=r.id, risk_level=r.risk_level, probabilities=r.probabilities)  # type: ignore[arg-type]
            for r in results
        ],
    )
