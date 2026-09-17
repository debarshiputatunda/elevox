from pydantic import BaseModel, Field


class LocationCreateRequest(BaseModel):
    country_id: int = Field(..., gt=0)
    city_id: int = Field(..., gt=0)
    location_name: str = Field(..., min_length=1, max_length=255)


class LocationUpdateRequest(BaseModel):
    country_id: int = Field(..., gt=0)
    city_id: int = Field(..., gt=0)
    location_name: str = Field(..., min_length=1, max_length=255)


class LocationResponse(BaseModel):
    location_id: int
    location_name: str
    country_id: int
    country_name: str | None = None
    city_id: int
    city_name: str | None = None


class CountryResponse(BaseModel):
    country_id: int
    country_name: str


class CityResponse(BaseModel):
    city_id: int
    city_name: str


class MessageResponse(BaseModel):
    message: str
