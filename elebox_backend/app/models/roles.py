from app.core.database import Base
from sqlalchemy import Column, Integer, String


class Role(Base):
    __tablename__ = "roles"

    role_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    role_name = Column(
        String(255),
        nullable=False,
    )

    description = Column(
        String(255),
        nullable=True,
    )