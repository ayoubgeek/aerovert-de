from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

# 1. Create the Async Engine
# This connects to the URI defined in config.py (postgresql+asyncpg://...)
engine = create_async_engine(
    str(settings.SQLALCHEMY_DATABASE_URI),
    echo=False, # Set to True if you want to see every SQL query in the logs
    future=True,
)

# 2. Create the Session Factory
# We use this factory to generate a new session for every request
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# 3. Dependency for FastAPI Routes
# This allows us to use `db: AsyncSession = Depends(get_db)` in our API endpoints
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session