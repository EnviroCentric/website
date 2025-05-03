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


class RoleInDB(RoleBase):
    role_id: int
    role_order: int

    class Config:
        from_attributes = True


class RoleResponse(RoleInDB):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RolePermissionUpdate(BaseModel):
    permissions: List[str]


class RoleOrder(BaseModel):
    role_id: int
    role_order: int


class RoleReorder(BaseModel):
    role_orders: List[RoleOrder]
