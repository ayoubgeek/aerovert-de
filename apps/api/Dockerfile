# ==============================================================================
# API DOCKERFILE
# Python 3.12 + UV (Multi-stage copy)
# ==============================================================================

# 1. Base Image
FROM python:3.12-slim-bookworm

# 2. System Dependencies (Include GDAL/GEOS for PostGIS support)
RUN apt-get update && apt-get install -y     curl     libpq-dev     gcc     gdal-bin     libgdal-dev     && rm -rf /var/lib/apt/lists/*

# 3. Install UV (The Pro Way)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# 4. Workspace Setup
WORKDIR /app

# 5. Dependency Installation
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy dependency files
COPY pyproject.toml uv.lock* README.md ./

# Install dependencies into the SYSTEM python environment
RUN uv pip install --system .

# 6. Copy Application Code
COPY . .

# 7. Command (Run Migrations + Seed Data (if empty) + Start Server)
# We use shell form to allow variable expansion of 
CMD ["sh", "-c", "alembic upgrade head && python -m app.scripts.ingest_expert && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
