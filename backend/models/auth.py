from pydantic import BaseModel
from fastapi import Form


class AccountForm(BaseModel):
    username: str  # Required by jwtdown-fastapi
    email: str
    password: str

    @classmethod
    def as_form(
        cls,
        username: str = Form(...),
        password: str = Form(...),
    ):
        # Use username (which is the email) for both fields
        return cls(username=username, email=username, password=password)

    class Config:
        from_attributes = True


class AccountToken(BaseModel):
    access_token: str
    token_type: str
    account: dict
