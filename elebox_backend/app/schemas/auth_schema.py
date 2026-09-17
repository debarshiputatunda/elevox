from typing import List

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
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


class LoginRequest(BaseModel):
    email: EmailStr = Field(
        ...,
        description="User email address",
    )
    password: str = Field(
        ...,
        min_length=1,
        description="User password",
    )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"


class UserRoleResponse(BaseModel):
    role_id: int
    role_name: str


class CurrentUserResponse(BaseModel):
    id: int
    employeeId: str | None = None
    fullName: str | None = None
    email: EmailStr
    mobileNumber: str | None = None
    role: str
    roles: List[str]
    permissions: List[str]
    workAreaId: int | None = None
    locationId: int | None = None
    status: str = "Active"


class MessageResponse(BaseModel):
    message: str
