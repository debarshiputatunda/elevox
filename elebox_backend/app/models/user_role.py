from app.core.database import Base
from sqlalchemy import Column, Integer, ForeignKey


class UserRole(Base):
    __tablename__ = "user_role"

    user_role_id = Column(
        Integer,
        primary_key=True,
    )

    role_id = Column(
        Integer,
        ForeignKey("roles.role_id"),
        primary_key=True,
        nullable=False,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        primary_key=True,
        nullable=False,
    )

