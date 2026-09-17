from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rbac import Permission
from app.middlewares.auth_middleware import get_current_user, require_permission
from app.schemas.auth_schema import (
    CurrentUserResponse,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Authenticate user and return JWT access token.
    """
    return AuthService.login(
        db=db,
        email=request.email,
        password=request.password,
    )


@router.post(
    "/register",
    response_model=MessageResponse,
)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.USERS_MANAGE)),
):
    """
    Register a new user. Admin only.
    """
    return AuthService.register(
        db=db,
        request=request,
    )


@router.get(
    "/me",
    response_model=CurrentUserResponse,
)
def get_logged_in_user(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return currently authenticated user's profile, roles, and permissions.
    """
    return AuthService.get_current_user(
        db=db,
        user_id=current_user.user_id,
    )
