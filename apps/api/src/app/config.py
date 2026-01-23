import os
from typing import Any, List

from pydantic import PostgresDsn, computed_field, AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # --------------------------------------------------------------------------
    # CORE SETTINGS
    # --------------------------------------------------------------------------
    PROJECT_NAME: str = "Aerovert API"
    API_V1_STR: str = "/api/v1"
    
    # CORS: List of origins allowed to access the API
    # In production, this should be specific (e.g., ["https://aerovert.com"])
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl | str] = ["*"]

    # --------------------------------------------------------------------------
    # DATA & STORAGE
    # --------------------------------------------------------------------------
    # Where raw Excel files are stored. 
    # Defaults to local './data' if not set in docker-compose.
    DATA_DIR: str = os.getenv("DATA_DIR", "./data")

    # --------------------------------------------------------------------------
    # DATABASE SETTINGS
    # --------------------------------------------------------------------------
    POSTGRES_SERVER: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "aerovert"
    
    # Toggle SQL query logging (useful for debugging)
    DB_ECHO: bool = False

    @computed_field
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> PostgresDsn:
        """
        Constructs the async Postgres DSN.
        """
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_DB,
        )

    model_config = SettingsConfigDict(
        env_file=".env", 
        case_sensitive=True,
        extra="ignore" # Ignore extra env vars (like Docker internals)
    )

settings = Settings()