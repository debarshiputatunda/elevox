from sqlalchemy import Column, Integer, String

from app.core.database import Base


class BoxHealth(Base):
    __tablename__ = "box_health"

    health_status_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    health_status_name = Column(
        String(255),
        nullable=False,
    )
