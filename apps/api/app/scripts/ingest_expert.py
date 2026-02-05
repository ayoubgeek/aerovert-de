import pandas as pd
import re
import asyncio
import sys
import os
import glob
from datetime import datetime

# Allow importing from 'app'
sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from geoalchemy2.elements import WKTElement
from app.db.models import Base, ObstacleParsed
from app.config import settings

# --- CONFIGURATION ---
DB_URL = f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
DATA_ROOT = "/app/data/raw/2025"

# --- HELPER FUNCTIONS ---
def parse_q_line(q_text):
    if not isinstance(q_text, str): return None, None, None
    match = re.search(r'/(\d{3})/(\d{3})/[0-9N]+[0-9E]+(\d{3})', q_text)
    if match:
        return int(match.group(1)), int(match.group(2)), int(match.group(3))
    return None, None, None

def parse_date(date_str):
    if not isinstance(date_str, str): return None
    try:
        clean = str(date_str).strip()
        for fmt in ["%y%m%d%H%M", "%Y-%m-%d %H:%M", "%m/%d/%Y %H%M"]:
            try:
                return datetime.strptime(clean, fmt)
            except:
                continue
        return None
    except:
        return None

def extract_from_excel(file_path):
    filename = os.path.basename(file_path)
    print(f"   📄 Reading: {filename}")
    
    try:
        engine = 'xlrd' if file_path.endswith('.xls') else 'openpyxl'
        
        # Step 1: Hunt for Header Row
        df_preview = pd.read_excel(file_path, engine=engine, header=None, nrows=20)
        header_row_idx = -1
        
        target_headers = ['condition', 'subject', 'notam #', 'location']
        for i, row in df_preview.iterrows():
            row_str = row.astype(str).str.lower().tolist()
            if any(target in str(cell) for cell in row_str for target in target_headers):
                header_row_idx = i
                break
        
        if header_row_idx == -1:
            print("      ⚠️ Could not find header row. Skipping.")
            return []

        # Step 2: Load Data & CLEAN HEADERS IMMEDIATELY
        df = pd.read_excel(file_path, engine=engine, header=header_row_idx)
        # Convert all columns to string, lowercase, and strip whitespace FIRST
        df.columns = df.columns.astype(str).str.lower().str.strip()

        # Step 3: BRUTE FORCE Text Column Identification
        # Find column with the longest average text length
        text_col_name = None
        max_avg_len = 0
        
        for col in df.columns:
            try:
                # Sample 50 non-empty rows
                sample = df[col].dropna().astype(str)
                if len(sample) == 0: continue
                
                # Check average length of first 50 items
                avg_len = sample.head(50).apply(len).mean()
                if avg_len > max_avg_len:
                    max_avg_len = avg_len
                    text_col_name = col
            except:
                continue
                
        if not text_col_name:
             print("      ⚠️ Could not detect text column. Skipping.")
             return []

        # Identify other columns by name (now that names are clean)
        col_id = next((c for c in df.columns if 'notam #' in c or 'number' in c), None)
        col_loc = next((c for c in df.columns if 'location' in c), None)

    except Exception as e:
        print(f"   ❌ Failed to read {filename}: {e}")
        return []

    obstacles = []

    for _, row in df.iterrows():
        # SAFELY Access the text column
        if text_col_name not in row: continue
        
        raw_text = str(row[text_col_name])
        if raw_text == 'nan' or len(raw_text) < 5: continue

        # 1. Coordinate Regex
        coord_match = re.search(r"(\d{4})N(\d{5})E", raw_text)
        
        if coord_match:
            lat_str, lon_str = coord_match.groups()
            lat = float(lat_str[:2]) + float(lat_str[2:]) / 60
            lon = float(lon_str[:3]) + float(lon_str[3:]) / 60
            
            # 2. Extract ID
            notam_id = "UNKNOWN"
            if col_id and str(row[col_id]) != 'nan':
                notam_id = str(row[col_id])
            else:
                id_match = re.search(r"[A-Z]\d{4}/\d{2}", raw_text)
                if id_match: notam_id = id_match.group(0)

            # 3. Type Classification
            obs_type = "UNKNOWN"
            upper = raw_text.upper()
            if "WIND" in upper or "TURBINE" in upper: obs_type = "WIND TURBINE"
            elif "CRANE" in upper: obs_type = "CRANE"
            elif "DRONE" in upper or "UAS" in upper: obs_type = "DRONE_AREA"
            elif "LIGHT" in upper: obs_type = "LIGHTS"

            # 4. Q-Line Data
            q_match = re.search(r"Q\).*", raw_text)
            q_line = q_match.group(0) if q_match else ""
            min_fl, max_fl, radius = parse_q_line(q_line)

            # 5. Dates
            b_match = re.search(r"B\)\s*(\d{10})", raw_text)
            c_match = re.search(r"C\)\s*(\d{10})", raw_text)
            start_dt = parse_date(b_match.group(1)) if b_match else None
            end_dt = parse_date(c_match.group(1)) if c_match else None
            
            # 6. FIR
            fir = "EDXX"
            if col_loc and str(row[col_loc]) != 'nan':
                fir = str(row[col_loc])
            elif "EDGG" in filename: fir = "EDGG"
            elif "EDMM" in filename: fir = "EDMM"
            elif "EDWW" in filename: fir = "EDWW"

            # 7. Clean Text
            e_match = re.search(r"E\)\s*(.*)", raw_text, re.DOTALL)
            clean_text = e_match.group(1).split("\n")[0][:250] if e_match else raw_text[:100]

            obstacles.append({
                "notam_id": notam_id,
                "fir": fir,
                "obstacle_type": obs_type,
                "lat": lat, "lon": lon,
                "min_fl": min_fl, "max_fl": max_fl, "radius_nm": radius,
                "start_date": start_dt, "end_date": end_dt,
                "full_text": clean_text
            })

    return obstacles

