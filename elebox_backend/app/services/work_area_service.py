from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.work_areas import WorkArea
from app.repositories.work_area_repository import WorkAreaRepository


class WorkAreaService:

    @staticmethod
    def _build_response(db: Session, work_area: WorkArea):
        return {
            "work_area_id": work_area.work_area_id,
            "work_area_name": work_area.work_area_name,
            "location_id": work_area.location_id,
            "location_name": WorkAreaRepository.get_location_name(
                db,
                work_area.location_id,
            ),
        }

    @staticmethod
    def _validate_location(db: Session, location_id: int):
        if WorkAreaRepository.get_location_by_id(db, location_id) is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Location does not exist",
            )

    @staticmethod
    def list_work_areas(db: Session):
        work_areas = WorkAreaRepository.get_all(db)
        return [
            WorkAreaService._build_response(db, work_area)
            for work_area in work_areas
        ]

    @staticmethod
    def get_work_area(db: Session, work_area_id: int):
        work_area = WorkAreaRepository.get_by_id(db, work_area_id)
        if work_area is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work area not found",
            )

        return WorkAreaService._build_response(db, work_area)

    @staticmethod
    def create_work_area(db: Session, request):
        WorkAreaService._validate_location(db, request.location_id)

        work_area = WorkArea(
            work_area_name=request.work_area_name.strip(),
            location_id=request.location_id,
        )
        work_area = WorkAreaRepository.create(db, work_area)
        return WorkAreaService._build_response(db, work_area)

    @staticmethod
    def update_work_area(db: Session, work_area_id: int, request):
        work_area = WorkAreaRepository.get_by_id(db, work_area_id)
        if work_area is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work area not found",
            )

        WorkAreaService._validate_location(db, request.location_id)

        work_area.work_area_name = request.work_area_name.strip()
        work_area.location_id = request.location_id
        work_area = WorkAreaRepository.update(db, work_area)
        return WorkAreaService._build_response(db, work_area)

    @staticmethod
    def delete_work_area(db: Session, work_area_id: int):
        work_area = WorkAreaRepository.get_by_id(db, work_area_id)
        if work_area is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work area not found",
            )

        if WorkAreaRepository.count_users_in_work_area(db, work_area_id) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Work area cannot be deleted because users are assigned to it",
            )

        try:
            WorkAreaRepository.delete(db, work_area)
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Work area cannot be deleted because related records exist"
                ),
            )

        return {"message": "Work area deleted successfully"}
