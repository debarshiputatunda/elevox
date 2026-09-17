from pydantic import BaseModel, Field


class WorkAreaCreateRequest(BaseModel):
    work_area_name: str = Field(..., min_length=1, max_length=255)
    location_id: int = Field(..., gt=0)


class WorkAreaUpdateRequest(BaseModel):
    work_area_name: str = Field(..., min_length=1, max_length=255)
    location_id: int = Field(..., gt=0)


class WorkAreaResponse(BaseModel):
    work_area_id: int
    work_area_name: str
    location_id: int
    location_name: str | None = None


class MessageResponse(BaseModel):
    message: str
