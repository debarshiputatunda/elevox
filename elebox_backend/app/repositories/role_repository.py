from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.roles import Role
from app.models.user_role import UserRole


class RoleRepository:

    @staticmethod
    def get_all_roles(db: Session):
        return db.query(Role).order_by(Role.role_id).all()

    @staticmethod
    def get_role_by_id(db: Session, role_id: int):
        return (
            db.query(Role)
            .filter(Role.role_id == role_id)
            .first()
        )

    @staticmethod
    def get_user_roles(db: Session, user_id: int):
        return (
            db.query(Role)
            .join(
                UserRole,
                Role.role_id == UserRole.role_id,
            )
            .filter(UserRole.user_id == user_id)
            .all()
        )

    @staticmethod
    def user_has_role(db: Session, user_id: int, role_id: int):
        return (
            db.query(UserRole)
            .filter(
                UserRole.user_id == user_id,
                UserRole.role_id == role_id,
            )
            .first()
            is not None
        )

    @staticmethod
    def _next_user_role_id(db: Session) -> int:
        max_id = (
            db.query(func.max(UserRole.user_role_id))
            .scalar()
        )
        return (max_id or 0) + 1

    @staticmethod
    def assign_role_to_user(
        db: Session,
        user_id: int,
        role_id: int,
    ):
        user_role = UserRole(
            user_role_id=RoleRepository._next_user_role_id(db),
            role_id=role_id,
            user_id=user_id,
        )
        db.add(user_role)
        db.commit()
        return user_role

    @staticmethod
    def assign_roles_to_user(
        db: Session,
        user_id: int,
        role_ids: list[int],
    ):
        for role_id in role_ids:
            if not RoleRepository.user_has_role(db, user_id, role_id):
                RoleRepository.assign_role_to_user(
                    db=db,
                    user_id=user_id,
                    role_id=role_id,
                )

    @staticmethod
    def count_users_with_role(db: Session, role_id: int) -> int:
        return (
            db.query(UserRole)
            .filter(UserRole.role_id == role_id)
            .count()
        )

    @staticmethod
    def remove_role_from_user(
        db: Session,
        user_id: int,
        role_id: int,
    ):
        assignment = (
            db.query(UserRole)
            .filter(
                UserRole.user_id == user_id,
                UserRole.role_id == role_id,
            )
            .first()
        )
        if assignment is None:
            return None

        db.delete(assignment)
        db.commit()
        return assignment

    @staticmethod
    def remove_all_roles_from_user(db: Session, user_id: int):
        db.query(UserRole).filter(UserRole.user_id == user_id).delete(
            synchronize_session=False,
        )
        db.commit()

    @staticmethod
    def replace_user_roles(
        db: Session,
        user_id: int,
        role_ids: list[int],
    ):
        db.query(UserRole).filter(UserRole.user_id == user_id).delete(
            synchronize_session=False,
        )
        next_id = RoleRepository._next_user_role_id(db)
        for role_id in role_ids:
            db.add(
                UserRole(
                    user_role_id=next_id,
                    role_id=role_id,
                    user_id=user_id,
                )
            )
            next_id += 1
        db.commit()
