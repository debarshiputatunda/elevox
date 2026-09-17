from datetime import date

from pydantic import BaseModel, Field, model_validator


class SBoxCreateRequest(BaseModel):
    serial_no: str | None = Field(default=None, max_length=255)
    box_ip: str = Field(..., min_length=1, max_length=255)
    box_details: str | None = Field(default=None, max_length=500)
    location_id: int = Field(..., gt=0)
    work_area_id: int = Field(..., gt=0)
    activity_status: int = Field(default=1, gt=0)
    mfg_date: date | None = None


class SBoxUpdateRequest(BaseModel):
    box_ip: str = Field(..., min_length=1, max_length=255)
    box_details: str | None = Field(default=None, max_length=500)
    location_id: int = Field(..., gt=0)
    work_area_id: int = Field(..., gt=0)
    activity_status: int = Field(..., gt=0)
    mfg_date: date | None = None


class SBoxStatusUpdateRequest(BaseModel):
    enabled: bool


class SBoxThresholdUpdateRequest(BaseModel):
    hookA_threshold: int | None = Field(default=None, ge=0, le=100000)
    hookB_threshold: int | None = Field(default=None, ge=0, le=100000)

    @model_validator(mode="after")
    def require_threshold(self):
        if self.hookA_threshold is None and self.hookB_threshold is None:
            raise ValueError("At least one hook threshold is required")
        return self


class SBoxResponse(BaseModel):
    box_id: int
    serial_no: str | None = None
    box_ip: str | None = None
    box_details: str | None = None
    location_id: int | None = None
    location_name: str | None = None
    work_area_id: int | None = None
    work_area_name: str | None = None
    last_seen: str | None = None
    is_online: bool = False
    connectivity: str = "offline"
    activity_status: int | None = None
    activity_status_name: str | None = None
    box_health_status: int | None = None
    box_health_status_name: str | None = None
    mfg_date: str | None = None
    hookA_threshold: int | None = None
    hookB_threshold: int | None = None
    is_assigned: int = 0


class MessageResponse(BaseModel):
    message: str
