import pandas as pd
import sys
import os

# Install dependency just in case
os.system("pip install xlrd openpyxl > /dev/null 2>&1")

# Pick the first file we can find
file_path = "/app/data/raw/2025/EDGG/01_EDGG.xls"

print(f"🔍 INSPECTING FILE: {file_path}")
try:
    # Try reading as Excel
    df = pd.read_excel(file_path, engine="xlrd")
    
    print("\n--- 1. COLUMN HEADERS ---")
    print(df.columns.tolist())
    
    print("\n--- 2. FIRST ROW OF DATA ---")
    if not df.empty:
        print(df.iloc[0].to_dict())
    else:
        print("⚠️ DataFrame is empty!")

except Exception as e:
    print(f"❌ Error: {e}")