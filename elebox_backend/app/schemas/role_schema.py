from typing import List

from pydantic import BaseModel, Field


class RoleResponse(BaseModel):
    role_id: int
    role_name: str
    description: str | None = None


class AssignRoleRequest(BaseModel):
    role_id: int = Field(..., gt=0)


class UserRolesResponse(BaseModel):
    user_id: int
    roles: List[RoleResponse]


class MessageResponse(BaseModel):
    message: str