async def save_to_db():
    print("🚀 Starting Expert Excel Ingestion (Fixed Ordering)...")
    engine = create_async_engine(DB_URL, echo=False)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    print("♻️  Skipping schema reset (Alembic handled it)...")
    # async with engine.begin() as conn:
    #     await conn.run_sync(Base.metadata.drop_all)
    #     await conn.run_sync(Base.metadata.create_all)

    all_obstacles = []
    search_path = os.path.join(DATA_ROOT, "**", "*.xls*")
    files = glob.glob(search_path, recursive=True)
    
    if not files:
        print(f"❌ No Excel files found in {DATA_ROOT}!")
        return

    print(f"📂 Found {len(files)} Excel files.")
    
    for f in files:
        all_obstacles.extend(extract_from_excel(f))

    # Deduplicate
    unique_obs = {obs['notam_id']: obs for obs in all_obstacles}.values()
    print(f"📊 Extracted {len(unique_obs)} unique obstacles from {len(all_obstacles)} raw records.")

    async with async_session() as session:
        count = 0
        # Batch processing
        batch_size = 500
        for i in range(0, len(unique_obs), batch_size):
            batch = list(unique_obs)[i:i+batch_size]
            print(f"   Processing batch {i} to {i+len(batch)}...")
            
            for obs in batch:
                # Safeguard string lengths to prevent DataError
                safe_notam = str(obs['notam_id'])[:20]
                safe_fir = str(obs['fir'])[:4]
                safe_type = str(obs['obstacle_type'])[:50]
                
                db_obj = ObstacleParsed(
                    notam_id=safe_notam,
                    fir=safe_fir,
                    obstacle_type=safe_type,
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
            
            try:
                await session.commit()
                count += len(batch)
            except Exception as e:
                print(f"❌ Batch failed: {e}")
                await session.rollback()
        
        print(f"✅ Successfully saved {count} records to Database.")

if __name__ == "__main__":
    asyncio.run(save_to_db())