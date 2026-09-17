from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rbac import ACTIVE_STATUS_NAME, has_any_permission, has_role
from app.repositories.auth_repository import AuthRepository
from app.repositories.role_repository import RoleRepository
from app.utils.jwt_handler import verify_access_token

security = HTTPBearer()


def _get_user_role_names(db: Session, user_id: int) -> set[str]:
    roles = RoleRepository.get_user_roles(db=db, user_id=user_id)
    return {role.role_name for role in roles}


def _ensure_active_account(db: Session, user) -> None:
    if user.status_id is None:
        return

    status_name = AuthRepository.get_account_status_name(
        db=db,
        status_id=user.status_id,
    )
    if status_name != ACTIVE_STATUS_NAME:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active",
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Validate JWT and return the authenticated user.
    """
    token = credentials.credentials
    payload = verify_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = AuthRepository.get_user_by_id(db=db, user_id=user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User does not exist",
        )

    _ensure_active_account(db=db, user=user)
    return user


def require_role(*allowed_roles: str):
    """
    RBAC dependency — user must have at least one of the allowed roles.
    """

    def role_checker(
        current_user=Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        role_names = _get_user_role_names(db, current_user.user_id)
        if not has_role(role_names, *allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to perform this action",
            )
        return current_user

    return role_checker


def require_permission(*permissions: str):
    """
    RBAC dependency — user must have at least one of the allowed permissions.
    """

    def permission_checker(
        current_user=Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        role_names = _get_user_role_names(db, current_user.user_id)
        if not has_any_permission(role_names, *permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to perform this action",
            )
        return current_user

    return permission_checker
