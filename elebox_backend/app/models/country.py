from sqlalchemy import Column, Integer, String

from app.core.database import Base


class Country(Base):
    __tablename__ = "country"

    country_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    country_name = Column(
        String(255),
        nullable=False,
    )
