from sqlalchemy import Column, Integer, String

from app.core.database import Base


class City(Base):
    __tablename__ = "city"

    city_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    city_name = Column(
        String(255),
        nullable=False,
    )
