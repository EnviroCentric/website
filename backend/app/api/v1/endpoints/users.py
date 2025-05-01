from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.role import Role
from app.schemas.user import (
    UserResponse,
    UserUpdate,
    PasswordUpdate,
    DeleteUserResponse,
)
from app.core.security import get_current_user, get_password_hash, verify_password
from pydantic import EmailStr

router = APIRouter()


def check_user_management_access(user: User) -> None:
    """
    Check if user has permission to manage users.
    """
    if user.is_superuser:
        return

    has_permission = any(
        permission.name == "manage_users"
        for role in user.roles
        for permission in role.permissions
    )

    if not has_permission:
        raise HTTPException(status_code=403, detail="Not authorized to manage users")


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
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
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


@router.get("/", response_model=List[UserResponse])
async def get_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get all users.
    """
    check_user_management_access(current_user)
    users = db.query(User).all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get user by ID.
    """
    check_user_management_access(current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update user information.
    """
    check_user_management_access(current_user)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in user_update.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.delete("/{user_id}", response_model=DeleteUserResponse)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set a user as inactive."""
    # Check if current user has permission to manage users
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to manage users")

    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent deactivating superusers
    if user.is_superuser:
        raise HTTPException(status_code=400, detail="Cannot deactivate superuser")

    user.is_active = False
    db.add(user)
    db.commit()

    return DeleteUserResponse(message="User deactivated successfully", user_id=user.id)


@router.put("/{user_id}/roles")
async def update_user_roles(
    user_id: int,
    role_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update user roles.
    """
    check_user_management_access(current_user)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_superuser:
        raise HTTPException(status_code=400, detail="Cannot modify superuser roles")

    # Clear existing roles
    user.roles = []

    # Add new roles
    for role_id in role_data.get("role_ids", []):
        role = db.query(Role).filter(Role.id == role_id).first()
        if role:
            user.roles.append(role)

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "User roles updated successfully"}


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
