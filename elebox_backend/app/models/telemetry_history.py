from sqlalchemy import Column, DECIMAL, ForeignKey, Integer, TIMESTAMP, BigInteger

from app.core.database import Base


class TelemetryHistory(Base):
    __tablename__ = "telemetry_history"

    history_id = Column(BigInteger, primary_key=True, autoincrement=True)
    box_id = Column(
        Integer,
        ForeignKey("box_details.box_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    hook_a = Column(Integer, nullable=False)
    hook_b = Column(Integer, nullable=False)
    battery_percent = Column(Integer, nullable=False)
    battery_voltage = Column(DECIMAL(5, 2), nullable=False)
    buckle1 = Column(Integer, nullable=False)
    buckle2 = Column(Integer, nullable=False)
    buckle3 = Column(Integer, nullable=False)
    alarm_active = Column(Integer, nullable=False)
    recorded_at = Column(TIMESTAMP, nullable=False, index=True)
