from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time

from sqlalchemy import func
from sqlalchemy.orm import Query, Session

from app.core.battery_config import BATTERY_NOTIFICATION_TYPES
from app.models.box_assignments import BoxAssignment
from app.models.box_details import BoxDetail
from app.models.locations import Location
from app.models.notification import Notification
from app.models.users import User
from app.models.work_areas import WorkArea
from app.utils.datetime_utils import utc_now_naive


@dataclass
class NotificationFilters:
    search: str | None = None
    severity: str | None = None
    notification_type: str | None = None
    is_read: bool | None = None
    box_id: int | None = None
    serial_no: str | None = None
    location_id: int | None = None
    user_id: int | None = None
    employee_id: str | None = None
    employee_name: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class NotificationRepository:

    @staticmethod
    def create(
        db: Session,
        *,
        box_id: int | None,
        severity: str,
        title: str,
        message: str,
        notification_type: str,
        user_id: int | None = None,
        created_at: datetime | None = None,
    ) -> Notification:
        row = Notification(
            box_id=box_id,
            user_id=user_id,
            severity=severity,
            title=title,
            message=message,
            notification_type=notification_type,
            is_read=False,
            created_at=created_at or utc_now_naive(),
        )
        db.add(row)
        db.flush()
        return row

    @staticmethod
    def get_by_id(db: Session, notification_id: int):
        return (
            db.query(Notification)
            .filter(Notification.notification_id == notification_id)
            .first()
        )

    @staticmethod
    def _resolved_user_id():
        return func.coalesce(Notification.user_id, BoxAssignment.user_id)

    @staticmethod
    def _base_query(db: Session) -> Query:
        return (
            db.query(Notification, BoxDetail, Location, User, WorkArea)
            .outerjoin(BoxDetail, BoxDetail.box_id == Notification.box_id)
            .outerjoin(Location, Location.location_id == BoxDetail.location_id)
            .outerjoin(BoxAssignment, BoxAssignment.box_id == BoxDetail.box_id)
            .outerjoin(
                User,
                User.user_id == NotificationRepository._resolved_user_id(),
            )
            .outerjoin(WorkArea, WorkArea.work_area_id == BoxDetail.work_area_id)
        )

    @staticmethod
    def _apply_filters(query: Query, filters: NotificationFilters) -> Query:
        query = query.filter(
            ~Notification.notification_type.in_(tuple(BATTERY_NOTIFICATION_TYPES))
        )
        if filters.severity:
            query = query.filter(
                Notification.severity == filters.severity.strip().upper()
            )
        if filters.notification_type:
            query = query.filter(
                Notification.notification_type
                == filters.notification_type.strip().upper()
            )
        if filters.is_read is not None:
            query = query.filter(Notification.is_read == filters.is_read)
        if filters.box_id is not None:
            query = query.filter(Notification.box_id == filters.box_id)
        if filters.serial_no:
            term = filters.serial_no.strip()
            query = query.filter(BoxDetail.serial_no == term)
        if filters.location_id is not None:
            query = query.filter(Location.location_id == filters.location_id)
        if filters.user_id is not None:
            query = query.filter(
                NotificationRepository._resolved_user_id() == filters.user_id
            )
        if filters.employee_id:
            query = query.filter(
                User.employee_id == filters.employee_id.strip()
            )
        if filters.employee_name:
            term = f"%{filters.employee_name.strip()}%"
            query = query.filter(User.employee_name.like(term))
        if filters.start_date is not None:
            start_at = datetime.combine(filters.start_date, time.min)
            query = query.filter(Notification.created_at >= start_at)
        if filters.end_date is not None:
            end_at = datetime.combine(filters.end_date, time.max)
            query = query.filter(Notification.created_at <= end_at)
        if filters.search:
            term = f"%{filters.search.strip()}%"
            query = query.filter(
                (Notification.title.like(term))
                | (Notification.message.like(term))
                | (BoxDetail.serial_no.like(term))
                | (Location.location_name.like(term))
                | (User.employee_name.like(term))
                | (User.employee_id.like(term))
            )
        return query

    @staticmethod
    def list_notifications(
        db: Session,
        *,
        filters: NotificationFilters,
        offset: int = 0,
        limit: int = 20,
    ):
        query = NotificationRepository._apply_filters(
            NotificationRepository._base_query(db),
            filters,
        )
        total = query.count()
        rows = (
            query.order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return rows, total

    @staticmethod
    def list_all_for_export(
        db: Session,
        *,
        filters: NotificationFilters,
        limit: int = 10000,
    ):
        query = NotificationRepository._apply_filters(
            NotificationRepository._base_query(db),
            filters,
        )
        return (
            query.order_by(Notification.created_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def mark_read(db: Session, notification: Notification):
        notification.is_read = True
        db.add(notification)

    @staticmethod
    def mark_all_read(db: Session, filters: NotificationFilters | None = None):
        if filters is None:
            db.query(Notification).filter(Notification.is_read.is_(False)).update(
                {"is_read": True},
                synchronize_session=False,
            )
            return

        notification_ids = [
            row[0].notification_id
            for row in NotificationRepository._apply_filters(
                NotificationRepository._base_query(db).filter(
                    Notification.is_read.is_(False)
                ),
                filters,
            ).all()
        ]
        if notification_ids:
            db.query(Notification).filter(
                Notification.notification_id.in_(notification_ids)
            ).update({"is_read": True}, synchronize_session=False)

    @staticmethod
    def unread_count(db: Session) -> int:
        return (
            db.query(func.count(Notification.notification_id))
            .filter(Notification.is_read.is_(False))
            .filter(~Notification.notification_type.in_(tuple(BATTERY_NOTIFICATION_TYPES)))
            .scalar()
            or 0
        )
