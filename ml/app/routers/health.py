"""GET /health: liveness plus whether the model artifacts are loaded. No API key required."""

from __future__ import annotations

from fastapi import APIRouter

from app.dependencies import StoreDep
from app.schemas import Health

router = APIRouter(tags=["health"])


@router.get("/health", response_model=Health)
def health(store: StoreDep) -> Health:
    return Health(
        status="ok",
        model_loaded=store.loaded,
        model_version=store.version,
        is_demo_model=store.is_demo_model,
    )
