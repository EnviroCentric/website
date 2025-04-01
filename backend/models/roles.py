from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    pass


class RoleUpdate(RoleBase):
    name: Optional[str] = None


class Role(RoleBase):
    role_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserRole(BaseModel):
    user_id: int
    role_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserWithRoles(BaseModel):
    user_id: int
    email: str
    first_name: str
    last_name: str
    roles: List[Role]
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True
