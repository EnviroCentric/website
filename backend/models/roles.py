from pydantic import BaseModel
from typing import List, Optional


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    pass


class RoleUpdate(RoleBase):
    name: Optional[str] = None


class Role(RoleBase):
    role_id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class RoleOut(RoleBase):
    role_id: int
    permissions: Optional[List[str]] = None

    class Config:
        from_attributes = True


class UserRole(BaseModel):
    user_id: int
    role_id: int
    created_at: str

    class Config:
        from_attributes = True


class UserWithRoles(BaseModel):
    user_id: int
    email: str
    first_name: str
    last_name: str
    roles: List[RoleOut]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    last_login: Optional[str] = None

    class Config:
        from_attributes = True
