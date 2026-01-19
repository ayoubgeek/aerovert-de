import datetime
from typing import Optional, Any

from geoalchemy2 import Geometry
from sqlalchemy import String, Integer, DateTime, Float, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base

class NotamRaw(Base):
    """
    Stores the raw import from the Excel file.
    Acts as the immutable source of truth.
    """
    __tablename__ = "notams_raw"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # Metadata from the file filename/structure
    fir: Mapped[str] = mapped_column(String(4), index=True)  # e.g., 'EDGG'
    year: Mapped[int] = mapped_column(Integer)               # e.g., 2025
    month: Mapped[int] = mapped_column(Integer)              # e.g., 1
    
    # The actual NOTAM content
    # We use explicit parsing later, but keep raw text safe here
    notam_id: Mapped[str] = mapped_column(String(20), unique=True, index=True) # e.g. 'A1234/25'
    text_raw: Mapped[str] = mapped_column(Text)
    
    # Validity extracted during rough pass (critical for filtering)
    valid_from: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True))
    valid_to: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True))
    
    # Audit
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationship
    parsed_obstacle: Mapped[Optional["ObstacleParsed"]] = relationship(
        back_populates="raw_notam", uselist=False, cascade="all, delete-orphan"
    )


class ObstacleParsed(Base):
    """
    The clean, structured data derived from a raw NOTAM.
    This is what the frontend map actually consumes.
    """
    __tablename__ = "obstacles_parsed"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    
    # Link back to raw data
    notam_raw_id: Mapped[int] = mapped_column(ForeignKey("notams_raw.id"), unique=True)
    
    # Extracted attributes
    obstacle_type: Mapped[str] = mapped_column(String(50))  # CRANE, WIND TURBINE, RIG
    height_agl: Mapped[Optional[float]] = mapped_column(Float, nullable=True) # Above Ground Level (ft)
    height_amsl: Mapped[Optional[float]] = mapped_column(Float, nullable=True) # Above Mean Sea Level (ft)
    
    # Spatial Data (PostGIS)
    # SRID 4326 = WGS84 (Standard Lat/Lon used by GPS)
    geom: Mapped[Any] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=True)
    )
    
    # For debugging regex quality
    confidence_score: Mapped[float] = mapped_column(Float, default=1.0) # 0.0 to 1.0
    
    # Relationships
    raw_notam: Mapped["NotamRaw"] = relationship(back_populates="parsed_obstacle")

    # Performance Indexes
    __table_args__ = (
        Index("idx_obstacles_type", "obstacle_type"),
    )