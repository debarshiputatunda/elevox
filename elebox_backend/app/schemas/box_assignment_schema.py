from pydantic import BaseModel, Field


class BoxAssignmentRequest(BaseModel):
    user_id: int = Field(..., gt=0)
    work_area_id: int = Field(..., gt=0)


class BoxAssignmentResponse(BaseModel):
    user_id: int
    employee_name: str | None = None
    box_id: int
    serial_no: str | None = None
    work_area_id: int
    work_area_name: str | None = None


class BoxLogResponse(BaseModel):
    log_id: int
    user_id: int
    employee_name: str | None = None
    box_id: int
    serial_no: str | None = None
    work_area_id: int | None = None
    work_area_name: str | None = None
    description: str | None = None
    created_at: str


class BoxLogListResponse(BaseModel):
    data: list[BoxLogResponse]
    total: int
    page: int
    page_size: int
