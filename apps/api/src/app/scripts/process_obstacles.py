import asyncio
import logging
import sys
from pathlib import Path

# Fix path to ensure we can import 'app'
# This allows running via 'python apps/api/src/app/scripts/process_obstacles.py'
sys.path.append(str(Path(__file__).resolve().parents[4]))

from sqlalchemy.dialects.postgresql import insert
from geoalchemy2.elements import WKTElement

from app.db.session import async_session_factory
from app.db.models import ObstacleParsed
from app.services.parser import NotamParser
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aerovert.ingest")

async def ingest_obstacles():
    """
    Main entry point: Scans DATA_DIR, parses files, and upserts to DB.
    """
    logger.info("🚀 Starting Ingestion Pipeline...")
    
    parser = NotamParser()
    data_dir = Path(settings.DATA_DIR)
    
    # 1. Find Files (Recursively find .xls and .xlsx)
    # We ignore CSVs for now if Excel is the source of truth
    files = list(data_dir.rglob("*.xls")) + list(data_dir.rglob("*.xlsx"))
    
    if not files:
        logger.warning(f"❌ No Excel files found in {data_dir}")
        return

    logger.info(f"📂 Found {len(files)} files to process.")

    async with async_session_factory() as session:
        for file_path in files:
            # Parse Data using the robust Service
            raw_data = parser.process_file(str(file_path))
            
            if not raw_data:
                continue

            logger.info(f"   ↳ Upserting {len(raw_data)} records...")

            # Batch Upsert Logic
            for record in raw_data:
                # Prepare SQLAlchemy Insert Statement
                stmt = insert(ObstacleParsed).values(
                    notam_id=record["notam_id"],
                    fir=record["fir"],
                    obstacle_type=record["obstacle_type"],
                    lat=record["lat"],
                    lon=record["lon"],
                    min_fl=record["min_fl"],
                    max_fl=record["max_fl"],
                    radius_nm=record["radius_nm"],
                    start_date=record["start_date"],
                    end_date=record["end_date"],
                    full_text=record["full_text"],
                    # PostGIS Geometry
                    geom=WKTElement(f"POINT({record['lon']} {record['lat']})", srid=4326)
                )
                
                # ON CONFLICT DO UPDATE (Upsert)
                # If 'notam_id' exists, update the mutable fields
                do_update_stmt = stmt.on_conflict_do_update(
                    index_elements=['notam_id'],
                    set_={
                        "start_date": record["start_date"],
                        "end_date": record["end_date"],
                        "full_text": record["full_text"],
                        "max_fl": record["max_fl"],
                        "obstacle_type": record["obstacle_type"]
                    }
                )

                await session.execute(do_update_stmt)
            
            await session.commit()
            
    logger.info("✅ Ingestion Complete.")

if __name__ == "__main__":
    asyncio.run(ingest_obstacles())