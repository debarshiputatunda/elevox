from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.constants import NotificationSeverity
from app.core.telemetry_config import TELEMETRY_OFFLINE_THRESHOLD_S
from app.models.box_details import BoxDetail
from app.repositories.notification_repository import NotificationRepository
from app.repositories.sbox_repository import SboxRepository
from app.repositories.telemetry_repository import TelemetryRepository
from app.telemetry.orchestrator import telemetry_orchestrator
from app.utils.datetime_utils import format_iso_utc, utc_now_naive
from app.utils.telemetry_parser import raw_hook_to_percent


class MonitoringService:

    @staticmethod
    def _controller_name(box: BoxDetail) -> str:
        return box.serial_no or box.box_details or f"Box-{box.box_id}"

    @staticmethod
    def _is_online(box: BoxDetail, now: datetime | None = None) -> bool:
        if box.last_seen is None:
            return False
        current = now or utc_now_naive()
        last_seen = box.last_seen
        if last_seen.tzinfo is not None:
            last_seen = last_seen.replace(tzinfo=None)
        return (current - last_seen).total_seconds() <= TELEMETRY_OFFLINE_THRESHOLD_S

    @staticmethod
    def _format_ts(value: datetime | None) -> str | None:
        return format_iso_utc(value)

    @staticmethod
    def _build_telemetry_response(db: Session, box: BoxDetail, snapshot):
        is_online = MonitoringService._is_online(box)
        recorded_at = MonitoringService._format_ts(
            snapshot.recorded_at if snapshot else box.last_seen,
        )
        return {
            "box_id": box.box_id,
            "device_id": box.box_id,
            "controller_name": MonitoringService._controller_name(box),
            "serial_no": box.serial_no,
            "ip_address": box.box_ip,
            "hook_a": snapshot.hook_a if snapshot else 0,
            "hook_b": snapshot.hook_b if snapshot else 0,
            "hook_a_percent": raw_hook_to_percent(snapshot.hook_a) if snapshot else 0.0,
            "hook_b_percent": raw_hook_to_percent(snapshot.hook_b) if snapshot else 0.0,
            "battery_percent": snapshot.battery_percent if snapshot else 0,
            "battery_voltage": float(snapshot.battery_voltage) if snapshot else 0.0,
            "buckle1": snapshot.buckle1 if snapshot else 0,
            "buckle2": snapshot.buckle2 if snapshot else 0,
            "buckle3": snapshot.buckle3 if snapshot else 0,
            "alarm_active": bool(snapshot.alarm_active) if snapshot else False,
            "connectivity": "online" if is_online else "offline",
            "is_online": is_online,
            "hook_a_threshold": box.hookA_threshold,
            "hook_b_threshold": box.hookB_threshold,
            "location_name": SboxRepository.get_location_name(db, box.location_id),
            "work_area_name": SboxRepository.get_work_area_name(db, box.work_area_id),
            "recorded_at": recorded_at or format_iso_utc(utc_now_naive()),
        }

    @staticmethod
    def list_latest_telemetry(db: Session):
        boxes = db.query(BoxDetail).order_by(BoxDetail.box_id).all()
        snapshots = {
            item.box_id: item
            for item in TelemetryRepository.get_all_snapshots(db)
        }
        return [
            MonitoringService._build_telemetry_response(db, box, snapshots.get(box.box_id))
            for box in boxes
        ]

    @staticmethod
    def get_latest_telemetry(db: Session, box_id: int):
        box = SboxRepository.get_by_id(db, box_id)
        if box is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="S-Box not found")
        snapshot = TelemetryRepository.get_snapshot(db, box_id)
        return MonitoringService._build_telemetry_response(db, box, snapshot)

    @staticmethod
    def get_history(
        db: Session,
        box_id: int,
        start_at: datetime | None,
        end_at: datetime | None,
        limit: int,
    ):
        box = SboxRepository.get_by_id(db, box_id)
        if box is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="S-Box not found")

        rows = TelemetryRepository.get_history(
            db,
            box_id,
            start_at=start_at,
            end_at=end_at,
            limit=limit,
        )
        return [
            {
                "history_id": row.history_id,
                "box_id": row.box_id,
                "hook_a": row.hook_a,
                "hook_b": row.hook_b,
                "hook_a_percent": raw_hook_to_percent(row.hook_a),
                "hook_b_percent": raw_hook_to_percent(row.hook_b),
                "battery_percent": row.battery_percent,
                "battery_voltage": float(row.battery_voltage),
                "buckle1": row.buckle1,
                "buckle2": row.buckle2,
                "buckle3": row.buckle3,
                "alarm_active": bool(row.alarm_active),
                "recorded_at": MonitoringService._format_ts(row.recorded_at),
            }
            for row in rows
        ]

    @staticmethod
    def get_statistics(
        db: Session,
        box_id: int,
        start_at: datetime,
        end_at: datetime,
    ):
        box = SboxRepository.get_by_id(db, box_id)
        if box is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="S-Box not found")

        stats = TelemetryRepository.get_statistics(db, box_id, start_at, end_at)
        sample_count = int(stats.sample_count or 0) if stats else 0
        return {
            "box_id": box_id,
            "start_at": format_iso_utc(start_at),
            "end_at": format_iso_utc(end_at),
            "sample_count": sample_count,
            "avg_hook_a": float(stats.avg_hook_a) if stats and stats.avg_hook_a is not None else None,
            "max_hook_a": int(stats.max_hook_a) if stats and stats.max_hook_a is not None else None,
            "min_hook_a": int(stats.min_hook_a) if stats and stats.min_hook_a is not None else None,
            "avg_hook_b": float(stats.avg_hook_b) if stats and stats.avg_hook_b is not None else None,
            "max_hook_b": int(stats.max_hook_b) if stats and stats.max_hook_b is not None else None,
            "min_hook_b": int(stats.min_hook_b) if stats and stats.min_hook_b is not None else None,
            "avg_battery_percent": (
                float(stats.avg_battery_percent)
                if stats and stats.avg_battery_percent is not None
                else None
            ),
            "min_battery_percent": (
                int(stats.min_battery_percent)
                if stats and stats.min_battery_percent is not None
                else None
            ),
        }

    @staticmethod
    def get_device_health_summary(db: Session):
        boxes = db.query(BoxDetail).order_by(BoxDetail.box_id).all()
        snapshots = {
            item.box_id: item
            for item in TelemetryRepository.get_all_snapshots(db)
        }
        results = []
        for box in boxes:
            snapshot = snapshots.get(box.box_id)
            is_online = MonitoringService._is_online(box)
            results.append(
                {
                    "box_id": box.box_id,
                    "serial_no": box.serial_no,
                    "controller_name": MonitoringService._controller_name(box),
                    "ip_address": box.box_ip,
                    "is_online": is_online,
                    "connectivity": "online" if is_online else "offline",
                    "box_health_status": box.box_health_status,
                    "box_health_status_name": SboxRepository.get_health_status_name(
                        db,
                        box.box_health_status,
                    ),
                    "last_seen": MonitoringService._format_ts(box.last_seen),
                    "battery_percent": snapshot.battery_percent if snapshot else None,
                    "alarm_active": bool(snapshot.alarm_active) if snapshot else None,
                }
            )
        return results

    @staticmethod
    def get_dashboard_summary(db: Session):
        boxes = db.query(BoxDetail).all()
        online_count = sum(1 for box in boxes if MonitoringService._is_online(box))
        snapshots = TelemetryRepository.get_all_snapshots(db)
        active_alarms = sum(1 for item in snapshots if item.alarm_active == 1)
        unread = NotificationRepository.unread_count(db)
        from app.models.notification import Notification

        critical_count = (
            db.query(Notification)
            .filter(Notification.is_read.is_(False))
            .filter(Notification.severity == NotificationSeverity.CRITICAL)
            .count()
        )
        return {
            "total_devices": len(boxes),
            "online_devices": online_count,
            "offline_devices": max(len(boxes) - online_count, 0),
            "active_alarms": active_alarms,
            "critical_notifications": critical_count,
            "unread_notifications": unread,
            "last_poll_at": telemetry_orchestrator.last_poll_at,
        }
