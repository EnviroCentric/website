from typing import Optional, List, Dict
from asyncpg import Pool
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserInDB
from app.core.security import get_password_hash
from app.db.queries.manager import query_manager
import asyncpg

class UserService:
    def __init__(self, pool: Pool):
        self.pool = pool

    async def get_user_by_id(self, user_id: int) -> Optional[UserResponse]:
        """Get a user by their ID."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                query_manager.get_user_by_id,
                user_id
            )
            return UserResponse(**dict(row)) if row else None

    async def create_user(self, user_in: UserCreate) -> UserResponse:
        """Create a new user."""
        hashed_password = get_password_hash(user_in.password)
        async with self.pool.acquire() as conn:
            user_id = await conn.fetchval(
                query_manager.create_user,
                user_in.email,
                hashed_password,
                user_in.first_name,
                user_in.last_name,
                True,  # is_active
                False  # is_superuser
            )
            user = await self.get_user_by_id(user_id)
            if not user:
                raise ValueError("Failed to create user")
            return user

    async def get_user_by_email(self, email: str) -> Optional[UserInDB]:
        """Get a user by email."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                query_manager.get_user_by_email,
                email
            )
            return UserInDB(**dict(row)) if row else None

    async def update_user(self, user_id: int, user_in: UserUpdate) -> Optional[UserResponse]:
        """Update a user's information."""
        # Convert UserUpdate to dict and filter out None values
        update_data = user_in.model_dump(exclude_unset=True)
        
        # Handle password hashing if it's being updated
        if 'password' in update_data:
            update_data['hashed_password'] = get_password_hash(update_data.pop('password'))
        
        # Get current user to ensure we have all fields
        current_user = await self.get_user_by_id(user_id)
        if not current_user:
            return None

        # Prepare parameters for the update query
        params = [
            user_id,  # $1
            update_data.get('email', None),  # $2
            update_data.get('hashed_password', None),  # $3
            update_data.get('first_name', None),  # $4
            update_data.get('last_name', None),  # $5
            current_user.is_active,  # $6
            current_user.is_superuser,  # $7
        ]

        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                query_manager.update_user,
                *params
            )
            return UserResponse(**dict(row)) if row else None

    async def create_superuser(self, user_in: UserCreate) -> UserResponse:
        """Create a new superuser."""
        hashed_password = get_password_hash(user_in.password)
        async with self.pool.acquire() as conn:
            user_id = await conn.fetchval(
                query_manager.create_user,
                user_in.email,
                hashed_password,
                user_in.first_name,
                user_in.last_name,
                True,   # is_active
                True    # is_superuser
            )
            user = await self.get_user_by_id(user_id)
            if not user:
                raise ValueError("Failed to create superuser")
            return user

    async def get_all_users(self) -> List[UserResponse]:
        """Get all users."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query_manager.get_all_users)
            return [UserResponse(**dict(row)) for row in rows] 