import pytest
from sqlalchemy.orm import Session
from app.main import app
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.core.security import get_password_hash


@pytest.mark.asyncio
async def test_register_user(client, db):
    # Print current database URL to verify we're using test_db
    print(f"\nCurrent database URL: {settings.get_database_url}")

    response = await client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": "test@example.com",
            "password": "TestPass123!@#",
            "password_confirm": "TestPass123!@#",
            "first_name": "Test",
            "last_name": "User",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["first_name"] == "Test"
    assert data["last_name"] == "User"
    assert "id" in data


@pytest.mark.asyncio
async def test_register_weak_password(client, db):
    response = await client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": "test2@example.com",
            "password": "weakpass",
            "password_confirm": "weakpass",
            "first_name": "Test",
            "last_name": "User",
        },
    )
    assert response.status_code == 422
    assert "Password must be at least 12 characters long" in response.text


@pytest.mark.asyncio
async def test_register_password_mismatch(client, db):
    response = await client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": "test3@example.com",
            "password": "TestPass123!@#",
            "password_confirm": "DifferentPass123!@#",
            "first_name": "Test",
            "last_name": "User",
        },
    )
    assert response.status_code == 422
    assert "Passwords do not match" in response.text


@pytest.mark.asyncio
async def test_register_existing_user(client, db):
    # Create a user first
    user = User(
        email="existing@example.com",
        hashed_password=get_password_hash("TestPass123!@#"),
        first_name="Existing",
        last_name="User",
    )
    db.add(user)
    db.commit()

    response = await client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": "existing@example.com",
            "password": "TestPass123!@#",
            "password_confirm": "TestPass123!@#",
            "first_name": "New",
            "last_name": "User",
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


@pytest.mark.asyncio
async def test_login_success(client, db):
    # Create a user first
    user = User(
        email="login@example.com",
        hashed_password=get_password_hash("TestPass123!@#"),
        first_name="Login",
        last_name="User",
    )
    db.add(user)
    db.commit()

    response = await client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": "login@example.com", "password": "TestPass123!@#"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client, db):
    response = await client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": "login@example.com", "password": "WrongPass123!@#"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


@pytest.mark.asyncio
async def test_refresh_token(client, db):
    # Create a user first
    user = User(
        email="refresh_token_test@example.com",
        hashed_password=get_password_hash("TestPass123!@#"),
        first_name="Refresh",
        last_name="User",
    )
    db.add(user)
    db.commit()

    # First login to get tokens
    login_response = await client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={
            "username": "refresh_token_test@example.com",
            "password": "TestPass123!@#",
        },
    )
    assert login_response.status_code == 200
    refresh_token = login_response.json()["refresh_token"]

    # Use refresh token to get new access token
    response = await client.post(
        f"{settings.API_V1_STR}/auth/refresh-token",
        headers={"Authorization": f"Bearer {refresh_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
