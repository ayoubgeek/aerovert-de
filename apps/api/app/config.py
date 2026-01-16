import os
from pathlib import Path
from typing import Any

from pydantic import PostgresDsn, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ==========================================================================
    # CORE SETTINGS
    # ==========================================================================
    PROJECT_NAME: str = "Aerovert-DE API"
    API_V1_STR: str = "/api/v1"
    
    # ==========================================================================
    # DATABASE SETTINGS
    # ==========================================================================
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "password")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "aerovert")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", 5432))

    @computed_field  # type: ignore[misc]
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        """
        Constructs the Asyncpg connection string dynamically.
        """
        return str(
            PostgresDsn.build(
                scheme="postgresql+asyncpg",
                username=self.POSTGRES_USER,
                password=self.POSTGRES_PASSWORD,
                host=self.POSTGRES_SERVER,
                port=self.POSTGRES_PORT,
                path=self.POSTGRES_DB,
            )
        )

    # ==========================================================================
    # FILE SYSTEM SETTINGS
    # ==========================================================================
    # Finds the project root relative to this file
    # This logic allows the code to run inside Docker (/app) or locally
    BASE_DIR: Path = Path(__file__).resolve().parent.parent

    # Where do we look for the Excel files?
    # inside docker this maps to /app/data
    DATA_DIR: Path = BASE_DIR / "data" 

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )


settings = Settings()