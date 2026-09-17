from datetime import datetime
from typing import List

from pydantic import BaseModel, EmailStr, Field

from app.schemas.role_schema import RoleResponse


class UserCreateRequest(BaseModel):
    employee_id: str
    employee_name: str
    email_id: EmailStr
    phonenumber: str
    password: str
    status_id: int
    job_title_id: int
    work_area_id: int
    location_id: int
    role_ids: List[int] = Field(
        ...,
        min_length=1,
        description="Role IDs to assign to the new user",
    )


class UserUpdateRequest(BaseModel):
    employee_id: str | None = None
    employee_name: str | None = None
    email_id: EmailStr | None = None
    phonenumber: str | None = None
    password: str | None = None
    status_id: int | None = None
    job_title_id: int | None = None
    work_area_id: int | None = None
    location_id: int | None = None
    role_ids: List[int] | None = Field(
        default=None,
        min_length=1,
        description="Replace the user's roles when provided",
    )


class UserEditRequest(BaseModel):
    employee_id: str
    employee_name: str
    email_id: EmailStr
    phonenumber: str
    status_id: int
    job_title_id: int
    work_area_id: int
    location_id: int
    role_ids: List[int] = Field(
        ...,
        min_length=1,
        description="Role IDs to assign to the user",
    )
    password: str | None = Field(
        default=None,
        description="Set a new password; omit or leave null to keep the current one",
    )


class UserResponse(BaseModel):
    user_id: int
    employee_id: str | None = None
    employee_name: str | None = None
    email_id: EmailStr | None = None
    phonenumber: str | None = None
    status_id: int | None = None
    status: str | None = None
    job_title_id: int | None = None
    job_title_name: str | None = None
    work_area_id: int | None = None
    work_area_name: str | None = None
    location_id: int | None = None
    location_name: str | None = None
    role_ids: List[int] = Field(default_factory=list)
    roles: List[RoleResponse]
    created_at: datetime | None = None


class MessageResponse(BaseModel):
    message: str
