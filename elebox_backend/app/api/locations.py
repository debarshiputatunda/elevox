from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rbac import Permission
from app.middlewares.auth_middleware import require_permission
from app.schemas.location_schema import (
    CityResponse,
    CountryResponse,
    LocationCreateRequest,
    LocationResponse,
    LocationUpdateRequest,
    MessageResponse,
)
from app.services.location_service import LocationService

router = APIRouter(
    prefix="/locations",
    tags=["Locations"],
)


@router.get(
    "/countries",
    response_model=List[CountryResponse],
)
def list_countries(
    db: Session = Depends(get_db),
    _current_user=Depends(
        require_permission(
            Permission.LOCATIONS_MANAGE,
            Permission.LOCATIONS_VIEW,
        )
    ),
):
    """
    List countries for location forms. Admin and Manager.
    """
    return LocationService.list_countries(db=db)


@router.get(
    "/cities",
    response_model=List[CityResponse],
)
def list_cities(
    db: Session = Depends(get_db),
    _current_user=Depends(
        require_permission(
            Permission.LOCATIONS_MANAGE,
            Permission.LOCATIONS_VIEW,
        )
    ),
):
    """
    List cities for location forms. Admin and Manager.
    """
    return LocationService.list_cities(db=db)


@router.get(
    "",
    response_model=List[LocationResponse],
)
def list_locations(
    db: Session = Depends(get_db),
    _current_user=Depends(
        require_permission(
            Permission.LOCATIONS_MANAGE,
            Permission.LOCATIONS_VIEW,
        )
    ),
):
    """
    List all locations. Admin and Manager.
    """
    return LocationService.list_locations(db=db)


@router.post(
    "",
    response_model=LocationResponse,
    status_code=201,
)
def create_location(
    request: LocationCreateRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.LOCATIONS_MANAGE)),
):
    """
    Create a location. Admin only.
    """
    return LocationService.create_location(db=db, request=request)


@router.get(
    "/{location_id}",
    response_model=LocationResponse,
)
def get_location(
    location_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(
        require_permission(
            Permission.LOCATIONS_MANAGE,
            Permission.LOCATIONS_VIEW,
        )
    ),
):
    """
    Get a location by ID. Admin and Manager.
    """
    return LocationService.get_location(db=db, location_id=location_id)


@router.put(
    "/{location_id}",
    response_model=LocationResponse,
)
def update_location(
    location_id: int,
    request: LocationUpdateRequest,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.LOCATIONS_MANAGE)),
):
    """
    Update a location. Admin only.
    """
    return LocationService.update_location(
        db=db,
        location_id=location_id,
        request=request,
    )


@router.delete(
    "/{location_id}",
    response_model=MessageResponse,
)
def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission(Permission.LOCATIONS_MANAGE)),
):
    """
    Delete a location. Admin only.
    """
    return LocationService.delete_location(db=db, location_id=location_id)
