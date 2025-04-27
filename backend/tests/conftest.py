import pytest
import logging
from httpx import AsyncClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import get_db
from app.db.base_class import Base
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
