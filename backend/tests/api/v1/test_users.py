import pytest
from fastapi import status
from httpx import AsyncClient
from app.schemas.user import UserCreate

pytestmark = pytest.mark.asyncio

# Authentication Tests
async def test_get_user_unauthorized(client: AsyncClient):
    """Test getting a user without authentication."""
    response = await client.get("/api/v1/users/1")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

async def test_get_user_authorized(client: AsyncClient, normal_user_token_headers):
    """Test getting a user with authentication."""
    response = await client.get("/api/v1/users/1", headers=normal_user_token_headers)
    assert response.status_code == status.HTTP_200_OK

# Input Validation Tests
async def test_create_user_invalid_email(client: AsyncClient, normal_user_token_headers):
    """Test creating a user with invalid email."""
    user_data = {
        "email": "invalid-email",
        "password": "TestPass123!@#",
        "first_name": "Test",
        "last_name": "User",
        "is_active": True,
        "is_superuser": False
    }
    response = await client.post("/api/v1/users/", json=user_data, headers=normal_user_token_headers)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

async def test_create_user_missing_password(client: AsyncClient, normal_user_token_headers):
    """Test creating a user without password."""
    user_data = {
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User",
        "is_active": True,
        "is_superuser": False
    }
    response = await client.post("/api/v1/users/", json=user_data, headers=normal_user_token_headers)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

# Business Logic Tests
async def test_create_user_success(client: AsyncClient, normal_user_token_headers):
    """Test successful user creation."""
    user_data = {
        "email": "newuser@example.com",
        "password": "TestPass123!@#",
        "first_name": "New",
        "last_name": "User",
        "is_active": True,
        "is_superuser": False
    }
    response = await client.post("/api/v1/users/", json=user_data, headers=normal_user_token_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["first_name"] == user_data["first_name"]
    assert data["last_name"] == user_data["last_name"]
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data
    assert "hashed_password" not in data

async def test_get_user_success(client: AsyncClient, test_user, normal_user_token_headers):
    """Test successful user retrieval."""
    response = await client.get(f"/api/v1/users/{test_user['id']}", headers=normal_user_token_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == test_user["email"]
    assert data["id"] == test_user["id"]
    assert "hashed_password" not in data

async def test_get_nonexistent_user(client: AsyncClient, normal_user_token_headers):
    """Test getting a non-existent user."""
    response = await client.get("/api/v1/users/99999", headers=normal_user_token_headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND

# Edge Cases
async def test_create_duplicate_user(client: AsyncClient, test_user, normal_user_token_headers):
    """Test creating a user with existing email."""
    user_data = {
        "email": test_user["email"],
        "password": "TestPass123!@#",
        "first_name": "Duplicate",
        "last_name": "User",
        "is_active": True,
        "is_superuser": False
    }
    response = await client.post("/api/v1/users/", json=user_data, headers=normal_user_token_headers)
    assert response.status_code == status.HTTP_400_BAD_REQUEST

async def test_create_user_with_long_password(client: AsyncClient, normal_user_token_headers):
    """Test creating a user with very long password."""
    user_data = {
        "email": "longpass@example.com",
        "password": "a" * 1000,  # Very long password
        "first_name": "Long",
        "last_name": "Password",
        "is_active": True,
        "is_superuser": False
    }
    response = await client.post("/api/v1/users/", json=user_data, headers=normal_user_token_headers)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY 