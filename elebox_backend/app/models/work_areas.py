from sqlalchemy import Column, ForeignKey, Integer, String

from app.core.database import Base


class WorkArea(Base):
    __tablename__ = "work_areas"

    work_area_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    work_area_name = Column(
        String(255),
        nullable=False,
    )

    location_id = Column(
        Integer,
        ForeignKey("locations.location_id"),
        nullable=False,
    )
