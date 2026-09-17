from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rbac import Permission
from app.middlewares.auth_middleware import require_permission
from app.schemas.role_schema import RoleResponse
from app.services.role_service import RoleService

router = APIRouter(
    prefix="/roles",
    tags=["Roles"],
)


@router.get(
    "",
    response_model=List[RoleResponse],
)
def list_roles(
    db: Session = Depends(get_db),
    _current_user=Depends(
        require_permission(Permission.USERS_MANAGE, Permission.USERS_VIEW)
    ),
):
    """
    List all available roles. Admin and Manager only.
    """
    return RoleService.list_roles(db=db)
