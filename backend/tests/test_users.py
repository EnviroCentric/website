import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.security import get_password_hash, verify_password
from app.models import User, Role, Permission
from app.schemas.user import UserCreate, PasswordUpdate
from app.schemas.role import RoleCreate, RolePermissionUpdate
from httpx import AsyncClient

from app.core.config import settings


@pytest.mark.asyncio
async def test_get_current_user(client, db):
    # Create a user first
    user = User(
        email="current_user_test@example.com",
        hashed_password=get_password_hash("TestPass123!@#"),
        first_name="Current",
        last_name="User",
    )
    db.add(user)
    db.commit()

    # Login to get token
    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "current_user_test@example.com",
            "password": "TestPass123!@#",
        },
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]

    # Get current user info
    response = await client.get(
        "/api/v1/users/self",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "current_user_test@example.com"
    assert data["first_name"] == "Current"
    assert data["last_name"] == "User"
    assert "id" in data


@pytest.mark.asyncio
async def test_get_current_user_unauthorized(client):
    response = await client.get("/api/v1/users/self")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_check_email_exists_true(client, db):
    # Create a user first
    user = User(
        email="email_check_test@example.com",
        hashed_password=get_password_hash("TestPass123!@#"),
        first_name="Email",
        last_name="Check",
    )
    db.add(user)
    db.commit()

    # Check if email exists
    response = await client.get(
        "/api/v1/users/check-email/" "email_check_test@example.com"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["exists"] is True


@pytest.mark.asyncio
async def test_check_email_exists_false(client, db):
    """Test checking non-existent email."""
    response = await client.get("/api/v1/users/check-email/nonexistent@example.com")
    assert response.status_code == 200
    assert response.json()["exists"] is False


@pytest.mark.asyncio
async def test_check_email_exists_invalid_email(client):
    # Check invalid email format
    response = await client.get("/api/v1/users/check-email/invalid-email")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_current_user(client, db):
    """Test updating current user information."""
    # Create a user
    user_data = {
        "email": "update_user_test@example.com",
        "password": "TestPass123!@#",
        "password_confirm": "TestPass123!@#",
        "first_name": "Test",
        "last_name": "User",
    }
    response = await client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 200

    # Login
    login_data = {
        "username": "update_user_test@example.com",
        "password": "TestPass123!@#",
    }
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]

    # Update user info
    update_data = {
        "first_name": "Updated Name",
        "last_name": "New Name",
    }
    response = await client.put(
        "/api/v1/users/self",
        json=update_data,
        headers={"Authorization": f"Bearer {token}"},
    )
    print("Update response:", response.json())  # Print response for debugging
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Updated Name"
    assert data["last_name"] == "New Name"

    # Verify changes persisted
    response = await client.get(
        "/api/v1/users/self",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Updated Name"
    assert data["last_name"] == "New Name"


@pytest.mark.asyncio
async def test_update_current_user_unauthorized(client):
    update_data = {
        "first_name": "Should",
        "last_name": "Fail",
    }
    response = await client.put(
        "/api/v1/users/self",
        json=update_data,
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_current_user_invalid_data(client, db):
    # Create a user first
    user = User(
        email="invalid_update_test@example.com",
        hashed_password=get_password_hash("TestPass123!@#"),
        first_name="Original",
        last_name="Name",
    )
    db.add(user)
    db.commit()

    # Login to get token
    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "invalid_update_test@example.com",
            "password": "TestPass123!@#",
        },
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]

    # Try to update with invalid email
    update_data = {
        "email": "invalid-email",
    }
    response = await client.put(
        "/api/v1/users/self",
        json=update_data,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 422  # Validation error

    # Try to update with empty first name
    update_data = {
        "first_name": "",
    }
    response = await client.put(
        "/api/v1/users/self",
        json=update_data,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_update_password_success(client, db):
    # Create a user first
    user = User(
        email="password_update_test@example.com",
        hashed_password=get_password_hash("TestPass123!@#"),
        first_name="Password",
        last_name="Update",
    )
    db.add(user)
    db.commit()

    # Login to get token
    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "password_update_test@example.com",
            "password": "TestPass123!@#",
        },
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]

    # Get the current hashed password
    old_hashed_password = user.hashed_password

    # Update the password
    password_update = {
        "current_password": "TestPass123!@#",
        "new_password": "NewPass123!@#",
    }
    response = await client.put(
        "/api/v1/users/self/password",
        json=password_update,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Password updated successfully"

    # Verify the password was updated in the database
    db.refresh(user)
    assert user.hashed_password != old_hashed_password
    assert verify_password("NewPass123!@#", user.hashed_password)


@pytest.mark.asyncio
async def test_update_password_incorrect_current(client, db):
    # Create a user first
    user = User(
        email="password_incorrect_test@example.com",
        hashed_password=get_password_hash("TestPass123!@#"),
        first_name="Password",
        last_name="Incorrect",
    )
    db.add(user)
    db.commit()

    # Login to get token
    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "password_incorrect_test@example.com",
            "password": "TestPass123!@#",
        },
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]

    password_update = {
        "current_password": "WrongPass123!@#",
        "new_password": "NewPass123!@#",
    }
    response = await client.put(
        "/api/v1/users/self/password",
        json=password_update,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"] == "Current password is incorrect"


@pytest.mark.asyncio
async def test_update_password_unauthorized(client):
    password_update = {
        "current_password": "TestPass123!@#",
        "new_password": "NewPass123!@#",
    }
    response = await client.put(
        "/api/v1/users/self/password",
        json=password_update,
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_users(client, test_user, test_superuser, test_db):
    """Test getting all users"""
    # Login as superuser
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": test_superuser.email,
            "password": "testpass123",
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get users
    response = await client.get("/api/v1/users/", headers=headers)
    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 2  # At least test_user and superuser
    assert any(user["email"] == test_user.email for user in users)
    assert any(user["email"] == test_superuser.email for user in users)


@pytest.mark.asyncio
async def test_update_user(client, test_user, test_superuser, test_db):
    """Test updating a user"""
    # Login as superuser
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": test_superuser.email,
            "password": "testpass123",
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Update user
    update_data = {
        "first_name": "Updated Name",
        "last_name": "New Name",
        "is_active": True,
    }
    response = await client.put(
        f"/api/v1/users/{test_user.id}",
        headers=headers,
        json=update_data,
    )
    assert response.status_code == 200
    updated_user = response.json()
    assert updated_user["first_name"] == "Updated Name"
    assert updated_user["last_name"] == "New Name"


@pytest.mark.asyncio
async def test_delete_user(client, db, test_user, test_superuser):
    """Test setting a user as inactive."""
    # Login as superuser
    login_data = {
        "username": test_superuser.email,
        "password": "testpass123",
    }
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]

    # Set user as inactive
    response = await client.delete(
        f"/api/v1/users/{test_user.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "User deactivated successfully"
    assert data["user_id"] == test_user.id

    # Verify user is inactive
    response = await client.get(
        f"/api/v1/users/{test_user.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False

    # Verify user cannot login
    login_data = {
        "username": test_user.email,
        "password": "testpass123",
    }
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 400
    assert response.json()["detail"] == "Inactive user"


@pytest.mark.asyncio
async def test_update_user_roles(client, db, test_user, test_superuser):
    """Test updating user roles."""
    # Login as superuser
    login_data = {
        "username": test_superuser.email,
        "password": "testpass123",
    }
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]

    # Create a role
    role_data = {
        "name": "test_role",
        "description": "Test role",
        "permissions": ["manage_users"],
    }
    response = await client.post(
        "/api/v1/roles/",
        json=role_data,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    role_id = response.json()["role_id"]

    # Update user roles
    role_update = {
        "role_ids": [role_id],
    }
    response = await client.put(
        f"/api/v1/users/{test_user.id}/roles",
        json=role_update,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "User roles updated successfully"

    # Verify role update
    response = await client.get(
        f"/api/v1/users/{test_user.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    user_data = response.json()
    assert len(user_data["roles"]) == 1
    assert user_data["roles"][0]["name"] == "test_role"


@pytest.mark.asyncio
async def test_unauthorized_access(client, test_user, test_db):
    """Test unauthorized access to user management endpoints"""
    # Login as regular user
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": test_user.email,
            "password": "testpass123",
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Try to get all users
    response = await client.get("/api/v1/users/", headers=headers)
    assert response.status_code == 403

    # Try to update a user
    response = await client.put(
        f"/api/v1/users/{test_user.id}",
        headers=headers,
        json={"first_name": "Updated Name", "last_name": "New Name"},
    )
    assert response.status_code == 403

    # Try to delete a user
    response = await client.delete(
        f"/api/v1/users/{test_user.id}",
        headers=headers,
    )
    assert response.status_code == 403

    # Try to update user roles
    response = await client.put(
        f"/api/v1/users/{test_user.id}/roles",
        headers=headers,
        json={"role_ids": []},
    )
    assert response.status_code == 403
