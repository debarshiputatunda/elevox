from sqlalchemy import Column, Integer, String

from app.core.database import Base


class JobTitle(Base):
    __tablename__ = "job_title"

    job_title_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    job_title_name = Column(
        String(255),
        nullable=False,
    )
