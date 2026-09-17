from sqlalchemy import Column, Integer, String

from app.core.database import Base


class ActivityStatus(Base):
    __tablename__ = "activity_status"

    activity_status_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    activity_status_name = Column(
        String(255),
        nullable=False,
    )
