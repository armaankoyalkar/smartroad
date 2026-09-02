"""GET /model/info: the metrics.json artifact (dataset card, metrics, feature schema)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.dependencies import StoreDep
from app.schemas import ModelInfo
from app.security import require_api_key

router = APIRouter(tags=["model"], dependencies=[Depends(require_api_key)])


@router.get("/model/info", response_model=ModelInfo)
def model_info(store: StoreDep) -> dict[str, Any]:
    return store.info()
