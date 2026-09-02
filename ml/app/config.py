"""Service settings, read from ML_* environment variables and ml/.env."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ML_DIR: Path = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    """Runtime configuration. Every field maps to an ML_<NAME> variable (see ml/.env.example)."""

    model_config = SettingsConfigDict(
        env_prefix="ML_",
        env_file=str(ML_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    host: str = "127.0.0.1"
    port: int = 8000
    api_key: str = ""
    artifacts_dir: str = "artifacts"
    log_level: str = "info"

    @property
    def artifacts_path(self) -> Path:
        """Absolute artifacts directory; relative values are resolved against ml/."""
        path = Path(self.artifacts_dir)
        return path if path.is_absolute() else ML_DIR / path


def get_settings() -> Settings:
    return Settings()
