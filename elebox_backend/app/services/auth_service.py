from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.rbac import (
    ACTIVE_STATUS_NAME,
    get_permissions_for_roles,
    resolve_primary_role,
)
from app.models.users import User
from app.repositories.auth_repository import AuthRepository
from app.repositories.role_repository import RoleRepository
from app.services.user_service import UserService
from app.utils.jwt_handler import create_access_token
from app.utils.password_handler import verify_password


class AuthService:

    @staticmethod
    def _build_user_profile(db: Session, user: User):
        roles = RoleRepository.get_user_roles(db=db, user_id=user.user_id)
        role_names = [role.role_name for role in roles]
        primary_role = resolve_primary_role(role_names)

        if primary_role is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has no assigned roles",
            )

        status_name = (
            AuthRepository.get_account_status_name(db, user.status_id)
            if user.status_id is not None
            else ACTIVE_STATUS_NAME
        )

        return {
            "id": user.user_id,
            "employeeId": user.employee_id,
            "fullName": user.employee_name,
            "email": user.email_id,
            "mobileNumber": user.phonenumber,
            "role": primary_role,
            "roles": role_names,
            "permissions": get_permissions_for_roles(role_names),
            "workAreaId": user.work_area_id,
            "locationId": user.location_id,
            "status": status_name or ACTIVE_STATUS_NAME,
        }

    @staticmethod
    def _ensure_can_login(db: Session, user: User) -> None:
        status_name = (
            AuthRepository.get_account_status_name(db, user.status_id)
            if user.status_id is not None
            else ACTIVE_STATUS_NAME
        )
        if status_name != ACTIVE_STATUS_NAME:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is not active",
            )

        roles = RoleRepository.get_user_roles(db=db, user_id=user.user_id)
        if not roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has no assigned roles",
            )

    @staticmethod
    def login(db: Session, email: str, password: str):
        user = AuthRepository.get_user_by_email(db=db, email=email)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not verify_password(
            plain_password=password,
            hashed_password=user.password,
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        AuthService._ensure_can_login(db=db, user=user)

        access_token = create_access_token(
            {
                "user_id": user.user_id,
                "email": user.email_id,
            }
        )

        return {
            "access_token": access_token,
            "token_type": "Bearer",
        }

    @staticmethod
    def get_current_user(db: Session, user_id: int):
        user = AuthRepository.get_user_by_id(db=db, user_id=user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        return AuthService._build_user_profile(db=db, user=user)

    @staticmethod
    def register(db: Session, request):
        UserService.create_user(db=db, request=request)
        return {"message": "User registered successfully"}
