from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, PasswordUpdate
from app.core.security import get_current_user, get_password_hash, verify_password
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


@router.put("/self", response_model=UserResponse)
async def update_current_user_info(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update current user information.
    """
    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(current_user, field, value)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return current_user


@router.put("/self/password")
async def update_password(
    password_update: PasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update current user's password.
    """
    if not verify_password(
        password_update.current_password, current_user.hashed_password
    ):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.hashed_password = get_password_hash(password_update.new_password)
    db.add(current_user)
    db.commit()

    return {"message": "Password updated successfully"}
