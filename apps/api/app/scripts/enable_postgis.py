import asyncio
import os
import asyncpg
import sys

async def main():
    print("🌍 [SETUP] Checking PostGIS Extension...")
    raw_url = os.environ.get("DATABASE_URL")
    
    if not raw_url:
        print("❌ [SETUP] No DATABASE_URL found. Skipping PostGIS check.")
        return

    # asyncpg expects 'postgresql://' scheme.
    # If using pooled variants like 'postgresql+asyncpg://', clean it up.
    clean_url = raw_url.replace("postgresql+asyncpg://", "postgresql://")
    
    try:
        conn = await asyncpg.connect(clean_url)
        # Execute outside of transaction if possible, though asyncpg is auto-commit by default for simple execute
        print("🔌 [SETUP] Connected to Database.")
        
        await conn.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        print("✅ [SETUP] PostGIS Extension ENABLED successfully.")
        
        await conn.close()
    except Exception as e:
        print(f"⚠️ [SETUP] Failed to enable PostGIS: {e}")
        # We don't exit(1) because maybe it's already there or user has no permissions,
        # and we want to let Alembic try its luck.
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(main())
