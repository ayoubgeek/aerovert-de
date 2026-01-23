from datetime import datetime
from typing import Optional

from geoalchemy2 import Geometry
from sqlalchemy import Index, String, Text, Float, Integer
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# ------------------------------------------------------------------------------
# BASE MODEL (SQLAlchemy 2.0)
# ------------------------------------------------------------------------------
class Base(DeclarativeBase):
    pass

# ------------------------------------------------------------------------------
# OBSTACLE MODEL
# ------------------------------------------------------------------------------
class ObstacleParsed(Base):
    """
    Represents a parsed NOTAM obstacle.
    Source of truth for geospatial queries via PostGIS.
    """
    __tablename__ = "obstacles_parsed"

    # Primary Keys & Identifiers
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    notam_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    
    # Classification
    fir: Mapped[Optional[str]] = mapped_column(String(4), index=True) # e.g. EDGG
    obstacle_type: Mapped[Optional[str]] = mapped_column(String(50), index=True)

    # Vertical & Dimensions
    min_fl: Mapped[Optional[int]] = mapped_column(Integer)
    max_fl: Mapped[Optional[int]] = mapped_column(Integer)
    radius_nm: Mapped[Optional[float]] = mapped_column(Float) # Float for 0.5 NM precision

    # Temporal Data (Indexed for range queries)
    start_date: Mapped[Optional[datetime]] = mapped_column(index=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(index=True)

    # Raw Content
    full_text: Mapped[Optional[str]] = mapped_column(Text)

    # Geospatial Data
    # We keep lat/lon as cached columns for fast non-GIS serialization,
    # but 'geom' is the PostGIS source of truth.
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    
    # CRITICAL FIX: Removed 'management=True' (Deprecated in GeoAlchemy2 0.14+)
    geom: Mapped[object] = mapped_column(
        Geometry("POINT", srid=4326)
    )

    # --------------------------------------------------------------------------
    # TABLE CONFIGURATION
    # --------------------------------------------------------------------------
    __table_args__ = (
        # Composite index for "Get all active WIND TURBINES" queries
        Index("idx_obstacle_type_dates", "obstacle_type", "start_date", "end_date"),
    )

    def __repr__(self) -> str:
        return f"<Obstacle(id={self.notam_id}, type={self.obstacle_type}, fl={self.max_fl})>"