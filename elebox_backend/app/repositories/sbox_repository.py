from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.activity_status import ActivityStatus
from app.models.box_assignments import BoxAssignment
from app.models.box_details import BoxDetail
from app.models.box_health import BoxHealth
from app.models.box_log import BoxLog
from app.models.locations import Location
from app.models.work_areas import WorkArea


class SboxRepository:

    @staticmethod
    def get_all(db: Session, user_id: int | None = None, assigned_only: bool = False):
        query = db.query(BoxDetail)

        if assigned_only and user_id is not None:
            query = (
                query.join(
                    BoxAssignment,
                    BoxAssignment.box_id == BoxDetail.box_id,
                )
                .filter(BoxAssignment.user_id == user_id)
            )

        return query.order_by(BoxDetail.box_id).all()

    @staticmethod
    def get_by_id(db: Session, box_id: int):
        return (
            db.query(BoxDetail)
            .filter(BoxDetail.box_id == box_id)
            .first()
        )

    @staticmethod
    def get_by_serial(db: Session, serial_no: str):
        return (
            db.query(BoxDetail)
            .filter(BoxDetail.serial_no == serial_no)
            .first()
        )

    @staticmethod
    def get_by_device_id(db: Session, device_id: str):
        return (
            db.query(BoxDetail)
            .filter(BoxDetail.box_ip == device_id)
            .first()
        )

    @staticmethod
    def count(db: Session) -> int:
        return db.query(BoxDetail).count()

    @staticmethod
    def get_location_name(db: Session, location_id: int | None):
        if location_id is None:
            return None

        location = (
            db.query(Location)
            .filter(Location.location_id == location_id)
            .first()
        )
        return location.location_name if location else None

    @staticmethod
    def get_work_area_name(db: Session, work_area_id: int | None):
        if work_area_id is None:
            return None

        work_area = (
            db.query(WorkArea)
            .filter(WorkArea.work_area_id == work_area_id)
            .first()
        )
        return work_area.work_area_name if work_area else None

    @staticmethod
    def get_location_by_id(db: Session, location_id: int):
        return (
            db.query(Location)
            .filter(Location.location_id == location_id)
            .first()
        )

    @staticmethod
    def get_work_area_by_id(db: Session, work_area_id: int):
        return (
            db.query(WorkArea)
            .filter(WorkArea.work_area_id == work_area_id)
            .first()
        )

    @staticmethod
    def get_activity_status_id(db: Session, status_name: str) -> int | None:
        row = (
            db.query(ActivityStatus)
            .filter(ActivityStatus.activity_status_name == status_name)
            .first()
        )
        return row.activity_status_id if row else None

    @staticmethod
    def get_health_status_id(db: Session, status_name: str) -> int | None:
        row = (
            db.query(BoxHealth)
            .filter(BoxHealth.health_status_name == status_name)
            .first()
        )
        return row.health_status_id if row else None

    @staticmethod
    def get_health_status_name(db: Session, health_status_id: int | None) -> str | None:
        if health_status_id is None:
            return None

        row = (
            db.query(BoxHealth)
            .filter(BoxHealth.health_status_id == health_status_id)
            .first()
        )
        return row.health_status_name if row else None

    @staticmethod
    def get_activity_status_name(db: Session, activity_status_id: int | None) -> str | None:
        if activity_status_id is None:
            return None

        row = (
            db.query(ActivityStatus)
            .filter(ActivityStatus.activity_status_id == activity_status_id)
            .first()
        )
        return row.activity_status_name if row else None

    @staticmethod
    def create(db: Session, box: BoxDetail):
        db.add(box)
        db.commit()
        db.refresh(box)
        return box

    @staticmethod
    def update(db: Session, box: BoxDetail):
        db.commit()
        db.refresh(box)
        return box

    @staticmethod
    def delete_related_records(db: Session, box_id: int):
        db.query(BoxLog).filter(BoxLog.box_id == box_id).delete(
            synchronize_session=False,
        )
        db.query(BoxAssignment).filter(BoxAssignment.box_id == box_id).delete(
            synchronize_session=False,
        )
        db.execute(
            text("DELETE FROM violation_details WHERE box_id = :box_id"),
            {"box_id": box_id},
        )
        db.execute(
            text("DELETE FROM violation_logs WHERE box_id = :box_id"),
            {"box_id": box_id},
        )

    @staticmethod
    def delete(db: Session, box: BoxDetail):
        SboxRepository.delete_related_records(db, box.box_id)
        db.delete(box)
        db.commit()
