from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rbac import Permission
from app.middlewares.auth_middleware import require_permission
from app.schemas.work_area_schema import (
    MessageResponse,
    WorkAreaCreateRequest,
    WorkAreaResponse,
    WorkAreaUpdateRequest,
)
from app.services.work_area_service import WorkAreaService

router = APIRouter(
    prefix="/work-areas",
    tags=["Work Areas"],
)


@router.get(
    "",
    response_model=List[WorkAreaResponse],
)
def list_work_areas(
    db: Session = Depends(get_db),
    _current_user=Depends(
        require_permission(
            Permission.WORK_AREAS_MANAGE,
            Permission.WORK_AREAS_VIEW,
        )
    ),
):
    """
    List all work areas. Admin and Manager.
    """
    return WorkAreaService.list_work_areas(db=db)


@router.post(
    "",
    response_model=WorkAreaResponse,
    status_code=201,
)
def create_work_area(
    request: WorkAreaCreateRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.WORK_AREAS_MANAGE)),
):
    """
    Create a work area. Admin only.
    """
    return WorkAreaService.create_work_area(db=db, request=request)


@router.get(
    "/{work_area_id}",
    response_model=WorkAreaResponse,
)
def get_work_area(
    work_area_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(
        require_permission(
            Permission.WORK_AREAS_MANAGE,
            Permission.WORK_AREAS_VIEW,
        )
    ),
):
    """
    Get a work area by ID. Admin and Manager.
    """
    return WorkAreaService.get_work_area(db=db, work_area_id=work_area_id)


@router.put(
    "/{work_area_id}",
    response_model=WorkAreaResponse,
)
def update_work_area(
    work_area_id: int,
    request: WorkAreaUpdateRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.WORK_AREAS_MANAGE)),
):
    """
    Update a work area. Admin only.
    """
    return WorkAreaService.update_work_area(
        db=db,
        work_area_id=work_area_id,
        request=request,
    )


@router.delete(
    "/{work_area_id}",
    response_model=MessageResponse,
)
def delete_work_area(
    work_area_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.WORK_AREAS_MANAGE)),
):
    """
    Delete a work area. Admin only.
    """
    return WorkAreaService.delete_work_area(
        db=db,
        work_area_id=work_area_id,
    )
