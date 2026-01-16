from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

# Initialize the Application
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ==============================================================================
# MIDDLEWARE
# ==============================================================================
# Allow Cross-Origin requests from the Frontend (Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific domain list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# ROUTES
# ==============================================================================
@app.get("/health", tags=["System"])
async def health_check():
    """
    Simple health check endpoint for container orchestrators.
    """
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "database_url": "configured" if settings.POSTGRES_SERVER else "missing"
    }

@app.get("/")
async def root():
    """
    Root redirect or welcome message.
    """
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "version": "0.1.0"
    }

# We will import and include API routers here in later phases
# app.include_router(api_router, prefix=settings.API_V1_STR)