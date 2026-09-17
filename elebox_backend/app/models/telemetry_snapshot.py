from sqlalchemy import Column, DECIMAL, ForeignKey, Integer, TIMESTAMP

from app.core.database import Base


class TelemetrySnapshot(Base):
    __tablename__ = "telemetry_snapshots"

    box_id = Column(
        Integer,
        ForeignKey("box_details.box_id", ondelete="CASCADE"),
        primary_key=True,
    )
    hook_a = Column(Integer, nullable=False)
    hook_b = Column(Integer, nullable=False)
    battery_percent = Column(Integer, nullable=False)
    battery_voltage = Column(DECIMAL(5, 2), nullable=False)
    buckle1 = Column(Integer, nullable=False)
    buckle2 = Column(Integer, nullable=False)
    buckle3 = Column(Integer, nullable=False)
    alarm_active = Column(Integer, nullable=False)
    recorded_at = Column(TIMESTAMP, nullable=False)
