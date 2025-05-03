from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg
from app.db.session import get_db
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from app.services import UserService
from typing import List
from app.core.security import get_current_user
from app.core.validators import validate_password

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user: UserResponse = Depends(get_current_user)
):
    """Get current user endpoint."""
    return current_user

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: asyncpg.Pool = Depends(get_db)
):
    """Get a user by ID."""
    user_service = UserService(db)
    user = await user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.post("/", response_model=UserResponse)
async def create_user(
    user_in: UserCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: asyncpg.Pool = Depends(get_db)
):
    """Create a new user."""
    # Validate password
    if not validate_password(user_in.password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters long and contain uppercase, lowercase, numbers and special characters"
        )
    
    user_service = UserService(db)
    
    # Check if user already exists
    existing_user = await user_service.get_user_by_email(user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user = await user_service.create_user(user_in)
    return user 