from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rbac import Permission
from app.middlewares.auth_middleware import get_current_user, require_permission
from app.schemas.role_schema import (
    AssignRoleRequest,
    MessageResponse as RoleMessageResponse,
    UserRolesResponse,
)
from app.schemas.user_schema import (
    MessageResponse,
    UserCreateRequest,
    UserEditRequest,
    UserResponse,
    UserUpdateRequest,
)
from app.services.role_service import RoleService
from app.services.user_service import UserService

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.get(
    "",
    response_model=List[UserResponse],
)
def list_users(
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.USERS_MANAGE)),
):
    """
    List all users. Admin only.
    """
    return UserService.list_users(db=db)


@router.post(
    "",
    response_model=UserResponse,
    status_code=201,
)
def create_user(
    request: UserCreateRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.USERS_MANAGE)),
):
    """
    Create a new user. Admin only.
    """
    return UserService.create_user(db=db, request=request)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.USERS_MANAGE)),
):
    """
    Get a user by ID. Admin only.
    """
    return UserService.get_user(db=db, user_id=user_id)


@router.put(
    "/{user_id}",
    response_model=UserResponse,
)
def update_user(
    user_id: int,
    request: UserUpdateRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.USERS_MANAGE)),
):
    """
    Partially update a user. Admin only.
    """
    return UserService.update_user(db=db, user_id=user_id, request=request)


@router.get(
    "/{user_id}/edit",
    response_model=UserResponse,
)
def get_user_for_edit(
    user_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.USERS_MANAGE)),
):
    """
    Get full user details for the edit form. Admin only.
    """
    return UserService.get_user(db=db, user_id=user_id)


@router.put(
    "/{user_id}/edit",
    response_model=UserResponse,
)
def edit_user(
    user_id: int,
    request: UserEditRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.USERS_MANAGE)),
):
    """
    Update all user details at once. Admin only.
    """
    return UserService.edit_user(db=db, user_id=user_id, request=request)


@router.delete(
    "/{user_id}",
    response_model=MessageResponse,
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission(Permission.USERS_MANAGE)),
):
    """
    Delete a user. Admin only.
    """
    return UserService.delete_user(
        db=db,
        user_id=user_id,
        caller_user_id=current_user.user_id,
    )


@router.get(
    "/{user_id}/roles",
    response_model=UserRolesResponse,
)
def get_user_roles(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get roles for a user. Admins/Managers can view any user; others only themselves.
    """
    return RoleService.get_user_roles(
        db=db,
        user_id=user_id,
        caller_user_id=current_user.user_id,
    )


@router.post(
    "/{user_id}/roles",
    response_model=RoleMessageResponse,
)
def assign_role_to_user(
    user_id: int,
    request: AssignRoleRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.USERS_MANAGE)),
):
    """
    Assign a role to a user. Admin only.
    """
    return RoleService.assign_role(
        db=db,
        user_id=user_id,
        role_id=request.role_id,
    )


@router.delete(
    "/{user_id}/roles/{role_id}",
    response_model=RoleMessageResponse,
)
def remove_role_from_user(
    user_id: int,
    role_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.USERS_MANAGE)),
):
    """
    Remove a role from a user. Admin only.
    """
    return RoleService.remove_role(
        db=db,
        user_id=user_id,
        role_id=role_id,
    )
