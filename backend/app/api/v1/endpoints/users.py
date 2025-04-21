from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.core.security import get_current_user
from pydantic import EmailStr

router = APIRouter()


@router.get("/check-email/{email}")
async def check_email_exists(
    email: EmailStr,
    db: Session = Depends(get_db),
) -> Any:
    """
    Check if an email already exists in the database.
    """
    user = db.query(User).filter(User.email == email).first()
    return {"exists": user is not None}


@router.get("/self", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get current user information.
    """
    return current_user
