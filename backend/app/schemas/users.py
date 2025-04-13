from typing import Optional
from pydantic import BaseModel, EmailStr
from .roles import Role


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    roles: list[Role] = []

    class Config:
        from_attributes = True
