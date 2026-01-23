import re
import logging
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Optional

# Configure module-level logger
logger = logging.getLogger(__name__)

class NotamParser:
    """
    Enterprise-grade parser for NOTAM Excel/CSV files.
    Includes heuristic header detection and robust column mapping.
    """

    @staticmethod
    def _find_header_row(df_preview: pd.DataFrame) -> int:
        """
        Scans the first 20 rows to find the true header row 
        by looking for known keywords.
        """
        target_headers = {'condition', 'subject', 'notam #', 'location', 'doc_id', 'txt_msg'}
        
        for i, row in df_preview.iterrows():
            # Convert row to lowercase string set
            row_values = row.astype(str).str.lower().tolist()
            # If we match at least 2 target headers, this is likely the header row
            matches = sum(1 for cell in row_values for target in target_headers if target in cell)
            if matches >= 2:
                return i
        return -1

    @staticmethod
    def _parse_coordinate(text: str) -> Optional[tuple[float, float]]:
        """
        Extracts lat/lon from standard NOTAM format (e.g., 5233N01317E).
        Returns (lat, lon) as decimal degrees.
        """
        if not isinstance(text, str): return None
        
        # Regex: 4 digits N, 5 digits E (e.g. 5103N00755E)
        match = re.search(r"(\d{4})N(\d{5})E", text)
        if match:
            lat_str, lon_str = match.groups()
            # Convert degrees + minutes to decimal
            # 5130N -> 51 + 30/60 = 51.5
            lat = float(lat_str[:2]) + float(lat_str[2:]) / 60
            lon = float(lon_str[:3]) + float(lon_str[3:]) / 60
            return lat, lon
        return None

    @staticmethod
    def _parse_q_line(q_text: str) -> tuple[Optional[int], Optional[int], Optional[float]]:
        """
        Extracts vertical limits (FL) and radius (NM) from the Q-Line.
        Example: .../000/022/...E005
        """
        if not isinstance(q_text, str):
            return None, None, None
        
        # Limits: /000/022/
        match_limits = re.search(r'/(\d{3})/(\d{3})/', q_text)
        min_fl = int(match_limits.group(1)) if match_limits else None
        max_fl = int(match_limits.group(2)) if match_limits else None

        # Radius: ...E005 (5 NM)
        # Note: Sometimes it's just '...005', heuristics can be tricky here.
        match_radius = re.search(r'[E|R](\d{3,4})', q_text.strip())
        radius = float(match_radius.group(1)) if match_radius else None

        return min_fl, max_fl, radius

    @staticmethod
    def _parse_date(date_val: Any) -> Optional[datetime]:
        """Parses various date formats."""
        if pd.isna(date_val) or str(date_val).strip() == '':
            return None
            
        clean = str(date_val).strip()
        formats = [
            "%y%m%d%H%M",      # 2501101200 (Standard NOTAM)
            "%Y-%m-%d %H:%M",  # Excel default
            "%m/%d/%Y %H%M",   # US format
            "%Y-%m-%d %H:%M:%S"
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(clean, fmt)
            except ValueError:
                continue
        return None

    @classmethod
    def process_file(cls, file_path: str) -> List[Dict[str, Any]]:
        """
        Main entry point. Reads file, hunts headers, extracts data.
        """
        logger.info(f"Parsing: {file_path}")
        results = []

        try:
            # 1. READ & DETECT HEADER
            if file_path.endswith(('.xls', '.xlsx')):
                # Read preview to find header
                df_preview = pd.read_excel(file_path, header=None, nrows=20)
                header_idx = cls._find_header_row(df_preview)
                
                if header_idx == -1:
                    logger.warning(f"Could not find header in {file_path}. Skipping.")
                    return []
                
                df = pd.read_excel(file_path, header=header_idx)
            else:
                # CSV fallback (usually has standard headers)
                df = pd.read_csv(file_path)

            # 2. NORMALIZE COLUMNS
            df.columns = df.columns.astype(str).str.lower().str.strip()
            
            # Map dynamic column names to internal keys
            col_map = {}
            for col in df.columns:
                if 'condition' in col or 'txt_msg' in col or 'text' in col: col_map['text'] = col
                if 'notam #' in col or 'doc_id' in col or 'number' in col: col_map['id'] = col
                if 'location' in col or 'fir' in col: col_map['fir'] = col
                if 'q_line' in col: col_map['q'] = col

            if 'text' not in col_map:
                logger.warning(f"No text column found in {file_path}. Skipping.")
                return []

            # 3. ITERATE ROWS
            for _, row in df.iterrows():
                raw_text = str(row.get(col_map['text'], ''))
                if len(raw_text) < 5: continue

                # Coordinates (Main logic)
                coords = cls._parse_coordinate(raw_text)
                # Fallback to Q-Line for coords if available
                if not coords and 'q' in col_map:
                    coords = cls._parse_coordinate(str(row.get(col_map.get('q'), '')))

                if not coords:
                    continue # Skip non-geospatial NOTAMs

                lat, lon = coords
                
                # Extract Metadata
                q_line_text = str(row.get(col_map.get('q'), ''))
                # If Q-Line column missing, try extracting Q) from text
                if not q_line_text:
                    q_match = re.search(r"Q\).*", raw_text)
                    if q_match: q_line_text = q_match.group(0)

                min_fl, max_fl, radius = cls._parse_q_line(q_line_text)

                # Dates (B) and C) lines)
                b_match = re.search(r"B\)\s*(\d{10})", raw_text)
                c_match = re.search(r"C\)\s*(\d{10})", raw_text)
                start_date = cls._parse_date(b_match.group(1)) if b_match else None
                end_date = cls._parse_date(c_match.group(1)) if c_match else None

                # Classification
                upper_text = raw_text.upper()
                obs_type = "OBSTACLE"
                if "WIND" in upper_text or "TURBINE" in upper_text: obs_type = "WIND TURBINE"
                elif "CRANE" in upper_text: obs_type = "CRANE"
                elif "MAST" in upper_text: obs_type = "MAST"
                elif "LIGHT" in upper_text: obs_type = "LIGHTS"

                # ID & FIR
                notam_id = str(row.get(col_map.get('id'), "UNKNOWN"))
                # Fallback ID extraction
                if notam_id == "UNKNOWN":
                     id_match = re.search(r"[A-Z]\d{4}/\d{2}", raw_text)
                     if id_match: notam_id = id_match.group(0)

                fir = str(row.get(col_map.get('fir'), "EDXX"))[:4]

                # Full Text Cleanup
                # Extract everything after E) until the end or next field
                e_match = re.search(r"E\)\s*(.*)", raw_text, re.DOTALL)
                full_text = e_match.group(1).split("\n\n")[0].strip() if e_match else raw_text[:300]

                results.append({
                    "notam_id": notam_id,
                    "fir": fir,
                    "obstacle_type": obs_type,
                    "lat": lat,
                    "lon": lon,
                    "min_fl": min_fl,
                    "max_fl": max_fl,
                    "radius_nm": radius,
                    "start_date": start_date,
                    "end_date": end_date,
                    "full_text": full_text
                })

        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}")

        return results