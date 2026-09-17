from sqlalchemy.orm import Session

from app.models.box_assignments import BoxAssignment


class BoxAssignmentRepository:

    @staticmethod
    def get_by_box(db: Session, box_id: int):
        return (
            db.query(BoxAssignment)
            .filter(BoxAssignment.box_id == box_id)
            .first()
        )

    @staticmethod
    def get_by_user(db: Session, user_id: int):
        return (
            db.query(BoxAssignment)
            .filter(BoxAssignment.user_id == user_id)
            .first()
        )

    @staticmethod
    def list_all(db: Session):
        return (
            db.query(BoxAssignment)
            .order_by(BoxAssignment.box_id)
            .all()
        )

    @staticmethod
    def list_for_box(db: Session, box_id: int):
        assignment = BoxAssignmentRepository.get_by_box(db, box_id)
        return [assignment] if assignment else []

    @staticmethod
    def delete(db: Session, assignment: BoxAssignment):
        db.delete(assignment)
        db.flush()

    @staticmethod
    def create(
        db: Session,
        *,
        user_id: int,
        box_id: int,
        work_area_id: int,
    ) -> BoxAssignment:
        row = BoxAssignment(
            user_id=user_id,
            box_id=box_id,
            work_area_id=work_area_id,
        )
        db.add(row)
        db.flush()
        return row
