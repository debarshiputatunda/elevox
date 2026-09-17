from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.rbac import RoleName, has_role
from app.repositories.auth_repository import AuthRepository
from app.repositories.role_repository import RoleRepository

ADMIN_ROLE_ID = 1


class RoleService:

    @staticmethod
    def _get_role_names(db: Session, user_id: int) -> set[str]:
        roles = RoleRepository.get_user_roles(db, user_id)
        return {role.role_name for role in roles}

    @staticmethod
    def _user_is_privileged(db: Session, user_id: int) -> bool:
        return has_role(
            RoleService._get_role_names(db, user_id),
            RoleName.ADMIN,
            RoleName.MANAGER,
        )

    @staticmethod
    def ensure_assignable_roles(role_ids: list[int]) -> None:
        if ADMIN_ROLE_ID in role_ids and len(role_ids) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin role cannot be combined with other roles",
            )

    @staticmethod
    def list_roles(db: Session):
        roles = RoleRepository.get_all_roles(db)
        return [
            {
                "role_id": role.role_id,
                "role_name": role.role_name,
                "description": role.description,
            }
            for role in roles
        ]

    @staticmethod
    def get_user_roles(db: Session, user_id: int, caller_user_id: int):
        if (
            caller_user_id != user_id
            and not RoleService._user_is_privileged(db, caller_user_id)
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this user's roles",
            )

        user = AuthRepository.get_user_by_id(db, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        roles = RoleRepository.get_user_roles(db, user_id)
        return {
            "user_id": user_id,
            "roles": [
                {
                    "role_id": role.role_id,
                    "role_name": role.role_name,
                    "description": role.description,
                }
                for role in roles
            ],
        }

    @staticmethod
    def assign_role(db: Session, user_id: int, role_id: int):
        user = AuthRepository.get_user_by_id(db, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        role = RoleRepository.get_role_by_id(db, role_id)
        if role is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found",
            )

        RoleService.ensure_assignable_roles([role_id])

        if RoleRepository.user_has_role(db, user_id, role_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has this role",
            )

        RoleRepository.assign_role_to_user(
            db=db,
            user_id=user_id,
            role_id=role_id,
        )

        return {"message": "Role assigned successfully"}

    @staticmethod
    def remove_role(db: Session, user_id: int, role_id: int):
        user = AuthRepository.get_user_by_id(db, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        role = RoleRepository.get_role_by_id(db, role_id)
        if role is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found",
            )

        if role.role_name == RoleName.ADMIN:
            admin_count = RoleRepository.count_users_with_role(
                db=db,
                role_id=role_id,
            )
            if admin_count <= 1 and RoleRepository.user_has_role(
                db, user_id, role_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot remove the last Admin role",
                )

        removed = RoleRepository.remove_role_from_user(
            db=db,
            user_id=user_id,
            role_id=role_id,
        )
        if removed is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User does not have this role",
            )

        return {"message": "Role removed successfully"}

    @staticmethod
    def validate_role_ids(db: Session, role_ids: list[int]):
        if not role_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one role must be assigned",
            )

        for role_id in role_ids:
            if RoleRepository.get_role_by_id(db, role_id) is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Role with id {role_id} does not exist",
                )
