from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.locations import Location
from app.repositories.location_repository import LocationRepository


class LocationService:

    @staticmethod
    def _build_response(db: Session, location: Location):
        return {
            "location_id": location.location_id,
            "location_name": location.location_name,
            "country_id": location.country_id,
            "country_name": LocationRepository.get_country_name(
                db,
                location.country_id,
            ),
            "city_id": location.city_id,
            "city_name": LocationRepository.get_city_name(db, location.city_id),
        }

    @staticmethod
    def _validate_country_and_city(db: Session, country_id: int, city_id: int):
        if LocationRepository.get_country_by_id(db, country_id) is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Country does not exist",
            )

        if LocationRepository.get_city_by_id(db, city_id) is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="City does not exist",
            )

    @staticmethod
    def list_locations(db: Session):
        locations = LocationRepository.get_all(db)
        return [
            LocationService._build_response(db, location)
            for location in locations
        ]

    @staticmethod
    def list_countries(db: Session):
        countries = LocationRepository.get_all_countries(db)
        return [
            {
                "country_id": country.country_id,
                "country_name": country.country_name,
            }
            for country in countries
        ]

    @staticmethod
    def list_cities(db: Session):
        cities = LocationRepository.get_all_cities(db)
        return [
            {
                "city_id": city.city_id,
                "city_name": city.city_name,
            }
            for city in cities
        ]

    @staticmethod
    def get_location(db: Session, location_id: int):
        location = LocationRepository.get_by_id(db, location_id)
        if location is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found",
            )

        return LocationService._build_response(db, location)

    @staticmethod
    def create_location(db: Session, request):
        LocationService._validate_country_and_city(
            db,
            request.country_id,
            request.city_id,
        )

        location = Location(
            country_id=request.country_id,
            city_id=request.city_id,
            location_name=request.location_name.strip(),
        )
        location = LocationRepository.create(db, location)
        return LocationService._build_response(db, location)

    @staticmethod
    def update_location(db: Session, location_id: int, request):
        location = LocationRepository.get_by_id(db, location_id)
        if location is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found",
            )

        LocationService._validate_country_and_city(
            db,
            request.country_id,
            request.city_id,
        )

        location.country_id = request.country_id
        location.city_id = request.city_id
        location.location_name = request.location_name.strip()
        location = LocationRepository.update(db, location)
        return LocationService._build_response(db, location)

    @staticmethod
    def delete_location(db: Session, location_id: int):
        location = LocationRepository.get_by_id(db, location_id)
        if location is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found",
            )

        if LocationRepository.count_users_at_location(db, location_id) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Location cannot be deleted because users are assigned to it",
            )

        try:
            LocationRepository.delete(db, location)
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Location cannot be deleted because related records exist"
                ),
            )

        return {"message": "Location deleted successfully"}
