from typing import Dict
from httpx import AsyncClient
from sqlalchemy.orm import Session
from app.models.role import Role
from app.models.permission import Permission
import pytest


async def test_get_roles(
    client: AsyncClient, superuser_token_headers: Dict[str, str], db: Session
) -> None:
    """Test getting all roles (except admin)."""
    # Create some test roles
    role1 = Role(name="test_role1")
    role2 = Role(name="test_role2")
    db.add_all([role1, role2])
    db.commit()

    response = await client.get("/api/v1/roles/", headers=superuser_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2  # Should include our test roles
    assert all(role["name"] != "admin" for role in data)


async def test_get_roles_unauthorized(
    client: AsyncClient, normal_user_token_headers: Dict[str, str]
) -> None:
    """Test that non-superusers cannot get roles."""
    response = await client.get("/api/v1/roles/", headers=normal_user_token_headers)
    assert response.status_code == 403


async def test_get_permissions(
    client: AsyncClient, superuser_token_headers: Dict[str, str], db: Session
) -> None:
    """Test getting all permissions."""
    # Create some test permissions
    perm1 = Permission(name="test_perm1")
    perm2 = Permission(name="test_perm2")
    db.add_all([perm1, perm2])
    db.commit()

    response = await client.get(
        "/api/v1/roles/permissions", headers=superuser_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2  # Should include our test permissions
    assert "test_perm1" in data
    assert "test_perm2" in data


async def test_get_permissions_unauthorized(
    client: AsyncClient, normal_user_token_headers: Dict[str, str]
) -> None:
    """Test that non-superusers cannot get permissions."""
    response = await client.get(
        "/api/v1/roles/permissions", headers=normal_user_token_headers
    )
    assert response.status_code == 403


async def test_get_role_permissions(
    client: AsyncClient, superuser_token_headers: Dict[str, str], db: Session
) -> None:
    """Test getting permissions for a specific role."""
    # Create a role with permissions
    role = Role(name="test_role")
    perm1 = Permission(name="test_perm1")
    perm2 = Permission(name="test_perm2")
    role.permissions = [perm1, perm2]
    db.add(role)
    db.commit()

    response = await client.get(
        f"/api/v1/roles/{role.id}/permissions", headers=superuser_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    assert "test_perm1" in data
    assert "test_perm2" in data


async def test_get_role_permissions_not_found(
    client: AsyncClient, superuser_token_headers: Dict[str, str]
) -> None:
    """Test getting permissions for a non-existent role."""
    response = await client.get(
        "/api/v1/roles/999/permissions", headers=superuser_token_headers
    )
    assert response.status_code == 404


async def test_update_role_permissions(
    client: AsyncClient, superuser_token_headers: Dict[str, str], db: Session
) -> None:
    """Test updating permissions for a role."""
    # Create a role and some permissions
    role = Role(name="test_role")
    perm1 = Permission(name="test_perm1")
    perm2 = Permission(name="test_perm2")
    perm3 = Permission(name="test_perm3")
    db.add_all([role, perm1, perm2, perm3])
    db.commit()

    # Update the role's permissions
    new_permissions = ["test_perm1", "test_perm3"]
    response = await client.put(
        f"/api/v1/roles/{role.id}/permissions",
        headers=superuser_token_headers,
        json={"permissions": new_permissions},
    )
    assert response.status_code == 200

    # Verify the update
    updated_role = db.query(Role).filter(Role.id == role.id).first()
    assert len(updated_role.permissions) == 2
    assert all(perm.name in new_permissions for perm in updated_role.permissions)


async def test_update_role_permissions_invalid_permissions(
    client: AsyncClient, superuser_token_headers: Dict[str, str], db: Session
) -> None:
    """Test updating permissions with invalid permission names."""
    role = Role(name="test_role")
    db.add(role)
    db.commit()

    # Try to update with non-existent permissions
    response = await client.put(
        f"/api/v1/roles/{role.id}/permissions",
        headers=superuser_token_headers,
        json={"permissions": ["non_existent_perm"]},
    )
    assert (
        response.status_code == 200
    )  # Should still succeed, just ignore invalid permissions


async def test_update_role_permissions_not_found(
    client: AsyncClient, superuser_token_headers: Dict[str, str]
) -> None:
    """Test updating permissions for a non-existent role."""
    response = await client.put(
        "/api/v1/roles/999/permissions",
        headers=superuser_token_headers,
        json={"permissions": ["test_perm1"]},
    )
    assert response.status_code == 404


async def test_update_role_permissions_unauthorized(
    client: AsyncClient, normal_user_token_headers: Dict[str, str], db: Session
) -> None:
    """Test that non-superusers cannot update role permissions."""
    role = Role(name="test_role")
    db.add(role)
    db.commit()

    response = await client.put(
        f"/api/v1/roles/{role.id}/permissions",
        headers=normal_user_token_headers,
        json={"permissions": ["test_perm1"]},
    )
    assert response.status_code == 403


async def test_create_role_duplicate_name(
    client: AsyncClient, superuser_token_headers: Dict[str, str], db: Session
) -> None:
    """Test creating a role with a duplicate name."""
    # Create initial role
    role = Role(name="duplicate_role")
    db.add(role)
    db.commit()

    # Try to create another role with the same name
    response = await client.post(
        "/api/v1/roles/",
        headers=superuser_token_headers,
        json={"name": "duplicate_role", "description": "This should fail"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Role with this name already exists"


async def test_update_role(
    client: AsyncClient, superuser_token_headers: Dict[str, str], db: Session
) -> None:
    """Test updating a role's name and description."""
    # Create initial role
    role = Role(name="original_role", description="Original description")
    db.add(role)
    db.commit()

    # Update the role
    update_data = {
        "name": "updated_role",
        "description": "Updated description",
    }
    response = await client.put(
        f"/api/v1/roles/{role.id}",
        headers=superuser_token_headers,
        json=update_data,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "updated_role"
    assert data["description"] == "Updated description"

    # Verify the update in database
    updated_role = db.query(Role).filter(Role.id == role.id).first()
    assert updated_role.name == "updated_role"
    assert updated_role.description == "Updated description"


async def test_update_role_not_found(
    client: AsyncClient, superuser_token_headers: Dict[str, str]
) -> None:
    """Test updating a non-existent role."""
    response = await client.put(
        "/api/v1/roles/999",
        headers=superuser_token_headers,
        json={"name": "new_name", "description": "New description"},
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Role not found"


async def test_update_role_duplicate_name(
    client: AsyncClient, superuser_token_headers: Dict[str, str], db: Session
) -> None:
    """Test updating a role with a name that conflicts with another role."""
    # Create two roles
    role1 = Role(name="role1")
    role2 = Role(name="role2")
    db.add_all([role1, role2])
    db.commit()

    # Try to update role1 with role2's name
    response = await client.put(
        f"/api/v1/roles/{role1.id}",
        headers=superuser_token_headers,
        json={"name": "role2", "description": "Should fail"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Role with this name already exists"


async def test_delete_role(
    client: AsyncClient, superuser_token_headers: Dict[str, str], db: Session
) -> None:
    """Test deleting a role."""
    # Create a role
    role = Role(name="role_to_delete")
    db.add(role)
    db.commit()

    # Delete the role
    response = await client.delete(
        f"/api/v1/roles/{role.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Role deleted successfully"

    # Verify the role is deleted
    deleted_role = db.query(Role).filter(Role.id == role.id).first()
    assert deleted_role is None


async def test_delete_role_not_found(
    client: AsyncClient, superuser_token_headers: Dict[str, str]
) -> None:
    """Test deleting a non-existent role."""
    response = await client.delete(
        "/api/v1/roles/999",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Role not found"


async def test_delete_role_with_users(
    client: AsyncClient, superuser_token_headers: Dict[str, str], db: Session
) -> None:
    """Test deleting a role that is assigned to users."""
    from app.models.user import User
    from app.core.security import get_password_hash

    # Create a role and a user with that role
    role = Role(name="role_with_user")
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("TestPass123!@#"),
        first_name="Test",
        last_name="User",
    )
    user.roles.append(role)
    db.add_all([role, user])
    db.commit()

    # Try to delete the role
    response = await client.delete(
        f"/api/v1/roles/{role.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot delete role that is assigned to users"


async def test_delete_role_unauthorized(
    client: AsyncClient, normal_user_token_headers: Dict[str, str], db: Session
) -> None:
    """Test that non-superusers cannot delete roles."""
    # Create a role
    role = Role(name="role_to_delete")
    db.add(role)
    db.commit()

    # Try to delete the role as a normal user
    response = await client.delete(
        f"/api/v1/roles/{role.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Only superusers can delete roles"


@pytest.mark.asyncio
async def test_initialize_core_permissions(
    client: AsyncClient, superuser_token_headers: Dict[str, str], db: Session
) -> None:
    """Test initializing core system permissions."""
    # First call should create the permissions
    response = await client.post(
        "/api/v1/roles/init-permissions",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "manage_roles" in data["created"]
    assert "manage_users" in data["created"]

    # Second call should find existing permissions
    response = await client.post(
        "/api/v1/roles/init-permissions",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "manage_roles" in data["existing"]
    assert "manage_users" in data["existing"]


@pytest.mark.asyncio
async def test_initialize_core_permissions_unauthorized(client, test_user):
    """Test that non-superusers cannot initialize permissions."""
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

    # Try to initialize permissions
    response = await client.post(
        "/api/v1/roles/init-permissions",
        headers=headers,
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Only superusers can initialize permissions"
