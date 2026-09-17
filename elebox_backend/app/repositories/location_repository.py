from sqlalchemy.orm import Session

from app.models.city import City
from app.models.country import Country
from app.models.locations import Location
from app.models.users import User


class LocationRepository:

    @staticmethod
    def get_all(db: Session):
        return (
            db.query(Location)
            .order_by(Location.location_id)
            .all()
        )

    @staticmethod
    def get_by_id(db: Session, location_id: int):
        return (
            db.query(Location)
            .filter(Location.location_id == location_id)
            .first()
        )

    @staticmethod
    def get_country_by_id(db: Session, country_id: int):
        return (
            db.query(Country)
            .filter(Country.country_id == country_id)
            .first()
        )

    @staticmethod
    def get_city_by_id(db: Session, city_id: int):
        return (
            db.query(City)
            .filter(City.city_id == city_id)
            .first()
        )

    @staticmethod
    def get_all_countries(db: Session):
        return db.query(Country).order_by(Country.country_id).all()

    @staticmethod
    def get_all_cities(db: Session):
        return db.query(City).order_by(City.city_id).all()

    @staticmethod
    def get_country_name(db: Session, country_id: int | None):
        if country_id is None:
            return None

        country = LocationRepository.get_country_by_id(db, country_id)
        return country.country_name if country else None

    @staticmethod
    def get_city_name(db: Session, city_id: int | None):
        if city_id is None:
            return None

        city = LocationRepository.get_city_by_id(db, city_id)
        return city.city_name if city else None

    @staticmethod
    def create(db: Session, location: Location):
        db.add(location)
        db.commit()
        db.refresh(location)
        return location

    @staticmethod
    def update(db: Session, location: Location):
        db.commit()
        db.refresh(location)
        return location

    @staticmethod
    def delete(db: Session, location: Location):
        db.delete(location)
        db.commit()

    @staticmethod
    def count_users_at_location(db: Session, location_id: int) -> int:
        return (
            db.query(User)
            .filter(User.location_id == location_id)
            .count()
        )
