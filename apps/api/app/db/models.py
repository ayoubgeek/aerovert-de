from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from sqlalchemy.orm import declarative_base
from geoalchemy2 import Geometry

Base = declarative_base()

class ObstacleParsed(Base):
    __tablename__ = "obstacles_parsed"

    id = Column(Integer, primary_key=True, index=True)
    notam_id = Column(String, unique=True, index=True)  # e.g., F0153/25
    fir = Column(String)                                # e.g., EDGG
    obstacle_type = Column(String)                      # WIND TURBINE, CRANE, etc.
    
    # NEW: Professional Vertical Data
    min_fl = Column(Integer)   # Flight Level (e.g., 000)
    max_fl = Column(Integer)   # Flight Level (e.g., 022)
    radius_nm = Column(Integer) # Radius in Nautical Miles
    
    # NEW: Temporal Data
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    
    # NEW: Context
    full_text = Column(Text)   # The E) line
    
    # Geometry
    lat = Column(Float)
    lon = Column(Float)
    geom = Column(Geometry("POINT", srid=4326))