# ==============================================================================
# API DOCKERFILE
# Python 3.12 + UV (Multi-stage copy)
# ==============================================================================

# 1. Base Image
FROM python:3.12-slim-bookworm

# 2. System Dependencies
RUN apt-get update && apt-get install -y \
    curl \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 3. Install UV (The Pro Way)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# 4. Workspace Setup
WORKDIR /app

# 5. Dependency Installation
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# CRITICAL FIX: Copy README.md along with config files
# Hatchling requires the README to exist during the build process
COPY pyproject.toml uv.lock* README.md ./

# Install dependencies into the SYSTEM python environment
RUN uv pip install --system .

# 6. Copy Application Code
COPY . .

# 7. Command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]