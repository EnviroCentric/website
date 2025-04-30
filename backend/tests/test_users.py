import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, PasswordUpdate


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
async def test_check_email_exists_false(client):
    # Check non-existent email
    response = await client.get("/api/v1/users/check-email/" "nonexistent@example.com")
    assert response.status_code == 200
    data = response.json()
    assert data["exists"] is False


@pytest.mark.asyncio
async def test_check_email_exists_invalid_email(client):
    # Check invalid email format
    response = await client.get("/api/v1/users/check-email/invalid-email")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_current_user(client, db):
    # Create a user first
    user = User(
        email="update_user_test@example.com",
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
            "username": "update_user_test@example.com",
            "password": "TestPass123!@#",
        },
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]

    # Update user info
    update_data = {
        "first_name": "Updated",
        "last_name": "Name",
    }
    response = await client.put(
        "/api/v1/users/self",
        json=update_data,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Updated"
    assert data["last_name"] == "Name"

    # Verify the update persisted
    get_response = await client.get(
        "/api/v1/users/self",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert get_response.status_code == 200
    get_data = get_response.json()
    assert get_data["first_name"] == "Updated"
    assert get_data["last_name"] == "Name"


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
