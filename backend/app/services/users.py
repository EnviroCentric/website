from typing import Optional, List
from asyncpg import Pool
from app.schemas.user import UserCreate, UserUpdate, UserResponse as User
from app.core.security import get_password_hash
from app.db.queries.manager import query_manager

class UserService:
    def __init__(self, pool: Pool):
        self.pool = pool

    async def get_user_by_id(self, user_id: int) -> Optional[dict]:
        """Get a user by their ID."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                query_manager.get_user_by_id,
                user_id
            )
            return dict(row) if row else None

    async def create_user(self, user_in: UserCreate) -> dict:
        """Create a new user."""
        hashed_password = get_password_hash(user_in.password)
        async with self.pool.acquire() as conn:
            user_id = await conn.fetchval(
                query_manager.create_user,
                user_in.email,
                hashed_password,
                user_in.first_name,
                user_in.last_name,
                user_in.is_active,
                user_in.is_superuser
            )
            return await self.get_user_by_id(user_id)

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get a user by email."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                query_manager.get_user_by_email,
                email
            )
            return dict(row) if row else None 