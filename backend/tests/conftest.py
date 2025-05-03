import pytest
import logging
import asyncio
import os
from typing import AsyncGenerator, Generator
from asyncpg import create_pool, Pool
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.schemas.user import UserCreate, UserResponse
from app.services.users import UserService
from app.db.session import get_db

# Set test environment
os.environ["TESTING"] = "True"
os.environ["JWT_SECRET_KEY"] = "test-secret-key"
os.environ["JWT_REFRESH_SECRET_KEY"] = "test-refresh-secret-key"

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Test database URL
TEST_DATABASE_URL = settings.get_database_url

@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def create_test_database():
    """Create test database and tables."""
    # Connect to default database to create test database
    default_pool = await create_pool(
        settings.get_database_url.replace("/test_db", "/postgres"),
        command_timeout=60
    )
    
    async with default_pool.acquire() as conn:
        # Drop test database if it exists
        await conn.execute("DROP DATABASE IF EXISTS test_db")
        # Create test database
        await conn.execute("CREATE DATABASE test_db")
    
    await default_pool.close()
    
    # Create tables in test database
    test_pool = await create_pool(TEST_DATABASE_URL, command_timeout=60)
    async with test_pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                first_name VARCHAR(255) NOT NULL,
                last_name VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                is_superuser BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
    
    yield
    
    # Cleanup after tests
    async with test_pool.acquire() as conn:
        await conn.execute("DROP TABLE IF EXISTS users")
    
    await test_pool.close()

@pytest.fixture
async def db_pool(create_test_database) -> AsyncGenerator[Pool, None]:
    """Create a fresh database pool for each test."""
    pool = await create_pool(TEST_DATABASE_URL, command_timeout=60)
    yield pool
    # Clean up the users table after each test
    async with pool.acquire() as conn:
        await conn.execute("TRUNCATE TABLE users RESTART IDENTITY CASCADE")
    await pool.close()

@pytest.fixture
async def client(db_pool) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with a fresh database pool."""
    async def get_pool():
        yield db_pool
    
    app.dependency_overrides[get_db] = get_pool
    
    # Create a test client that connects to the test server
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        follow_redirects=True,
        timeout=30.0
    ) as client:
        yield client
    
    app.dependency_overrides.clear()

@pytest.fixture
async def test_user(db_pool) -> dict:
    """Create a test user."""
    user_service = UserService(db_pool)
    user_data = UserCreate(
        email="test@example.com",
        password="TestPass123!@#",
        first_name="Test",
        last_name="User",
        is_active=True,
        is_superuser=False
    )
    user = await user_service.create_user(user_data)
    return user

@pytest.fixture
async def normal_user_token_headers(client: AsyncClient, test_user: dict):
    """Create a test user and return its token headers."""
    login_data = {
        "username": test_user["email"],
        "password": "TestPass123!@#"
    }
    response = await client.post("/api/v1/auth/login", data=login_data)
    tokens = response.json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}

@pytest.fixture
async def superuser_token_headers(db_pool) -> dict:
    """Create a superuser and return their auth headers."""
    user_service = UserService(db_pool)
    user_in = UserCreate(
        email="superuser@example.com",
        password="TestPass123!@#",
        first_name="Super",
        last_name="User",
        is_active=True,
        is_superuser=True
    )
    user = await user_service.create_user(user_in)
    access_token = create_access_token(subject=user["email"])
    return {"Authorization": f"Bearer {access_token}"}
