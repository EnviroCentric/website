from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator


class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("first_name", "last_name")
    def validate_name(cls, v):
        if v is not None and v.strip() == "":
            raise ValueError("Name cannot be empty")
        return v


class UserCreate(UserBase):
    email: EmailStr
    password: str
    first_name: str
    last_name: str


class UserUpdate(UserBase):
    pass


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserResponse(UserBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    roles: List[RoleResponse] = []

    model_config = ConfigDict(from_attributes=True)


class DeleteUserResponse(BaseModel):
    message: str
    user_id: int
