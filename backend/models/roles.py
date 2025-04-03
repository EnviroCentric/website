from pydantic import BaseModel, validator
from typing import List, Optional


class SecurityLevelConfig(BaseModel):
    create_role: int = 10
    view_roles: int = 5
    manage_roles: int = 5
    view_users: int = 5

    @validator("create_role", "view_roles", "manage_roles", "view_users")
    def validate_security_level(cls, v):
        if not 1 <= v <= 10:
            raise ValueError("Security level must be between 1 and 10")
        return v


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    security_level: int = 1

    @validator("security_level")
    def validate_security_level(cls, v):
        if not 1 <= v <= 10:
            raise ValueError("Security level must be between 1 and 10")
        return v


class RoleCreate(RoleBase):
    pass


class RoleUpdate(RoleBase):
    name: Optional[str] = None
    security_level: Optional[int] = None

    @validator("security_level")
    def validate_security_level(cls, v):
        if v is not None and not 1 <= v <= 10:
            raise ValueError("Security level must be between 1 and 10")
        return v


class Role(RoleBase):
    role_id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class RoleOut(RoleBase):
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
