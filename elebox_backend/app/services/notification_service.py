import csv
import io

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.notification_repository import (
    NotificationFilters,
    NotificationRepository,
)
from app.schemas.notification_schema import NotificationFilterParams
from app.utils.datetime_utils import format_iso_utc


class NotificationService:

    @staticmethod
    def _filters_from_params(params: NotificationFilterParams) -> NotificationFilters:
        return NotificationFilters(
            search=params.search,
            severity=params.severity,
            notification_type=params.notification_type,
            is_read=params.is_read,
            box_id=params.sbox_id,
            serial_no=params.serial_no,
            location_id=params.location_id,
            user_id=params.user_id,
            employee_id=params.employee_id,
            employee_name=params.employee_name,
            start_date=params.start_date,
            end_date=params.end_date,
        )

    @staticmethod
    def _build_response(notification, box, location, user, work_area) -> dict:
        return {
            "notification_id": notification.notification_id,
            "box_id": notification.box_id,
            "serial_no": box.serial_no if box is not None else None,
            "box_ip": box.box_ip if box is not None else None,
            "location_id": location.location_id if location is not None else None,
            "location_name": location.location_name if location is not None else None,
            "work_area_id": work_area.work_area_id if work_area is not None else None,
            "work_area_name": work_area.work_area_name if work_area is not None else None,
            "user_id": user.user_id if user is not None else None,
            "employee_id": user.employee_id if user is not None else None,
            "employee_name": user.employee_name if user is not None else None,
            "email": user.email_id if user is not None else None,
            "phone": user.phonenumber if user is not None else None,
            "severity": notification.severity,
            "title": notification.title,
            "message": notification.message,
            "notification_type": notification.notification_type,
            "is_read": bool(notification.is_read),
            "created_at": format_iso_utc(notification.created_at),
        }

    @staticmethod
    def list_notifications(db: Session, params: NotificationFilterParams):
        filters = NotificationService._filters_from_params(params)
        offset = max(params.page - 1, 0) * params.page_size
        rows, total = NotificationRepository.list_notifications(
            db,
            filters=filters,
            offset=offset,
            limit=params.page_size,
        )
        unread_count = NotificationRepository.unread_count(db)
        return {
            "data": [
                NotificationService._build_response(
                    notification, box, location, user, work_area
                )
                for notification, box, location, user, work_area in rows
            ],
            "total": total,
            "page": params.page,
            "page_size": params.page_size,
            "unread_count": unread_count,
        }

    @staticmethod
    def export_csv(db: Session, params: NotificationFilterParams) -> str:
        filters = NotificationService._filters_from_params(params)
        rows = NotificationRepository.list_all_for_export(db, filters=filters)
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow([
            "Timestamp",
            "Severity",
            "S-Box",
            "Employee ID",
            "Employee Name",
            "Location",
            "Title",
            "Message",
            "Status",
        ])
        for notification, box, location, user, _work_area in rows:
            writer.writerow([
                format_iso_utc(notification.created_at),
                notification.severity,
                box.serial_no if box is not None else "",
                user.employee_id if user is not None else "",
                user.employee_name if user is not None else "",
                location.location_name if location is not None else "",
                notification.title,
                notification.message,
                "Read" if notification.is_read else "Unread",
            ])
        return buffer.getvalue()

    @staticmethod
    def mark_read(db: Session, notification_id: int):
        notification = NotificationRepository.get_by_id(db, notification_id)
        if notification is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )
        NotificationRepository.mark_read(db, notification)
        db.commit()
        return {"message": "Notification marked as read", "updated_count": 1}

    @staticmethod
    def mark_all_read(
        db: Session,
        params: NotificationFilterParams | None = None,
    ):
        filters = (
            NotificationService._filters_from_params(params)
            if params is not None
            else None
        )
        NotificationRepository.mark_all_read(db, filters)
        db.commit()
        return {"message": "Notifications marked as read", "updated_count": None}
