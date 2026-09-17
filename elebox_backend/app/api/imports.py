from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rbac import Permission
from app.middlewares.auth_middleware import get_current_user, require_permission
from app.schemas.import_schema import ImportResponse
from app.services.import_service import ImportService

router = APIRouter(
    prefix="/imports",
    tags=["Imports"],
)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


async def _read_upload(file: UploadFile) -> tuple[bytes, str | None]:
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .xlsx files are supported",
        )

    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10 MB limit",
        )
    if not content:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )
    return content, file.filename


@router.get("/templates/{import_type}")
def download_import_template(
    import_type: str,
    _current_user=Depends(get_current_user),
):
    """
    Download a sample Excel template for bulk import.
    """
    content, filename = ImportService.get_template(import_type)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post(
    "/locations",
    response_model=ImportResponse,
)
async def import_locations(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_permission(Permission.LOCATIONS_MANAGE)),
):
    """
    Bulk import locations from an Excel file.
    """
    content, filename = await _read_upload(file)
    return ImportService.import_locations(
        db,
        content,
        file_name=filename,
        user_id=current_user.user_id,
    )


@router.post(
    "/work-areas",
    response_model=ImportResponse,
)
async def import_work_areas(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_permission(Permission.WORK_AREAS_MANAGE)),
):
    """
    Bulk import work areas from an Excel file.
    """
    content, filename = await _read_upload(file)
    return ImportService.import_work_areas(
        db,
        content,
        file_name=filename,
        user_id=current_user.user_id,
    )


@router.post(
    "/users",
    response_model=ImportResponse,
)
async def import_users(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_permission(Permission.USERS_MANAGE)),
):
    """
    Bulk import users from an Excel file.
    """
    content, filename = await _read_upload(file)
    return ImportService.import_users(
        db,
        content,
        file_name=filename,
        user_id=current_user.user_id,
    )


@router.post(
    "/sboxes",
    response_model=ImportResponse,
)
async def import_sboxes(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_permission(Permission.SBOXES_MANAGE)),
):
    """
    Bulk import S-Box devices from an Excel file.
    """
    content, filename = await _read_upload(file)
    return ImportService.import_sboxes(
        db,
        content,
        file_name=filename,
        user_id=current_user.user_id,
    )
