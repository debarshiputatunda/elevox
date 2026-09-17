from sqlalchemy import BigInteger, Boolean, Column, ForeignKey, Integer, String, TIMESTAMP

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(BigInteger, primary_key=True, autoincrement=True)
    box_id = Column(
        Integer,
        ForeignKey("box_details.box_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    severity = Column(String(20), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(String(500), nullable=False)
    notification_type = Column(String(50), nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP, nullable=False, index=True)
