from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
)

from app.core.database import Base


class Location(Base):
    __tablename__ = "locations"

    location_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    country_id = Column(
        Integer,
        ForeignKey("country.country_id"),
        nullable=False,
    )

    city_id = Column(
        Integer,
        ForeignKey("city.city_id"),
        nullable=False,
    )

    location_name = Column(
        String(255),
        nullable=True,
    )
