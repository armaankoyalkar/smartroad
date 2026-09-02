"""X-API-Key protection for the internal routes.

The check is enforced only when ML_API_KEY is set. When it is empty (local development)
the dependency lets every request through; the application logs a warning at start-up.
"""

from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import Header, HTTPException, Request, status

API_KEY_HEADER = "X-API-Key"


def require_api_key(
    request: Request,
    x_api_key: Annotated[str | None, Header(alias=API_KEY_HEADER)] = None,
) -> None:
    expected: str = request.app.state.settings.api_key
    if not expected:
        return
    provided = x_api_key or ""
    if not secrets.compare_digest(provided.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing API key.")
