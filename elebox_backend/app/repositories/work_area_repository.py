from sqlalchemy.orm import Session

from app.models.locations import Location
from app.models.users import User
from app.models.work_areas import WorkArea


class WorkAreaRepository:

    @staticmethod
    def get_all(db: Session):
        return (
            db.query(WorkArea)
            .order_by(WorkArea.work_area_id)
            .all()
        )

    @staticmethod
    def get_by_id(db: Session, work_area_id: int):
        return (
            db.query(WorkArea)
            .filter(WorkArea.work_area_id == work_area_id)
            .first()
        )

    @staticmethod
    def get_location_by_id(db: Session, location_id: int):
        return (
            db.query(Location)
            .filter(Location.location_id == location_id)
            .first()
        )

    @staticmethod
    def get_location_name(db: Session, location_id: int | None):
        if location_id is None:
            return None

        location = WorkAreaRepository.get_location_by_id(db, location_id)
        return location.location_name if location else None

    @staticmethod
    def create(db: Session, work_area: WorkArea):
        db.add(work_area)
        db.commit()
        db.refresh(work_area)
        return work_area

    @staticmethod
    def update(db: Session, work_area: WorkArea):
        db.commit()
        db.refresh(work_area)
        return work_area

    @staticmethod
    def delete(db: Session, work_area: WorkArea):
        db.delete(work_area)
        db.commit()

    @staticmethod
    def count_users_in_work_area(db: Session, work_area_id: int) -> int:
        return (
            db.query(User)
            .filter(User.work_area_id == work_area_id)
            .count()
        )
