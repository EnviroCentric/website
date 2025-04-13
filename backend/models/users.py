from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
from typing import Optional, Union, List
import re


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str


class UserIn(UserBase):
    password: str
    password_confirmation: str

    @validator("password")
    def validate_password(cls, v):
        if len(v) < 12:
            raise ValueError("Password must be at least 12 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError("Password must contain at least one special character")
        return v


class UserOut(UserBase):
    user_id: int
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @validator("last_login", "created_at", "updated_at")
    def parse_datetime(cls, v):
        if isinstance(v, str):
            try:
                return datetime.strptime(v, "%m-%d-%Y")
            except ValueError:
                return v
        return v

    class Config:
        from_attributes = True


class UserUpdateIn(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    new_password_confirmation: Optional[str] = None


class UserUpdateOut(UserOut):
    message: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @validator("created_at", "updated_at")
    def parse_datetime(cls, v):
        if isinstance(v, str):
            try:
                return v
            except ValueError:
                return v
        return v


class UserProfileOut(UserOut):
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @validator("created_at", "updated_at")
    def parse_datetime(cls, v):
        if isinstance(v, str):
            try:
                return v
            except ValueError:
                return v
        return v


class UserOutWithPassword(UserOut):
    hashed_password: str


class AdminUserIn(UserIn):
    pass


class DuplicateUserError(Exception):
    pass


class Error(BaseModel):
    message: str


class HttpError(BaseModel):
    message: str
