from sqlalchemy.orm import Session

from app.models.job_tittle import JobTitle
from app.models.locations import Location
from app.models.users import User
from app.models.work_areas import WorkArea


class UserRepository:

    @staticmethod
    def get_all_users(db: Session):
        return db.query(User).order_by(User.user_id).all()

    @staticmethod
    def update_user(db: Session, user: User):
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete_user(db: Session, user: User):
        db.delete(user)
        db.commit()

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
    def get_job_title_name(db: Session, job_title_id: int | None):
        if job_title_id is None:
            return None

        job_title = (
            db.query(JobTitle)
            .filter(JobTitle.job_title_id == job_title_id)
            .first()
        )
        return job_title.job_title_name if job_title else None
