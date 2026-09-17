from sqlalchemy import BigInteger, Boolean, Column, ForeignKey, Integer, String, TIMESTAMP

from app.core.database import Base


class AlarmLog(Base):
    __tablename__ = "alarm_logs"

    log_id = Column(BigInteger, primary_key=True, autoincrement=True)
    box_id = Column(
        Integer,
        ForeignKey("box_details.box_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    triggered_at = Column(TIMESTAMP, nullable=False, index=True)
    success = Column(Boolean, nullable=False, default=False)
    message = Column(String(500), nullable=True)
