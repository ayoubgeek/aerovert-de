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
        # --- DEBUG LOGGING ---
        print(f"🔍 DEBUG: Config Loading...", file=sys.stderr)
        
        # 1. Explicitly check os.environ to bypass Pydantic issues
        raw_url = os.environ.get("DATABASE_URL")
        
        print(f"   -> os.environ['DATABASE_URL'] present? {bool(raw_url)}", file=sys.stderr)
        
        if raw_url:
            # Fix scheme for asyncpg
            url = raw_url.replace("postgresql://", "postgresql+asyncpg://")
            # Mask for logs
            safe_url = url
            if "@" in safe_url:
                 try:
                    part1 = safe_url.split("@")[1]
                    safe_url = "postgresql+asyncpg://****@" + part1
                 except: pass
            print(f"   -> Using DATABASE_URL (Explicit): {safe_url}", file=sys.stderr)
            return PostgresDsn(url)

        # 2. Fallback
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