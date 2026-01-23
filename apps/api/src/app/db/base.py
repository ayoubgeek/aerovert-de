from typing import Any

from sqlalchemy.ext.declarative import as_declarative, declared_attr
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    id: Any
    __name__: str

    # Automatically generate table names from class names
    # e.g., 'NotamRaw' class -> 'notam_raw' table
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower()