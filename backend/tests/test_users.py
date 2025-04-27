import pytest
from app.core.security import get_password_hash
from app.models.user import User


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
