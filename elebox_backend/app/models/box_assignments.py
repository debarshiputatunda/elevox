from sqlalchemy import Column, ForeignKey, Integer

from app.core.database import Base


class BoxAssignment(Base):
    __tablename__ = "box_assignments"

    box_id = Column(
        Integer,
        ForeignKey("box_details.box_id"),
        primary_key=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False,
        unique=True,
    )

    work_area_id = Column(
        Integer,
        ForeignKey("work_areas.work_area_id"),
        nullable=False,
    )
