from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rbac import Permission
from app.middlewares.auth_middleware import require_permission
from app.schemas.box_assignment_schema import (
    BoxAssignmentRequest,
    BoxAssignmentResponse,
    BoxLogListResponse,
)
from app.schemas.sbox_schema import (
    MessageResponse,
    SBoxCreateRequest,
    SBoxResponse,
    SBoxStatusUpdateRequest,
    SBoxThresholdUpdateRequest,
    SBoxUpdateRequest,
)
from app.services.box_assignment_service import BoxAssignmentService
from app.services.sbox_service import SboxService

router = APIRouter(
    prefix="/sboxes",
    tags=["S-Boxes"],
)


@router.get(
    "",
    response_model=List[SBoxResponse],
)
def list_sboxes(
    mine: bool = Query(default=False),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(
        require_permission(
            Permission.SBOXES_MANAGE,
            Permission.SBOXES_VIEW,
        )
    ),
):
    """
    List S-Boxes. Employees with mine=true see only assigned devices.
    """
    return SboxService.list_sboxes(
        db=db,
        current_user=current_user,
        mine=mine,
        search=search,
    )


@router.post(
    "",
    response_model=SBoxResponse,
    status_code=201,
)
def create_sbox(
    request: SBoxCreateRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.SBOXES_MANAGE)),
):
    """
    Register a new S-Box. Admin only.
    """
    return SboxService.create_sbox(db=db, request=request)


@router.get(
    "/assignments",
    response_model=List[BoxAssignmentResponse],
)
def list_all_assignments(
    db: Session = Depends(get_db),
    _current_user=Depends(
        require_permission(
            Permission.SBOXES_MANAGE,
            Permission.SBOXES_VIEW,
        )
    ),
):
    """
    List all one-to-one S-Box assignments.
    """
    return BoxAssignmentService.list_all_assignments(db=db)


@router.get(
    "/{box_id}",
    response_model=SBoxResponse,
)
def get_sbox(
    box_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(
        require_permission(
            Permission.SBOXES_MANAGE,
            Permission.SBOXES_VIEW,
        )
    ),
):
    """
    Get an S-Box by ID.
    """
    return SboxService.get_sbox(db=db, box_id=box_id)


@router.put(
    "/{box_id}",
    response_model=SBoxResponse,
)
def update_sbox(
    box_id: int,
    request: SBoxUpdateRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.SBOXES_MANAGE)),
):
    """
    Update an S-Box. Admin only.
    """
    return SboxService.update_sbox(
        db=db,
        box_id=box_id,
        request=request,
    )


@router.patch(
    "/{box_id}/thresholds",
    response_model=SBoxResponse,
)
def update_sbox_thresholds(
    box_id: int,
    request: SBoxThresholdUpdateRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.MONITORING)),
):
    """
    Persist Hook A / Hook B threshold values for live monitoring.
    """
    return SboxService.update_thresholds(db=db, box_id=box_id, request=request)


@router.patch(
    "/{box_id}/status",
    response_model=SBoxResponse,
)
def set_sbox_status(
    box_id: int,
    request: SBoxStatusUpdateRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.SBOXES_MANAGE)),
):
    """
    Enable or disable controller polling.
    """
    return SboxService.set_enabled(db=db, box_id=box_id, enabled=request.enabled)


@router.delete(
    "/{box_id}",
    response_model=MessageResponse,
)
def delete_sbox(
    box_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.SBOXES_MANAGE)),
):
    """
    Delete an S-Box. Admin only.
    """
    return SboxService.delete_sbox(db=db, box_id=box_id)


@router.post(
    "/{box_id}/assignments",
    response_model=BoxAssignmentResponse,
    status_code=201,
)
def assign_sbox(
    box_id: int,
    request: BoxAssignmentRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission(Permission.SBOXES_MANAGE)),
):
    """
    Assign an S-Box to a user in a work area. Writes an audit entry to box_logs.
    """
    return BoxAssignmentService.assign_box(
        db=db,
        box_id=box_id,
        user_id=request.user_id,
        work_area_id=request.work_area_id,
        actor_user_id=current_user.user_id,
    )


@router.delete(
    "/{box_id}/assignments",
    response_model=BoxAssignmentResponse,
)
def deallocate_sbox(
    box_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission(Permission.SBOXES_MANAGE)),
):
    """
    Remove an S-Box assignment. Writes a deallocation audit entry to box_logs.
    """
    return BoxAssignmentService.deallocate_box(
        db=db,
        box_id=box_id,
        actor_user_id=current_user.user_id,
    )


@router.get(
    "/{box_id}/assignments",
    response_model=List[BoxAssignmentResponse],
)
def list_sbox_assignments(
    box_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(
        require_permission(
            Permission.SBOXES_MANAGE,
            Permission.SBOXES_VIEW,
        )
    ),
):
    """
    List user/work-area assignments for an S-Box.
    """
    return BoxAssignmentService.list_assignments(db=db, box_id=box_id)


@router.get(
    "/{box_id}/logs",
    response_model=BoxLogListResponse,
)
def list_sbox_logs(
    box_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    _current_user=Depends(
        require_permission(
            Permission.SBOXES_MANAGE,
            Permission.SBOXES_VIEW,
        )
    ),
):
    """
    List assignment and activity logs for an S-Box.
    """
    return BoxAssignmentService.list_logs(
        db=db,
        box_id=box_id,
        page=page,
        page_size=page_size,
    )
