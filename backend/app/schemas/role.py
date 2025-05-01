from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    permissions: Optional[List[str]] = []


class RoleUpdate(RoleBase):
    permissions: Optional[List[str]] = None


class RoleResponse(RoleBase):
    role_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RolePermissionUpdate(BaseModel):
    permissions: List[str]
