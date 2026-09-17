from sqlalchemy import BigInteger, Column, ForeignKey, Integer, String, TIMESTAMP

from app.core.database import Base


class BoxLog(Base):
    __tablename__ = "box_logs"

    log_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False,
        index=True,
    )
    box_id = Column(
        Integer,
        ForeignKey("box_details.box_id"),
        nullable=False,
        index=True,
    )
    work_area_id = Column(
        Integer,
        ForeignKey("work_areas.work_area_id"),
        nullable=True,
    )
    description = Column(String(500), nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, index=True)
