from app.core.database import Base
from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    TIMESTAMP,
    LargeBinary,
    text,
)



class User(Base):
    __tablename__ = "users"

    user_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    employee_id = Column(
        String(255),
        unique=True,
        nullable=True,
    )

    status_id = Column(
        Integer,
        ForeignKey("account_status.status_id"),
        nullable=True,
    )

    employee_name = Column(
        String(255),
        nullable=True,
    )

    job_title_id = Column(
        Integer,
        ForeignKey("job_title.job_title_id"),
        nullable=True,
    )

    email_id = Column(
        String(255),
        unique=True,
        nullable=True,
    )

    phonenumber = Column(
        String(255),
        unique=True,
        nullable=True,
    )

    work_area_id = Column(
        Integer,
        ForeignKey("work_areas.work_area_id"),
        nullable=True,
    )

    location_id = Column(
        Integer,
        ForeignKey("locations.location_id"),
        nullable=True,
    )

    photo = Column(
        LargeBinary,
        nullable=True,
    )

    password = Column(
        String(255),
        nullable=True,
    )

    created_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

