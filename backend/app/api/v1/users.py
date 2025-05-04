from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg
from app.db.session import get_db
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from app.services import UserService
from typing import List, Any
from app.core.security import get_current_user
from app.core.validators import validate_password
from app.db.queries.manager import query_manager

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def get_users(
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Pool = Depends(get_db)
):
    """Get all users."""
    # Convert current_user dict to UserResponse
    current_user_model = UserResponse(**current_user)
    
    # Superusers have all permissions
    if current_user_model.is_superuser:
        user_service = UserService(db)
        users = await user_service.get_all_users()
        return users
    
    # Check if user has permission to view all users
    if not any(
        role.permissions and 'manage_users' in role.permissions 
        for role in current_user_model.roles
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view all users"
        )
    
    user_service = UserService(db)
    users = await user_service.get_all_users()
    return users

@router.get("/me", response_model=UserResponse)
async def get_current_user_endpoint(
    current_user: dict = Depends(get_current_user)
):
    """Get current user endpoint."""
    return UserResponse(**current_user)

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_in: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Pool = Depends(get_db)
):
    """Update current user's profile."""
    user_service = UserService(db)
    
    # Convert current_user dict to UserResponse
    current_user_model = UserResponse(**current_user)
    
    # Check if email is being changed and if it's already taken
    if user_in.email and user_in.email != current_user_model.email:
        existing_user = await user_service.get_user_by_email(user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    updated_user = await user_service.update_user(current_user_model.id, user_in)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return updated_user

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

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
) -> Any:
    """
    Update a user.
    """
    current_user_model = UserResponse(**current_user)
    
    # Check if user has permission to update
    can_update = (
        current_user_model.is_superuser or
        any(role.permissions and "manage_users" in role.permissions for role in current_user_model.roles) or
        current_user_model.id == user_id
    )
    
    if not can_update:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Get user to update
    user = await db.fetchrow(query_manager.get_user_by_id, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user
    update_data = user_in.model_dump(exclude_unset=True)
    updated_user = await db.fetchrow(
        query_manager.update_user,
        user_id,
        update_data.get('email'),
        update_data.get('hashed_password'),
        update_data.get('first_name'),
        update_data.get('last_name'),
        update_data.get('is_active'),
        update_data.get('is_superuser')
    )
    return UserResponse(**dict(updated_user)) 