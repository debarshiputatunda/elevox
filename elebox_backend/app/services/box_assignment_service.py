from datetime import datetime

from app.utils.datetime_utils import format_iso_utc

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.repositories.auth_repository import AuthRepository
from app.repositories.box_assignment_repository import BoxAssignmentRepository
from app.repositories.box_log_repository import BoxLogRepository
from app.repositories.sbox_repository import SboxRepository
from app.repositories.work_area_repository import WorkAreaRepository


class BoxAssignmentService:

    @staticmethod
    def _format_timestamp(value: datetime | None) -> str | None:
        return format_iso_utc(value)

    @staticmethod
    def _build_assignment_response(db: Session, assignment):
        box = SboxRepository.get_by_id(db, assignment.box_id)
        user = AuthRepository.get_user_by_id(db, assignment.user_id)
        return {
            "user_id": assignment.user_id,
            "employee_name": user.employee_name if user else None,
            "box_id": assignment.box_id,
            "serial_no": box.serial_no if box else None,
            "work_area_id": assignment.work_area_id,
            "work_area_name": SboxRepository.get_work_area_name(
                db,
                assignment.work_area_id,
            ),
        }

    @staticmethod
    def _build_log_response(db: Session, log_row):
        box = SboxRepository.get_by_id(db, log_row.box_id)
        user = AuthRepository.get_user_by_id(db, log_row.user_id)
        return {
            "log_id": log_row.log_id,
            "user_id": log_row.user_id,
            "employee_name": user.employee_name if user else None,
            "box_id": log_row.box_id,
            "serial_no": box.serial_no if box else None,
            "work_area_id": log_row.work_area_id,
            "work_area_name": SboxRepository.get_work_area_name(
                db,
                log_row.work_area_id,
            ),
            "description": log_row.description,
            "created_at": BoxAssignmentService._format_timestamp(log_row.created_at),
        }

    @staticmethod
    def _build_deallocation_description(
        *,
        serial_no: str | None,
        box_id: int,
        assignee_name: str | None,
        actor_name: str | None,
    ) -> str:
        controller = serial_no or f"Box-{box_id}"
        assignee = assignee_name or "user"
        actor = actor_name or "system"
        return (
            f"S-Box {controller} deallocated from {assignee} by {actor}"
        )

    @staticmethod
    def _build_assignment_description(
        *,
        serial_no: str | None,
        box_id: int,
        assignee_name: str | None,
        work_area_name: str | None,
        actor_name: str | None,
    ) -> str:
        controller = serial_no or f"Box-{box_id}"
        assignee = assignee_name or "user"
        zone = work_area_name or "work area"
        actor = actor_name or "system"
        return (
            f"S-Box {controller} assigned to {assignee} "
            f"in {zone} by {actor}"
        )

    @staticmethod
    def assign_box(
        db: Session,
        *,
        box_id: int,
        user_id: int,
        work_area_id: int,
        actor_user_id: int,
    ):
        box = SboxRepository.get_by_id(db, box_id)
        if box is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="S-Box not found",
            )

        assignee = AuthRepository.get_user_by_id(db, user_id)
        if assignee is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        work_area = WorkAreaRepository.get_by_id(db, work_area_id)
        if work_area is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Work area does not exist",
            )

        if box.location_id is not None and work_area.location_id != box.location_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Work area does not belong to the S-Box location",
            )

        existing_for_box = BoxAssignmentRepository.get_by_box(db, box_id)
        existing_for_user = BoxAssignmentRepository.get_by_user(db, user_id)

        if existing_for_box is not None:
            if (
                existing_for_box.user_id == user_id
                and existing_for_box.work_area_id == work_area_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This employee is already assigned to this S-Box",
                )
            assigned_user = AuthRepository.get_user_by_id(
                db,
                existing_for_box.user_id,
            )
            assignee_label = (
                assigned_user.employee_name if assigned_user else "another employee"
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This S-Box is already assigned to {assignee_label}",
            )

        if existing_for_user is not None:
            assigned_box = SboxRepository.get_by_id(db, existing_for_user.box_id)
            box_label = (
                assigned_box.serial_no
                if assigned_box and assigned_box.serial_no
                else f"Box-{existing_for_user.box_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This employee is already assigned to {box_label}",
            )

        actor = AuthRepository.get_user_by_id(db, actor_user_id)
        work_area_name = work_area.work_area_name
        description = BoxAssignmentService._build_assignment_description(
            serial_no=box.serial_no,
            box_id=box_id,
            assignee_name=assignee.employee_name,
            work_area_name=work_area_name,
            actor_name=actor.employee_name if actor else None,
        )

        try:
            assignment = BoxAssignmentRepository.create(
                db,
                user_id=user_id,
                box_id=box_id,
                work_area_id=work_area_id,
            )
            BoxLogRepository.create(
                db,
                user_id=user_id,
                box_id=box_id,
                work_area_id=work_area_id,
                description=description,
            )
            db.commit()
            db.refresh(assignment)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Each employee and S-Box can only have one active assignment",
            )

        box.is_assigned = 1
        db.commit()

        return BoxAssignmentService._build_assignment_response(db, assignment)

    @staticmethod
    def deallocate_box(
        db: Session,
        *,
        box_id: int,
        actor_user_id: int,
    ):
        box = SboxRepository.get_by_id(db, box_id)
        if box is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="S-Box not found",
            )

        assignment = BoxAssignmentRepository.get_by_box(db, box_id)
        if assignment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active assignment for this S-Box",
            )

        assignee = AuthRepository.get_user_by_id(db, assignment.user_id)
        actor = AuthRepository.get_user_by_id(db, actor_user_id)
        description = BoxAssignmentService._build_deallocation_description(
            serial_no=box.serial_no,
            box_id=box_id,
            assignee_name=assignee.employee_name if assignee else None,
            actor_name=actor.employee_name if actor else None,
        )

        response = BoxAssignmentService._build_assignment_response(db, assignment)

        BoxAssignmentRepository.delete(db, assignment)
        BoxLogRepository.create(
            db,
            user_id=assignment.user_id,
            box_id=box_id,
            work_area_id=assignment.work_area_id,
            description=description,
        )
        box.is_assigned = 0
        db.commit()

        return response

    @staticmethod
    def list_all_assignments(db: Session):
        assignments = BoxAssignmentRepository.list_all(db)
        return [
            BoxAssignmentService._build_assignment_response(db, assignment)
            for assignment in assignments
        ]

    @staticmethod
    def list_assignments(db: Session, box_id: int):
        box = SboxRepository.get_by_id(db, box_id)
        if box is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="S-Box not found",
            )

        assignments = BoxAssignmentRepository.list_for_box(db, box_id)
        return [
            BoxAssignmentService._build_assignment_response(db, assignment)
            for assignment in assignments
        ]

    @staticmethod
    def list_logs(
        db: Session,
        box_id: int,
        *,
        page: int = 1,
        page_size: int = 50,
    ):
        box = SboxRepository.get_by_id(db, box_id)
        if box is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="S-Box not found",
            )

        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        offset = (page - 1) * page_size

        rows, total = BoxLogRepository.list_for_box(
            db,
            box_id,
            offset=offset,
            limit=page_size,
        )

        return {
            "data": [
                BoxAssignmentService._build_log_response(db, row)
                for row in rows
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
