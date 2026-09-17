from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.box_details import BoxDetail
from app.models.telemetry_history import TelemetryHistory
from app.models.telemetry_snapshot import TelemetrySnapshot
from app.utils.telemetry_parser import TelemetryReading


class TelemetryRepository:

    @staticmethod
    def get_active_boxes(db: Session):
        from app.core.telemetry_config import ACTIVE_ACTIVITY_STATUS_ID

        return (
            db.query(BoxDetail)
            .filter(BoxDetail.activity_status == ACTIVE_ACTIVITY_STATUS_ID)
            .filter(BoxDetail.box_ip.isnot(None))
            .filter(BoxDetail.box_ip != "")
            .all()
        )

    @staticmethod
    def get_snapshot(db: Session, box_id: int):
        return (
            db.query(TelemetrySnapshot)
            .filter(TelemetrySnapshot.box_id == box_id)
            .first()
        )

    @staticmethod
    def get_all_snapshots(db: Session):
        return db.query(TelemetrySnapshot).all()

    @staticmethod
    def upsert_snapshot(
        db: Session,
        box_id: int,
        reading: TelemetryReading,
        recorded_at: datetime,
    ):
        snapshot = TelemetryRepository.get_snapshot(db, box_id)
        if snapshot is None:
            snapshot = TelemetrySnapshot(box_id=box_id)
            db.add(snapshot)

        snapshot.hook_a = reading.hook_a
        snapshot.hook_b = reading.hook_b
        snapshot.battery_percent = reading.battery_percent
        snapshot.battery_voltage = reading.battery_voltage
        snapshot.buckle1 = reading.buckle1
        snapshot.buckle2 = reading.buckle2
        snapshot.buckle3 = reading.buckle3
        snapshot.alarm_active = reading.alarm_active
        snapshot.recorded_at = recorded_at
        return snapshot

    @staticmethod
    def insert_history(
        db: Session,
        box_id: int,
        reading: TelemetryReading,
        recorded_at: datetime,
    ):
        row = TelemetryHistory(
            box_id=box_id,
            hook_a=reading.hook_a,
            hook_b=reading.hook_b,
            battery_percent=reading.battery_percent,
            battery_voltage=reading.battery_voltage,
            buckle1=reading.buckle1,
            buckle2=reading.buckle2,
            buckle3=reading.buckle3,
            alarm_active=reading.alarm_active,
            recorded_at=recorded_at,
        )
        db.add(row)
        return row

    @staticmethod
    def get_history(
        db: Session,
        box_id: int,
        start_at: datetime | None = None,
        end_at: datetime | None = None,
        limit: int = 500,
    ):
        query = db.query(TelemetryHistory).filter(TelemetryHistory.box_id == box_id)
        if start_at is not None:
            query = query.filter(TelemetryHistory.recorded_at >= start_at)
        if end_at is not None:
            query = query.filter(TelemetryHistory.recorded_at <= end_at)
        return (
            query.order_by(TelemetryHistory.recorded_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_statistics(db: Session, box_id: int, start_at: datetime, end_at: datetime):
        row = (
            db.query(
                func.avg(TelemetryHistory.hook_a).label("avg_hook_a"),
                func.max(TelemetryHistory.hook_a).label("max_hook_a"),
                func.min(TelemetryHistory.hook_a).label("min_hook_a"),
                func.avg(TelemetryHistory.hook_b).label("avg_hook_b"),
                func.max(TelemetryHistory.hook_b).label("max_hook_b"),
                func.min(TelemetryHistory.hook_b).label("min_hook_b"),
                func.avg(TelemetryHistory.battery_percent).label("avg_battery_percent"),
                func.min(TelemetryHistory.battery_percent).label("min_battery_percent"),
                func.count(TelemetryHistory.history_id).label("sample_count"),
            )
            .filter(TelemetryHistory.box_id == box_id)
            .filter(TelemetryHistory.recorded_at >= start_at)
            .filter(TelemetryHistory.recorded_at <= end_at)
            .first()
        )
        return row

    @staticmethod
    def update_last_seen(db: Session, box: BoxDetail, recorded_at: datetime):
        box.last_seen = recorded_at
        db.add(box)
