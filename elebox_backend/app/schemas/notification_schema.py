from datetime import date

from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    notification_id: int
    box_id: int | None = None
    serial_no: str | None = None
    box_ip: str | None = None
    location_id: int | None = None
    location_name: str | None = None
    work_area_id: int | None = None
    work_area_name: str | None = None
    user_id: int | None = None
    employee_id: str | None = None
    employee_name: str | None = None
    email: str | None = None
    phone: str | None = None
    severity: str
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: str


class NotificationListResponse(BaseModel):
    data: list[NotificationResponse]
    total: int
    page: int
    page_size: int
    unread_count: int


class NotificationMarkReadResponse(BaseModel):
    message: str
    updated_count: int | None = None


class NotificationFilterParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    search: str | None = None
    severity: str | None = None
    notification_type: str | None = None
    is_read: bool | None = None
    sbox_id: int | None = None
    serial_no: str | None = None
    location_id: int | None = None
    user_id: int | None = None
    employee_id: str | None = None
    employee_name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
