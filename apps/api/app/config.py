from typing import Any
from pydantic import PostgresDsn, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict
import os
import sys

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    # DATABASE SETTINGS
    POSTGRES_SERVER: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password" 
    POSTGRES_DB: str = "aerovert"

    # RAW DATABASE_URL (From Railway/Render)
    DATABASE_URL: str | None = None

    @computed_field
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> PostgresDsn:
        # --- DEBUG LOGGING (FORCE FLUSH) ---
        print(f"🔍 DEBUG: Config Loading...", file=sys.stderr)
        print(f"   -> DB_URL Key Exists: {'DATABASE_URL' in os.environ}", file=sys.stderr)
        print(f"   -> DB_URL Value (Raw): {os.environ.get('DATABASE_URL', 'NOT_SET')[:15]}...", file=sys.stderr)
        
        if self.DATABASE_URL:
            # Fix scheme for asyncpg
            url = self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
            print(f"   -> Using DATABASE_URL: {url[:20]}...", file=sys.stderr)
            return PostgresDsn(url)

        print(f"   -> FALLBACK to host: {self.POSTGRES_SERVER}", file=sys.stderr)
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_DB,
        )

settings = Settings()