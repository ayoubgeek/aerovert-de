import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2.shape import to_shape

# Keep your existing imports
from app.db.session import async_session_factory
from app.db.models import ObstacleParsed

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# --- CORS FIX (The "Nuclear" Option) ---
# We use ["*"] to allow ANY origin. This eliminates the "Access Blocked" error.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_db():
    async with async_session_factory() as session:
        yield session

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Aerovert Expert API is running"}

@app.get("/obstacles")
async def get_obstacles(db: AsyncSession = Depends(get_db)):
    logger.info("Fetching expert obstacles from DB...")
    
    # 1. Fetch from DB
    result = await db.execute(select(ObstacleParsed))
    obstacles = result.scalars().all()
    
    logger.info(f"DB returned {len(obstacles)} records.")
    
    features = []
    
    for i, obs in enumerate(obstacles):
        try:
            # Skip records without geometry
            if obs.geom is None:
                continue

            # Convert DB geometry to Shapely point
            point = to_shape(obs.geom)
            
            features.append({
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
                    "start_date": obs.start_date.isoformat() if obs.start_date else None,
                    "end_date": obs.end_date.isoformat() if obs.end_date else None
                }
            })
        except Exception as e:
            logger.error(f"Error processing obstacle {obs.notam_id}: {e}")
            continue
            
    return {
        "type": "FeatureCollection", 
        "count": len(features),
        "features": features
    }

# --- ADDED THIS BACK FOR THE DASHBOARD COUNTERS ---
@app.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """
    Get count of obstacles by type for the dashboard sidebar.
    """
    result = await db.execute(
        select(ObstacleParsed.obstacle_type, func.count(ObstacleParsed.id))
        .group_by(ObstacleParsed.obstacle_type)
    )
    return {row[0]: row[1] for row in result.all()}