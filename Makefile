# ==============================================================================
# AEROVERT-DE AUTOMATION
# ==============================================================================

# .PHONY tells Make that these are commands, not actual files
.PHONY: help install up down logs restart clean api-shell db-shell

# Default target: print help
help:
	@echo "Available commands:"
	@echo "  make install    - Install local dependencies (uv + pnpm)"
	@echo "  make up         - Start services in background (Docker)"
	@echo "  make down       - Stop services"
	@echo "  make logs       - Tail logs for all services"
	@echo "  make restart    - Restart all services"
	@echo "  make clean      - Remove temp files and docker volumes"
	@echo "  make api-shell  - Open bash inside the running API container"
	@echo "  make db-shell   - Connect to Postgres CLI"

# ------------------------------------------------------------------------------
# 1. Local Setup
# ------------------------------------------------------------------------------
install:
	@echo "Installing Python dependencies with uv..."
	cd apps/api && uv sync
	@echo "Installing Frontend dependencies with pnpm..."
	cd apps/web && pnpm install

# ------------------------------------------------------------------------------
# 2. Docker Orchestration
# ------------------------------------------------------------------------------
up:
	@echo "Starting services..."
	docker compose up -d --build

down:
	@echo "Stopping services..."
	docker compose down

logs:
	docker compose logs -f

restart: down up

# ------------------------------------------------------------------------------
# 3. Debugging Helpers
# ------------------------------------------------------------------------------
# Critical for debugging inside the container environment
api-shell:
	docker compose exec api /bin/bash

# Direct access to the DB (requires container to be running)
db-shell:
	docker compose exec db psql -U postgres -d aerovert

# ------------------------------------------------------------------------------
# 4. Maintenance
# ------------------------------------------------------------------------------
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	@echo "Clean complete."