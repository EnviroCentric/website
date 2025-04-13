from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class PermissionBase(BaseModel):
    permission_name: str


class PermissionCreate(PermissionBase):
    pass


class Permission(PermissionBase):
    role_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class RolePermissions(BaseModel):
    role_id: int
    permissions: List[str]

    class Config:
        from_attributes = True


class RolePermissionsUpdate(BaseModel):
    permissions: List[str]
