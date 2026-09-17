from sqlalchemy import Column, Date, ForeignKey, Integer, String, TIMESTAMP

from app.core.database import Base


class BoxDetail(Base):
    __tablename__ = "box_details"

    box_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    serial_no = Column(
        String(255),
        nullable=True,
    )

    box_ip = Column(
        String(255),
        nullable=True,
    )

    box_details = Column(
        String(500),
        nullable=True,
    )

    location_id = Column(
        Integer,
        ForeignKey("locations.location_id"),
        nullable=True,
    )

    work_area_id = Column(
        Integer,
        ForeignKey("work_areas.work_area_id"),
        nullable=True,
    )

    last_seen = Column(
        TIMESTAMP,
        nullable=True,
    )

    activity_status = Column(
        Integer,
        ForeignKey("activity_status.activity_status_id"),
        nullable=True,
    )

    box_health_status = Column(
        Integer,
        ForeignKey("box_health.health_status_id"),
        nullable=True,
    )

    mfg_date = Column(
        Date,
        nullable=True,
    )

    hookA_threshold = Column(
        Integer,
        nullable=True,
    )

    hookB_threshold = Column(
        Integer,
        nullable=True,
    )

    is_assigned = Column(
        Integer,
        nullable=False,
        default=0,
    )
