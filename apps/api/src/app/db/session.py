from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings

# ------------------------------------------------------------------------------
# DATABASE ENGINE
# ------------------------------------------------------------------------------
# We use the 'future' flag to ensure 2.0 style compatibility.
# pool_pre_ping=True helps prevent "connection closed" errors in Docker/Cloud.
engine = create_async_engine(
    str(settings.SQLALCHEMY_DATABASE_URI),
    echo=settings.DB_ECHO,  # Controlled via env var
    future=True,
    pool_pre_ping=True,
)

# ------------------------------------------------------------------------------
# SESSION FACTORY
# ------------------------------------------------------------------------------
# expire_on_commit=False is critical for AsyncSQLAlchemy to avoid
# "Missing Greenlet" errors when accessing attributes after a commit.
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autoflush=False,
    expire_on_commit=False,
)

# ------------------------------------------------------------------------------
# DEPENDENCY INJECTION
# ------------------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a database session.
    Ensures the session is closed even if an error occurs.
    """
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            # Rollback logic is handled by the context manager or caller,
            # but explicit logging could go here if needed.
            await session.rollback()
            raise
        finally:
            # Context manager automatically closes, but being explicit is safe.
            await session.close()