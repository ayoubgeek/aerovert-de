import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, case
from geoalchemy2.shape import to_shape

# Keep your existing imports
from app.db.session import async_session_factory
from app.db.models import ObstacleParsed

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# --- CORS FIX ---
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
    
    # Fetch all obstacles
    result = await db.execute(select(ObstacleParsed))
    obstacles = result.scalars().all()
    
    logger.info(f"DB returned {len(obstacles)} records.")
    
    features = []
    
    for i, obs in enumerate(obstacles):
        try:
            if obs.geom is None:
                continue

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

@app.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """
    Analytics Engine: Returns data for the Dashboard charts.
    """
    
    # 1. Total Count
    total_query = await db.execute(select(func.count(ObstacleParsed.id)))
    total_count = total_query.scalar()

    # 2. Ghost Hazards (Type Breakdown)
    type_query = await db.execute(
        select(ObstacleParsed.obstacle_type, func.count(ObstacleParsed.id))
        .group_by(ObstacleParsed.obstacle_type)
    )
    by_type = {row[0]: row[1] for row in type_query.all()}

    # 3. Regional Saturation (Top 5 FIRs)
    fir_query = await db.execute(
        select(ObstacleParsed.fir, func.count(ObstacleParsed.id))
        .where(ObstacleParsed.fir.isnot(None))
        .group_by(ObstacleParsed.fir)
        .order_by(desc(func.count(ObstacleParsed.id)))
        .limit(5)
    )
    by_fir = [{"name": row[0], "value": row[1]} for row in fir_query.all()]

    # 4. Vertical Conflict (Altitude Distribution)
    # We categorize into 3 safety zones:
    # - Low Level (< 500ft): VFR Traffic Pattern risk
    # - Mid Level (500-2000ft): Cruise risk
    # - High Level (> 2000ft): Major vertical structures
    vertical_query = await db.execute(
        select(
            case(
                (ObstacleParsed.max_fl < 5, "Low (<500ft)"),
                (ObstacleParsed.max_fl.between(5, 20), "Mid (500-2k ft)"),
                else_="High (>2k ft)"
            ).label("altitude_zone"),
            func.count(ObstacleParsed.id)
        )
        .group_by("altitude_zone")
    )
    vertical_data = {row[0]: row[1] for row in vertical_query.all()}

    return {
        "total": total_count,
        "by_type": by_type,
        "by_fir": by_fir,
        "vertical": vertical_data
    }