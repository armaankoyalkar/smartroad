"""FastAPI application factory for the SmartRoad ML service.

Run with:  python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
The service is called only by the SmartRoad backend, so no CORS middleware is configured.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.config import Settings, get_settings
from app.constants import NOT_TRAINED_DETAIL
from app.model_loader import ModelStore, NotTrainedError
from app.routers import estimate, health, hotspots, model

SERVICE_VERSION = "1.0.0"
log = logging.getLogger("app")


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


async def _not_trained_handler(_: Request, exc: Exception) -> JSONResponse:
    detail = exc.detail if isinstance(exc, NotTrainedError) else NOT_TRAINED_DETAIL
    return JSONResponse(status_code=503, content={"detail": detail})


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        store = ModelStore(settings.artifacts_path)
        store.load()
        application.state.store = store
        if not settings.api_key:
            log.warning("ML_API_KEY is empty: the X-API-Key check is disabled (local development only).")
        if not store.loaded:
            log.warning("%s (%s)", NOT_TRAINED_DETAIL, store.load_error)
        yield

    application = FastAPI(
        title="SmartRoad ML service",
        version=SERVICE_VERSION,
        description=(
            "Internal service for the SmartRoad backend: risk-level estimates from historical data "
            "and DBSCAN clusters of reported incidents."
        ),
        lifespan=lifespan,
    )
    application.state.settings = settings
    application.add_exception_handler(NotTrainedError, _not_trained_handler)
    for router in (health.router, model.router, estimate.router, hotspots.router):
        application.include_router(router)
    return application


app = create_app()
