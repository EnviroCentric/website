import pytest
import logging
from httpx import AsyncClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import get_db
from app.db.base_class import Base
from app.core.security import create_access_token
from app.models.user import User
from app.models.role import Role
import os

# Set test environment
os.environ["TESTING"] = "True"

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Use a separate test database URL
TEST_DATABASE_URL = "postgresql://temp:temp@db:5432/test_db"


@pytest.fixture(scope="function")
async def db():
    """Create a fresh database for each test."""
    # Create test database
    engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Create test database if it doesn't exist
    root_engine = create_engine("postgresql://temp:temp@db:5432/postgres")
    with root_engine.connect() as conn:
        # Terminate existing connections to test_db
        conn.execute(
            text(
                """
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = 'test_db'
            AND pid <> pg_backend_pid()
        """
            )
        )
        conn.execute(text("COMMIT"))

        logger.info("Creating test database...")
        conn.execute(text("DROP DATABASE IF EXISTS test_db"))
        conn.execute(text("COMMIT"))
        conn.execute(text("CREATE DATABASE test_db"))
    root_engine.dispose()

    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Create session
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    # Cleanup
    session.close()
    transaction.rollback()
    connection.close()
    engine.dispose()

    # Drop test database
    with root_engine.connect() as conn:
        conn.execute(text("COMMIT"))
        conn.execute(text("DROP DATABASE IF EXISTS test_db"))
    root_engine.dispose()


@pytest.fixture(scope="function")
async def client(db):
    """Create a test client using the test database."""

    async def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def superuser_token_headers(db):
    """Create a superuser and return their auth headers."""
    # Create a superuser role if it doesn't exist
    superuser_role = db.query(Role).filter(Role.name == "admin").first()
    if not superuser_role:
        superuser_role = Role(name="admin")
        db.add(superuser_role)
        db.commit()

    # Create a superuser
    user = User(
        email="superuser@example.com",
        hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # "password"
        first_name="Super",
        last_name="User",
        is_superuser=True,
    )
    user.roles.append(superuser_role)
    db.add(user)
    db.commit()

    # Create access token
    access_token = create_access_token(subject=user.email)
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture(scope="function")
async def normal_user_token_headers(db):
    """Create a normal user and return their auth headers."""
    # Create a user role if it doesn't exist
    user_role = db.query(Role).filter(Role.name == "user").first()
    if not user_role:
        user_role = Role(name="user")
        db.add(user_role)
        db.commit()

    # Create a normal user
    user = User(
        email="user@example.com",
        hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # "password"
        first_name="Normal",
        last_name="User",
        is_superuser=False,
    )
    user.roles.append(user_role)
    db.add(user)
    db.commit()

    # Create access token
    access_token = create_access_token(subject=user.email)
    return {"Authorization": f"Bearer {access_token}"}
