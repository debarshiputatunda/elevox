from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rbac import Permission
from app.middlewares.auth_middleware import require_permission
from app.schemas.notification_schema import (
    NotificationFilterParams,
    NotificationListResponse,
    NotificationMarkReadResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


def _parse_filter_params(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    notification_type: str | None = Query(default=None),
    is_read: bool | None = Query(default=None),
    sbox_id: int | None = Query(default=None),
    serial_no: str | None = Query(default=None),
    box_id: int | None = Query(default=None),
    location_id: int | None = Query(default=None),
    user_id: int | None = Query(default=None),
    employee_id: str | None = Query(default=None),
    employee_name: str | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
) -> NotificationFilterParams:
    return NotificationFilterParams(
        page=page,
        page_size=page_size,
        search=search,
        severity=severity,
        notification_type=notification_type,
        is_read=is_read,
        sbox_id=sbox_id or box_id,
        serial_no=serial_no,
        location_id=location_id,
        user_id=user_id,
        employee_id=employee_id,
        employee_name=employee_name,
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "",
    response_model=NotificationListResponse,
)
def list_notifications(
    params: NotificationFilterParams = Depends(_parse_filter_params),
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.NOTIFICATIONS)),
):
    return NotificationService.list_notifications(db, params)


@router.get("/export")
def export_notifications(
    params: NotificationFilterParams = Depends(_parse_filter_params),
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.NOTIFICATIONS)),
):
    csv_content = NotificationService.export_csv(db, params)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="notifications_export.csv"',
        },
    )


@router.patch(
    "/read-all",
    response_model=NotificationMarkReadResponse,
)
def mark_all_notifications_read(
    params: NotificationFilterParams = Depends(_parse_filter_params),
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.NOTIFICATIONS)),
):
    return NotificationService.mark_all_read(db, params)


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationMarkReadResponse,
)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.NOTIFICATIONS)),
):
    return NotificationService.mark_read(db, notification_id)
