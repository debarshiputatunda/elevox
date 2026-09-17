from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rbac import Permission
from app.middlewares.auth_middleware import require_permission
from app.schemas.telemetry_schema import (
    DeviceHealthSummary,
    MonitoringDashboardSummary,
    TelemetryHistoryPoint,
    TelemetrySnapshotResponse,
    TelemetryStatisticsResponse,
)
from app.services.monitoring_service import MonitoringService
from app.utils.datetime_utils import utc_now_naive

router = APIRouter(
    prefix="/monitoring",
    tags=["Monitoring"],
)


@router.get("/telemetry/runtime-health")
def get_runtime_health(
    _current_user=Depends(require_permission(Permission.MONITORING)),
):
    from app.telemetry.orchestrator import telemetry_orchestrator

    return {
        "last_poll_at": telemetry_orchestrator.last_poll_at,
        "last_event_at": telemetry_orchestrator.last_event_at,
        "active_pollers": len(telemetry_orchestrator._pollers),
        "devices": telemetry_orchestrator.get_all_health(),
    }


@router.get(
    "/telemetry",
    response_model=List[TelemetrySnapshotResponse],
)
def list_latest_telemetry(
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.MONITORING)),
):
    return MonitoringService.list_latest_telemetry(db)


@router.get(
    "/telemetry/{box_id}",
    response_model=TelemetrySnapshotResponse,
)
def get_latest_telemetry(
    box_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.MONITORING)),
):
    return MonitoringService.get_latest_telemetry(db, box_id)


@router.get(
    "/telemetry/{box_id}/history",
    response_model=List[TelemetryHistoryPoint],
)
def get_telemetry_history(
    box_id: int,
    start_at: datetime | None = Query(default=None),
    end_at: datetime | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=2000),
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.MONITORING)),
):
    end = end_at or utc_now_naive()
    start = start_at or (end - timedelta(hours=1))
    return MonitoringService.get_history(db, box_id, start, end, limit)


@router.get(
    "/telemetry/{box_id}/statistics",
    response_model=TelemetryStatisticsResponse,
)
def get_telemetry_statistics(
    box_id: int,
    start_at: datetime | None = Query(default=None),
    end_at: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.MONITORING)),
):
    end = end_at or utc_now_naive()
    start = start_at or (end - timedelta(hours=24))
    return MonitoringService.get_statistics(db, box_id, start, end)


@router.get(
    "/health",
    response_model=List[DeviceHealthSummary],
)
def get_device_health(
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.MONITORING)),
):
    return MonitoringService.get_device_health_summary(db)


@router.get(
    "/dashboard",
    response_model=MonitoringDashboardSummary,
)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.MONITORING)),
):
    return MonitoringService.get_dashboard_summary(db)
