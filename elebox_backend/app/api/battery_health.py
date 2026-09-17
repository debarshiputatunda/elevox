from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rbac import Permission
from app.middlewares.auth_middleware import require_permission
from app.schemas.battery_health_schema import (
    BatteryAnalyticsResponse,
    BatteryDeviceListResponse,
    BatteryHealthSummaryResponse,
)
from app.services.battery_health_service import BatteryHealthService

router = APIRouter(
    prefix="/battery-health",
    tags=["Battery Health"],
)


def _filter_params(
    box_id: int | None = Query(default=None),
    location_id: int | None = Query(default=None),
    work_area_id: int | None = Query(default=None),
    battery_status: str | None = Query(default=None),
):
    from app.schemas.battery_health_schema import BatteryDeviceFilters

    return BatteryDeviceFilters(
        box_id=box_id,
        location_id=location_id,
        work_area_id=work_area_id,
        battery_status=battery_status,
    )


@router.get("/summary", response_model=BatteryHealthSummaryResponse)
def get_battery_summary(
    filters=Depends(_filter_params),
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.BATTERY_HEALTH)),
):
    return BatteryHealthService.get_summary(db, filters)


@router.get("/devices", response_model=BatteryDeviceListResponse)
def list_battery_devices(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    filters=Depends(_filter_params),
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.BATTERY_HEALTH)),
):
    return BatteryHealthService.list_devices(
        db,
        params=filters,
        page=page,
        page_size=page_size,
    )


@router.get("/device/{box_id}")
def get_battery_device(
    box_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.BATTERY_HEALTH)),
):
    return BatteryHealthService.get_device(db, box_id)


@router.get("/analytics", response_model=BatteryAnalyticsResponse)
def get_battery_analytics(
    box_id: int | None = Query(default=None),
    filters=Depends(_filter_params),
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.BATTERY_HEALTH)),
):
    return BatteryHealthService.get_analytics(db, params=filters, box_id=box_id)
