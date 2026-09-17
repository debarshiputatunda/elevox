from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.battery_health_repository import (
    BatteryDeviceFilters,
    BatteryHealthRepository,
)
from app.schemas.battery_health_schema import BatteryDeviceFilters as BatteryDeviceFiltersParams


class BatteryHealthService:

    @staticmethod
    def _to_filters(params: BatteryDeviceFiltersParams | None) -> BatteryDeviceFilters:
        if params is None:
            return BatteryDeviceFilters()
        return BatteryDeviceFilters(
            box_id=params.box_id,
            location_id=params.location_id,
            work_area_id=params.work_area_id,
            battery_status=params.battery_status,
        )

    @staticmethod
    def get_summary(db: Session, params: BatteryDeviceFiltersParams | None = None):
        filters = BatteryHealthService._to_filters(params)
        return BatteryHealthRepository.get_summary(db, filters=filters)

    @staticmethod
    def list_devices(
        db: Session,
        *,
        params: BatteryDeviceFiltersParams,
        page: int,
        page_size: int,
    ):
        filters = BatteryHealthService._to_filters(params)
        offset = max(page - 1, 0) * page_size
        devices, total = BatteryHealthRepository.list_devices(
            db,
            filters=filters,
            offset=offset,
            limit=page_size,
        )
        return {
            "data": devices,
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    @staticmethod
    def get_device(db: Session, box_id: int):
        device = BatteryHealthRepository.get_device(db, box_id)
        if device is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="S-Box not found",
            )
        history = BatteryHealthRepository.get_battery_history(db, box_id)
        return {**device, "trend": history}

    @staticmethod
    def get_analytics(
        db: Session,
        *,
        params: BatteryDeviceFiltersParams | None = None,
        box_id: int | None = None,
    ):
        filters = BatteryHealthService._to_filters(params)
        summary = BatteryHealthRepository.get_summary(db, filters=filters)
        distribution = [
            {"status": "Healthy", "count": summary["healthy_count"]},
            {"status": "Warning", "count": summary["warning_count"]},
            {"status": "Critical", "count": summary["critical_count"]},
        ]
        if summary["unknown_count"]:
            distribution.append({"status": "Unknown", "count": summary["unknown_count"]})

        lowest = [
            {
                "box_id": item["box_id"],
                "serial_no": item["serial_no"],
                "battery_percent": item["battery_percent"],
            }
            for item in BatteryHealthRepository.get_lowest_devices(db, filters=filters)
        ]

        trend = []
        if box_id is not None:
            trend = BatteryHealthRepository.get_battery_history(db, box_id)

        return {
            "distribution": distribution,
            "lowest_devices": lowest,
            "trend": trend,
        }
