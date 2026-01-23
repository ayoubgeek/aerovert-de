import pandas as pd
import re
import asyncio
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from geoalchemy2.elements import WKTElement
from app.db.models import Base, ObstacleParsed
from app.config import settings
from datetime import datetime

# --- CONFIGURATION ---
DB_URL = f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
DATA_DIR = Path("data/raw/2025")

# --- 1. DATE PARSER ---
def parse_notam_date(date_str):
    if not date_str: return None
    clean_str = str(date_str).strip()
    if "PERM" in clean_str or "EST" in clean_str: return None 
    try:
        if len(clean_str) >= 10:
            return datetime.strptime(clean_str[:10], "%y%m%d%H%M")
    except:
        return None
    return None

# --- 2. INTELLIGENT CLASSIFICATION ---
def classify_obstacle(text):
    """
    Uses Regex to find WHOLE WORDS only.
    Prevents 'FLIGHT' from matching 'LIGHT'.
    Excludes non-physical hazards like 'Bomb Disposal'.
    """
    u_text = str(text).upper()
    
    # A. THE KILL LIST (Immediate Disqualification)
    # If any of these words exist, it is NOT a physical obstacle.
    exclusions = [
        "UAS", "DRONE", "GLIDER", "PARACHUTE", "MILITARY EXERCISE",
        "OVERFLIGHT", "PROHIBITED", "RESTRICTED AREA", "BOMB", "EXPLOSION",
        "SAR FLIGHTS", "FIREWORKS", "LASER", "GUN FIRING", "AEROBATIC"
    ]
    for ex in exclusions:
        if ex in u_text: return None

    # B. THE "YES" LIST (Physical Obstacles)
    # \b matches word boundaries (start/end of word).
    
    # 1. WIND TURBINES
    if re.search(r"\b(WIND|TURBINE|WINDPARK|WINDMILL)\b", u_text): 
        return "WIND TURBINE"
    
    # 2. CRANES
    if re.search(r"\b(CRANE|CRANES)\b", u_text): 
        return "CRANE"
    
    # 3. MASTS / TOWERS
    if re.search(r"\b(MAST|ANTENNA|POLE|TOWER|PYLON)\b", u_text): 
        return "MAST"
    
    # 4. LIGHTS (Strict Check)
    # Must be "OBST LGT" or "LIGHTS" as a whole word.
    # Excludes "FLIGHT" or "DAYLIGHT".
    if re.search(r"\b(OBST LGT|LGT|LIGHTS)\b", u_text): 
        return "LIGHTS"
    
    return None

# --- 3. PARSING LOGIC ---
def parse_coordinate(coord_str, is_lat=True):
    if not coord_str: return 0.0
    s = coord_str.strip()
    try:
        if is_lat:
            if len(s) == 6: return float(s[:2]) + float(s[2:4])/60 + float(s[4:])/3600
            elif len(s) == 4: return float(s[:2]) + float(s[2:])/60
        else:
            if len(s) == 7: return float(s[:3]) + float(s[3:5])/60 + float(s[5:])/3600
            elif len(s) == 5: return float(s[:3]) + float(s[3:])/60
    except:
        return 0.0
    return 0.0

def extract_obstacles(file_path):
    print(f"📡 Scanning: {file_path.name}")
    try:
        df = pd.read_excel(file_path, header=None, dtype=str)
        df = df.dropna(how='all')
    except Exception:
        return []

    obstacles = []
    
    for index, row in df.iterrows():
        try:
            row_text = " ".join([str(x) for x in row.values if pd.notna(x)])
            
            # --- CLASSIFY ---
            obs_type = classify_obstacle(row_text)
            if not obs_type:
                continue 

            # --- DATES ---
            b_match = re.search(r"B\)\s*(\d{10})", row_text)
            c_match = re.search(r"C\)\s*(\d{10}|PERM)", row_text)
            start_date = parse_notam_date(b_match.group(1)) if b_match else datetime.now()
            end_date = parse_notam_date(c_match.group(1)) if c_match else None

            # --- COORDINATES ---
            lat, lon, radius = 0.0, 0.0, 0
            # Q-Line Priority
            q_match = re.search(r"/(\d{4})N(\d{5})E(\d{3})", row_text)
            
            if q_match:
                lat_str, lon_str, rad_str = q_match.groups()
                lat = float(lat_str[:2]) + float(lat_str[2:])/60
                lon = float(lon_str[:3]) + float(lon_str[3:])/60
                radius = int(rad_str)
            else:
                coord_match = re.search(r"(\d{4,6})N.*?(\d{5,7})E", row_text)
                if coord_match:
                    l_str, lo_str = coord_match.groups()
                    lat = parse_coordinate(l_str, True)
                    lon = parse_coordinate(lo_str, False)
                else:
                    continue 

            # --- ID & TEXT ---
            id_match = re.search(r"[A-Z]\d{4}/\d{2}", row_text)
            notam_id = id_match.group(0) if id_match else f"GEN-{index}"

            fl_match = re.search(r"/(\d{3})/(\d{3})", row_text)
            max_fl = int(fl_match.group(2)) if fl_match else 0
            min_fl = int(fl_match.group(1)) if fl_match else 0

            # Clean Text (Only E line)
            e_match = re.search(r"E\)\s*(.+)", row_text, re.DOTALL)
            clean_text = e_match.group(1).split(" F)")[0].split(" G)")[0][:400] if e_match else row_text[:300]

            obstacles.append({
                "notam_id": notam_id,
                "fir": file_path.parent.name,
                "obstacle_type": obs_type,
                "lat": lat,
                "lon": lon,
                "min_fl": min_fl,
                "max_fl": max_fl,
                "radius_nm": radius,
                "start_date": start_date,
                "end_date": end_date,
                "full_text": clean_text.strip()
            })
        except Exception:
            continue

    return obstacles

async def clean_and_load():
    engine = create_async_engine(DB_URL, echo=False)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    print("🧹 Wiping database to remove 'Bomb' and 'Overflight' records...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    files = list(DATA_DIR.rglob("*.xls")) + list(DATA_DIR.rglob("*.xlsx"))
    
    all_obstacles = []
    for f in files:
        all_obstacles.extend(extract_obstacles(f))
    
    unique_obs = {obs['notam_id']: obs for obs in all_obstacles}.values()
    print(f"📉 Cleaned Data Count: {len(unique_obs)}")

    if not unique_obs:
        print("❌ No data found.")
        return

    async with async_session() as session:
        count = 0
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
            count += 1
        await session.commit()
        print(f"✅ Ingestion Complete.")

if __name__ == "__main__":
    asyncio.run(clean_and_load())