# ==============================================================================
# API DOCKERFILE
# Python 3.12 + UV Package Manager
# ==============================================================================

# 1. Base Image
FROM python:3.12-slim-bookworm

# 2. System Dependencies
# - curl: to install uv
# - libpq-dev: for postgres (psycopg/asyncpg) build
RUN apt-get update && apt-get install -y \
    curl \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 3. Install UV (Fast Package Manager)
# We download the standalone installer and place it in /bin
ADD https://astral.sh/uv/install.sh /install.sh
RUN chmod +x /install.sh && /install.sh && rm /install.sh
ENV PATH="/root/.cargo/bin:$PATH"

# 4. Workspace Setup
WORKDIR /app

# 5. Dependency Installation
# Copy only the config files first to leverage Docker cache
COPY pyproject.toml uv.lock* ./

# Install dependencies into the SYSTEM python environment
# This avoids needing to activate a venv inside the container
RUN uv pip install --system .

# 6. Copy Application Code
COPY . .

# 7. Environment Config
# Ensure Python finds the 'app' module
ENV PYTHONPATH=/app
# Prevent Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1
# Unbuffered output (logs show up immediately)
ENV PYTHONUNBUFFERED=1

# 8. Command (Overridden by docker-compose, but good fallback)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]