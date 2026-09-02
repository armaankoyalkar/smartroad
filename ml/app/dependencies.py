"""FastAPI dependencies shared by the routers."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request

from app.model_loader import ModelStore


def get_store(request: Request) -> ModelStore:
    return request.app.state.store


StoreDep = Annotated[ModelStore, Depends(get_store)]
