from sqlalchemy import Column, Integer, String

from app.core.database import Base


class AccountStatus(Base):
    __tablename__ = "account_status"

    status_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    status_name = Column(
        String(255),
        nullable=False,
    )
