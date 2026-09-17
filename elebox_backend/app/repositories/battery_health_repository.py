from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.battery_config import resolve_battery_status
from app.models.box_details import BoxDetail
from app.models.locations import Location
from app.models.telemetry_history import TelemetryHistory
from app.models.telemetry_snapshot import TelemetrySnapshot
from app.models.work_areas import WorkArea
from app.utils.datetime_utils import format_iso_utc, utc_now_naive


@dataclass
class BatteryDeviceFilters:
    box_id: int | None = None
    location_id: int | None = None
    work_area_id: int | None = None
    battery_status: str | None = None


class BatteryHealthRepository:

    @staticmethod
    def _base_query(db: Session):
        return (
            db.query(BoxDetail, TelemetrySnapshot, Location, WorkArea)
            .outerjoin(TelemetrySnapshot, TelemetrySnapshot.box_id == BoxDetail.box_id)
            .outerjoin(Location, Location.location_id == BoxDetail.location_id)
            .outerjoin(WorkArea, WorkArea.work_area_id == BoxDetail.work_area_id)
        )

    @staticmethod
    def _build_device_row(box, snapshot, location, work_area) -> dict:
        battery_percent = snapshot.battery_percent if snapshot else None
        battery_voltage = (
            float(snapshot.battery_voltage) if snapshot and snapshot.battery_voltage is not None else None
        )
        last_updated = snapshot.recorded_at if snapshot else None
        last_seen = box.last_seen or last_updated
        return {
            "box_id": box.box_id,
            "serial_no": box.serial_no,
            "location_id": box.location_id,
            "location_name": location.location_name if location else None,
            "work_area_id": box.work_area_id,
            "work_area_name": work_area.work_area_name if work_area else None,
            "battery_percent": battery_percent,
            "battery_voltage": battery_voltage,
            "battery_status": resolve_battery_status(battery_percent),
            "last_seen": format_iso_utc(last_seen),
            "last_updated": format_iso_utc(last_updated),
        }

    @staticmethod
    def _apply_filters(query, filters: BatteryDeviceFilters):
        if filters.box_id is not None:
            query = query.filter(BoxDetail.box_id == filters.box_id)
        if filters.location_id is not None:
            query = query.filter(BoxDetail.location_id == filters.location_id)
        if filters.work_area_id is not None:
            query = query.filter(BoxDetail.work_area_id == filters.work_area_id)
        return query

    @staticmethod
    def _matches_status(row: dict, status_filter: str | None) -> bool:
        if not status_filter or status_filter.lower() == "all":
            return True
        return row["battery_status"].lower() == status_filter.lower()

    @staticmethod
    def list_devices(
        db: Session,
        *,
        filters: BatteryDeviceFilters,
        offset: int = 0,
        limit: int = 50,
    ):
        query = BatteryHealthRepository._apply_filters(
            BatteryHealthRepository._base_query(db),
            filters,
        )
        rows = query.order_by(BoxDetail.box_id).all()
        devices = [
            BatteryHealthRepository._build_device_row(box, snapshot, location, work_area)
            for box, snapshot, location, work_area in rows
        ]
        if filters.battery_status:
            devices = [
                device
                for device in devices
                if BatteryHealthRepository._matches_status(device, filters.battery_status)
            ]
        total = len(devices)
        return devices[offset : offset + limit], total

    @staticmethod
    def get_all_devices(db: Session, *, filters: BatteryDeviceFilters | None = None):
        filters = filters or BatteryDeviceFilters()
        query = BatteryHealthRepository._apply_filters(
            BatteryHealthRepository._base_query(db),
            filters,
        )
        rows = query.order_by(BoxDetail.box_id).all()
        devices = [
            BatteryHealthRepository._build_device_row(box, snapshot, location, work_area)
            for box, snapshot, location, work_area in rows
        ]
        if filters.battery_status:
            devices = [
                device
                for device in devices
                if BatteryHealthRepository._matches_status(device, filters.battery_status)
            ]
        return devices

    @staticmethod
    def get_device(db: Session, box_id: int):
        row = (
            BatteryHealthRepository._base_query(db)
            .filter(BoxDetail.box_id == box_id)
            .first()
        )
        if row is None:
            return None
        box, snapshot, location, work_area = row
        return BatteryHealthRepository._build_device_row(box, snapshot, location, work_area)

    @staticmethod
    def get_summary(db: Session, *, filters: BatteryDeviceFilters | None = None):
        devices = BatteryHealthRepository.get_all_devices(db, filters=filters)
        total = len(devices)
        healthy = sum(1 for d in devices if d["battery_status"] == "Healthy")
        warning = sum(1 for d in devices if d["battery_status"] == "Warning")
        critical = sum(1 for d in devices if d["battery_status"] == "Critical")
        unknown = sum(1 for d in devices if d["battery_status"] == "Unknown")
        percents = [d["battery_percent"] for d in devices if d["battery_percent"] is not None]
        average = round(sum(percents) / len(percents), 1) if percents else 0.0
        return {
            "total_devices": total,
            "healthy_count": healthy,
            "warning_count": warning,
            "critical_count": critical,
            "unknown_count": unknown,
            "average_battery_percent": average,
        }

    @staticmethod
    def get_battery_history(
        db: Session,
        box_id: int,
        *,
        hours: int = 24,
        limit: int = 200,
    ):
        since = utc_now_naive() - timedelta(hours=hours)
        rows = (
            db.query(TelemetryHistory)
            .filter(TelemetryHistory.box_id == box_id)
            .filter(TelemetryHistory.recorded_at >= since)
            .order_by(TelemetryHistory.recorded_at.asc())
            .limit(limit)
            .all()
        )
        return [
            {
                "recorded_at": format_iso_utc(row.recorded_at),
                "battery_percent": row.battery_percent,
                "battery_voltage": float(row.battery_voltage),
            }
            for row in rows
        ]

    @staticmethod
    def get_lowest_devices(db: Session, *, limit: int = 10, filters: BatteryDeviceFilters | None = None):
        devices = BatteryHealthRepository.get_all_devices(db, filters=filters)
        ranked = sorted(
            [d for d in devices if d["battery_percent"] is not None],
            key=lambda item: item["battery_percent"],
        )
        return ranked[:limit]
