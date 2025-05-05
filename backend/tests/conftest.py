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
        # Create users table
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
        
        # Create roles table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                level INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create permissions table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS permissions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create role_permissions table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
                permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
                PRIMARY KEY (role_id, permission_id)
            )
        """)
        
        # Create user_roles table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_roles (
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, role_id)
            )
        """)

        # Create user_roles_with_permissions view
        await conn.execute("""
            CREATE OR REPLACE VIEW user_roles_with_permissions AS
            SELECT 
                ur.user_id,
                r.id,
                r.name,
                r.description,
                r.level,
                r.created_at,
                COALESCE(array_agg(p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL), '{}') AS permissions
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            LEFT JOIN permissions p ON rp.permission_id = p.id
            GROUP BY ur.user_id, r.id, r.name, r.description, r.level, r.created_at
        """)
        
        # Insert default roles
        await conn.execute("""
            INSERT INTO roles (name, description, level)
            VALUES
                ('admin', 'Administrator with full system access', 100),
                ('manager', 'Manager with elevated access', 90),
                ('supervisor', 'Supervisor with team management access', 80)
            ON CONFLICT (name) DO UPDATE SET level = EXCLUDED.level
        """)
        
        # Insert manage_users permission
        await conn.execute("""
            INSERT INTO permissions (name, description)
            VALUES ('manage_users', 'Permission to manage user accounts and access')
            ON CONFLICT (name) DO NOTHING
        """)
        
        # Assign manage_users permission to manager and supervisor
        await conn.execute("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM roles r, permissions p
            WHERE r.name IN ('manager', 'supervisor') AND p.name = 'manage_users'
            ON CONFLICT DO NOTHING
        """)
        # Assign all permissions to admin
        await conn.execute("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM roles r, permissions p
            WHERE r.name = 'admin'
            ON CONFLICT DO NOTHING
        """)
    
    yield
    
    # Cleanup after tests
    async with test_pool.acquire() as conn:
        await conn.execute("DROP VIEW IF EXISTS user_roles_with_permissions")
        await conn.execute("DROP TABLE IF EXISTS role_permissions")
        await conn.execute("DROP TABLE IF EXISTS user_roles")
        await conn.execute("DROP TABLE IF EXISTS permissions")
        await conn.execute("DROP TABLE IF EXISTS roles")
        await conn.execute("DROP TABLE IF EXISTS users")
    
    await test_pool.close()

@pytest.fixture
async def db_pool(create_test_database) -> AsyncGenerator[Pool, None]:
    """Create a fresh database pool for each test."""
    pool = await create_pool(TEST_DATABASE_URL, command_timeout=60)
    yield pool
    # Clean up the tables after each test
    async with pool.acquire() as conn:
        await conn.execute("DROP VIEW IF EXISTS user_roles_with_permissions")
        await conn.execute("TRUNCATE TABLE user_roles RESTART IDENTITY CASCADE")
        await conn.execute("TRUNCATE TABLE role_permissions RESTART IDENTITY CASCADE")
        await conn.execute("TRUNCATE TABLE permissions RESTART IDENTITY CASCADE")
        await conn.execute("TRUNCATE TABLE roles RESTART IDENTITY CASCADE")
        await conn.execute("TRUNCATE TABLE users RESTART IDENTITY CASCADE")
        
        # Re-create the view
        await conn.execute("""
            CREATE OR REPLACE VIEW user_roles_with_permissions AS
            SELECT 
                ur.user_id,
                r.id,
                r.name,
                r.description,
                r.level,
                r.created_at,
                COALESCE(array_agg(p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL), '{}') AS permissions
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            LEFT JOIN permissions p ON rp.permission_id = p.id
            GROUP BY ur.user_id, r.id, r.name, r.description, r.level, r.created_at
        """)
        
        # Re-insert default roles, permissions, and assignments after truncation
        await conn.execute("""
            INSERT INTO roles (name, description, level)
            VALUES
                ('admin', 'Administrator with full system access', 100),
                ('manager', 'Manager with elevated access', 90),
                ('supervisor', 'Supervisor with team management access', 80)
            ON CONFLICT (name) DO UPDATE SET level = EXCLUDED.level
        """)
        await conn.execute("""
            INSERT INTO permissions (name, description)
            VALUES ('manage_users', 'Permission to manage user accounts and access')
            ON CONFLICT (name) DO NOTHING
        """)
        await conn.execute("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM roles r, permissions p
            WHERE r.name IN ('manager', 'supervisor') AND p.name = 'manage_users'
            ON CONFLICT DO NOTHING
        """)
        await conn.execute("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM roles r, permissions p
            WHERE r.name = 'admin'
            ON CONFLICT DO NOTHING
        """)
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
async def test_user(db_pool) -> UserResponse:
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
async def normal_user_token_headers(client: AsyncClient, test_user: UserResponse):
    """Create a test user and return its token headers."""
    login_data = {
        "username": test_user.email,
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
    user = await user_service.create_superuser(user_in)
    access_token = create_access_token(
        subject=user.email,
        additional_claims={"is_superuser": True}
    )
    return {"Authorization": f"Bearer {access_token}"}

@pytest.fixture
async def admin_token_headers(db_pool):
    """Create headers with an admin user token (has manage_users permission)."""
    user_service = UserService(db_pool)
    user_data = UserCreate(
        email="admin@example.com",
        password="AdminPass123!@#",
        first_name="Admin",
        last_name="User",
        is_active=True,
        is_superuser=False
    )
    user = await user_service.create_user(user_data)
    async with db_pool.acquire() as conn:
        # Get admin role id
        admin_role = await conn.fetchrow("SELECT id, name FROM roles WHERE name = 'admin'")
        if admin_role is None:
            raise RuntimeError("Admin role not found in test database. Check test DB setup.")
        # Assign admin role to user
        await conn.execute(
            """
            INSERT INTO user_roles (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, role_id) DO NOTHING
            """,
            user.id, admin_role['id']
        )
        # Debug: check user_roles assignment
        user_roles = await conn.fetch("SELECT * FROM user_roles WHERE user_id = $1", user.id)
        print(f"[DEBUG] user_roles for admin user: {user_roles}")
    access_token = create_access_token(
        subject=user.email,
        additional_claims={
            "is_superuser": False,
            "roles": [{
                "id": admin_role['id'],
                "name": admin_role['name']
            }]
        }
    )
    return {"Authorization": f"Bearer {access_token}"}
