import pandas as pd
import re
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from geoalchemy2.elements import WKTElement
from app.db.models import Base, ObstacleParsed
from app.config import settings
from datetime import datetime

# --- CONFIGURATION ---
DB_URL = f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
FILES = [
    "data/raw/2025/EDGG_2025_01.csv",
    "data/raw/2025/EDMM_2025_01.csv",
    "data/raw/2025/EDWW_2025_01.csv"
]

# --- EXPERT PARSING LOGIC ---
def parse_q_line(q_text):
    """
    Extracts Limits and Radius from Q-Line:
    Example: Q) EDGG/QOLAS/IV/M /E /000/022/5103N00755E001
    Returns: (min_fl, max_fl, radius) -> (0, 22, 1)
    """
    if not isinstance(q_text, str): return None, None, None
    
    # Regex to find the pattern: /000/022/...E001
    match = re.search(r'/(\d{3})/(\d{3})/[0-9N]+[0-9E]+(\d{3})', q_text)
    if match:
        return int(match.group(1)), int(match.group(2)), int(match.group(3))
    return None, None, None

def parse_date(date_str):
    """Parses NOTAM date format YYMMDDHHMM (e.g., 2501101225)"""
    if not isinstance(date_str, str): return None
    try:
        return datetime.strptime(str(date_str).strip(), "%y%m%d%H%M")
    except:
        return None

def extract_obstacles(file_path):
    print(f"📡 Scanning expert data from: {file_path}")
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        print(f"❌ Error reading {file_path}: {e}")
        return []

    obstacles = []
    
    # Iterate through rows
    for _, row in df.iterrows():
        text = str(row.get('text_raw', ''))
        q_line = str(row.get('q_line', '')) # Assuming you have this or extract from text
        
        # 1. Coordinate Extraction (Standard)
        coord_match = re.search(r"(\d{4})N(\d{5})E", text)
        if not coord_match:
            # Fallback: Try extracting from Q-Line if main text fails
            coord_match = re.search(r"(\d{4})N(\d{5})E", q_line)
            
        if coord_match:
            lat_str, lon_str = coord_match.groups()
            lat = float(lat_str[:2]) + float(lat_str[2:]) / 60
            lon = float(lon_str[:3]) + float(lon_str[3:]) / 60
            
            # 2. Type Classification
            obs_type = "UNKNOWN"
            upper_text = text.upper()
            if "WIND" in upper_text or "TURBINE" in upper_text: obs_type = "WIND TURBINE"
            elif "CRANE" in upper_text: obs_type = "CRANE"
            elif "MAST" in upper_text: obs_type = "MAST"
            elif "LIGHT" in upper_text or "LGT" in upper_text: obs_type = "LIGHTS"
            elif "DRONE" in upper_text or "UAS" in upper_text: obs_type = "DRONE_AREA"

            # 3. Expert Data Extraction (Q-Line)
            # Find the Q-line inside the raw text if column doesn't exist
            q_match = re.search(r"Q\).*", text)
            raw_q = q_match.group(0) if q_match else ""
            
            min_fl, max_fl, radius = parse_q_line(raw_q)
            
            # 4. Dates
            # Extract B) and C) lines
            b_match = re.search(r"B\)\s*(\d{10})", text)
            c_match = re.search(r"C\)\s*(\d{10})", text)
            start_dt = parse_date(b_match.group(1)) if b_match else None
            end_dt = parse_date(c_match.group(1)) if c_match else None

            # 5. Full Text Cleanup (The E-Line)
            e_match = re.search(r"E\)\s*(.*)", text, re.DOTALL)
            clean_text = e_match.group(1).split("\n")[0][:200] if e_match else text[:100]

            obstacles.append({
                "notam_id": row.get('notam_id'),
                "fir": row.get('fir', 'EDXX'),
                "obstacle_type": obs_type,
                "lat": lat,
                "lon": lon,
                "min_fl": min_fl,
                "max_fl": max_fl,
                "radius_nm": radius,
                "start_date": start_dt,
                "end_date": end_dt,
                "full_text": clean_text
            })

    return obstacles

async def save_to_db():
    engine = create_async_engine(DB_URL, echo=False)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    # Re-create tables to fit new schema (WARNING: DELETES OLD DATA)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    all_obstacles = []
    for f in FILES:
        all_obstacles.extend(extract_obstacles(f))
    
    # Deduplicate by ID
    unique_obs = {obs['notam_id']: obs for obs in all_obstacles}.values()

    async with async_session() as session:
        for obs in unique_obs:
            db_obj = ObstacleParsed(
                notam_id=obs['notam_id'],
                fir=obs['fir'],
                obstacle_type=obs['obstacle_type'],
                lat=obs['lat'],
                lon=obs['lon'],
                min_fl=obs['min_fl'],
                max_fl=obs['max_fl'],
                radius_nm=obs['radius_nm'],
                start_date=obs['start_date'],
                end_date=obs['end_date'],
                full_text=obs['full_text'],
                geom=WKTElement(f"POINT({obs['lon']} {obs['lat']})", srid=4326)
            )
            session.add(db_obj)
        
        await session.commit()
        print(f"✅ Successfully ingested {len(unique_obs)} EXPERT records.")

if __name__ == "__main__":
    asyncio.run(save_to_db())