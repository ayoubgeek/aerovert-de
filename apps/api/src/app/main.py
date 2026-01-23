import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Any

from fastapi import FastAPI, APIRouter, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, desc, case
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.shape import to_shape

# Internal imports
from app.db.session import async_session_factory
from app.db.models import ObstacleParsed

# ------------------------------------------------------------------------------
# 1. CONFIGURATION & LOGGING
# ------------------------------------------------------------------------------
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger("aerovert.api")

# ------------------------------------------------------------------------------
# 2. DEPENDENCIES
# ------------------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to yield a database session per request.
    Closes the session automatically after the request finishes.
    """
    async with async_session_factory() as session:
        yield session

# ------------------------------------------------------------------------------
# 3. HELPER FUNCTIONS (Serialization)
# ------------------------------------------------------------------------------
def serialize_obstacle(obs: ObstacleParsed) -> dict[str, Any] | None:
    """
    Converts a DB model to a GeoJSON Feature.
    Returns None if geometry is invalid to allow filtering.
    """
    try:
        if obs.geom is None:
            return None

        # Convert WKBElement to Shapely object
        point = to_shape(obs.geom)

        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [point.x, point.y]
            },
            "properties": {
                "id": obs.notam_id,
                "db_id": obs.id,
                "type": obs.obstacle_type,
                "fir": obs.fir,
                "min_fl": obs.min_fl,
                "max_fl": obs.max_fl,
                "radius": obs.radius_nm,
                "text": obs.full_text,
                # Safe ISO format conversion
                "start_date": obs.start_date.isoformat() if obs.start_date else None,
                "end_date": obs.end_date.isoformat() if obs.end_date else None
            }
        }
    except Exception as e:
        logger.warning(f"Failed to serialize obstacle {obs.notam_id}: {e}")
        return None

# ------------------------------------------------------------------------------
# 4. ROUTERS (To be moved to app/api/v1/endpoints/...)
# ------------------------------------------------------------------------------
api_router = APIRouter()

@api_router.get("/health")
def health_check():
    return {"status": "ok", "service": "aerovert-api"}

@api_router.get("/obstacles")
async def list_obstacles(db: AsyncSession = Depends(get_db)):
    """
    Returns all obstacles as a GeoJSON FeatureCollection.
    """
    logger.info("Fetching obstacles...")
    
    # Execute Query
    stmt = select(ObstacleParsed)
    result = await db.execute(stmt)
    obstacles = result.scalars().all()
    
    # Serialize (List Comprehension is slightly faster than generic loop)
    # Filter out None results from serialization errors
    features = [
        feat for obs in obstacles 
        if (feat := serialize_obstacle(obs)) is not None
    ]
    
    logger.info(f"Returning {len(features)} valid obstacles.")
    
    return {
        "type": "FeatureCollection", 
        "count": len(features),
        "features": features
    }

@api_router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """
    Analytics Engine: Aggregates statistics for the dashboard.
    """
    logger.debug("Calculating statistics...")

    # 1. Total Count
    total = await db.scalar(select(func.count(ObstacleParsed.id)))

    # 2. Breakdown by Type
    type_stmt = (
        select(ObstacleParsed.obstacle_type, func.count(ObstacleParsed.id))
        .group_by(ObstacleParsed.obstacle_type)
    )
    type_res = await db.execute(type_stmt)
    by_type = {row[0]: row[1] for row in type_res.all()}

    # 3. Regional Saturation (Top 5 FIRs)
    fir_stmt = (
        select(ObstacleParsed.fir, func.count(ObstacleParsed.id))
        .where(ObstacleParsed.fir.isnot(None))
        .group_by(ObstacleParsed.fir)
        .order_by(desc(func.count(ObstacleParsed.id)))
        .limit(5)
    )
    fir_res = await db.execute(fir_stmt)
    by_fir = [{"name": row[0], "value": row[1]} for row in fir_res.all()]

    # 4. Vertical Conflict Zones
    vertical_stmt = (
        select(
            case(
                (ObstacleParsed.max_fl < 5, "Low (<500ft)"),
                (ObstacleParsed.max_fl.between(5, 20), "Mid (500-2k ft)"),
                else_="High (>2k ft)"
            ).label("zone"),
            func.count(ObstacleParsed.id)
        )
        .group_by("zone")
    )
    vert_res = await db.execute(vertical_stmt)
    vertical_data = {row[0]: row[1] for row in vert_res.all()}

    return {
        "total": total,
        "by_type": by_type,
        "by_fir": by_fir,
        "vertical": vertical_data
    }

# ------------------------------------------------------------------------------
# 5. APPLICATION FACTORY
# ------------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB pools, load ML models, etc.
    logger.info("Startup: Aerovert API initializing...")
    yield
    # Shutdown: Close DB connections
    logger.info("Shutdown: cleanup complete.")

app = FastAPI(
    title="Aerovert API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS (Should be configurable via env vars in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
# We mount everything under /api/v1 for future-proofing
app.include_router(api_router, prefix="/api/v1")

# Keep root endpoint for health checks from AWS/K8s load balancers
@app.get("/")
def root():
    return {"message": "Aerovert API is online. Docs at /docs"}