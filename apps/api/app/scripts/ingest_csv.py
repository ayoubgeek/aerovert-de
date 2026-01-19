import pandas as pd
import asyncio
import sys
import os
import glob
from datetime import datetime
from sqlalchemy.dialects.postgresql import insert as pg_insert

# Add path to find the app modules
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

from app.db.session import async_session_factory
from app.db.models import NotamRaw

# CONFIG
DATA_ROOT = "/app/data" 
DEFAULT_FIR = "EDGG" 

async def process_file(file_path, session):
    filename = os.path.basename(file_path)
    folder_name = os.path.basename(os.path.dirname(file_path))
    fir_code_from_folder = folder_name if len(folder_name) == 4 else DEFAULT_FIR
    
    print(f"\n📄 Reading: {filename} (FIR: {fir_code_from_folder})...")
    
    df = None
    try:
        # Try CSV (UTF-8)
        df = pd.read_csv(file_path, skiprows=4)
    except Exception:
        try:
            # Try CSV (Latin-1) - Common for European data
            df = pd.read_csv(file_path, skiprows=4, encoding="latin1")
        except Exception:
            try:
                # Try Excel
                df = pd.read_excel(file_path, skiprows=4)
            except Exception as e:
                print(f"   ❌ Skipped {filename}: {e}")
                return

    df.columns = df.columns.str.strip()
    
    if 'NOTAM #' not in df.columns:
        print(f"   ⚠️ Skipping {filename}: 'NOTAM #' column missing.")
        return

    df['NOTAM #'] = df['NOTAM #'].ffill()
    df['Location'] = df['Location'].ffill()
    
    grouped = df.groupby('NOTAM #')
    notams_data = []
    
    for notam_id, group in grouped:
        first_row = group.iloc[0]
        
        text_col = 'NOTAM Condition or LTA Subject'
        if text_col not in group.columns:
            text_col = group.columns[-1]
        full_text = "\n".join(group[text_col].dropna().astype(str))
        
        valid_from = None
        valid_to = None
        fmt = "%m/%d/%Y %H%M"
        
        try:
            if pd.notna(first_row.get('Effective Date (UTC)')):
                valid_from = datetime.strptime(str(first_row['Effective Date (UTC)']).strip(), fmt)
            if pd.notna(first_row.get('Expiration Date (UTC)')):
                raw_end = str(first_row['Expiration Date (UTC)']).replace('EST', '').strip()
                if 'PERM' in raw_end:
                    valid_to = datetime(2099, 12, 31)
                else:
                    valid_to = datetime.strptime(raw_end, fmt)
        except:
            pass 

        # Prepare Dictionary for bulk insert
        notams_data.append({
            "fir": str(first_row.get('Location') or fir_code_from_folder),
            "year": datetime.now().year,
            "month": datetime.now().month,
            "notam_id": str(notam_id),
            "text_raw": full_text,
            "valid_from": valid_from,
            "valid_to": valid_to
        })

    if notams_data:
        # UPSERT LOGIC: Insert, or Update if 'notam_id' conflict exists
        stmt = pg_insert(NotamRaw).values(notams_data)
        
        stmt = stmt.on_conflict_do_update(
            index_elements=['notam_id'], # The unique constraint
            set_={
                'text_raw': stmt.excluded.text_raw,
                'valid_from': stmt.excluded.valid_from,
                'valid_to': stmt.excluded.valid_to,
                'fir': stmt.excluded.fir,
                'year': stmt.excluded.year,
                'month': stmt.excluded.month
            }
        )
        
        await session.execute(stmt)
        await session.commit()
        print(f"   ✅ Processed {len(notams_data)} records (inserted/updated).")

async def main():
    print(f"📂 Scanning recursive tree: {DATA_ROOT}...")
    
    target_files = []
    for root, dirs, files in os.walk(DATA_ROOT):
        for file in files:
            if file.lower().endswith(('.xls', '.xlsx', '.csv')):
                target_files.append(os.path.join(root, file))
    
    target_files.sort()
    
    if not target_files:
        print(f"❌ No files found in {DATA_ROOT}")
        return

    print(f"👉 Found {len(target_files)} files. Starting ingestion...")

    async with async_session_factory() as session:
        for file_path in target_files:
            await process_file(file_path, session)
            
    print("\n🎉 All files processed!")

if __name__ == "__main__":
    asyncio.run(main())