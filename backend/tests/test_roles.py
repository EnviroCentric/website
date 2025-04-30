from typing import Dict
from httpx import AsyncClient
from sqlalchemy.orm import Session
from app.models.role import Role
from app.models.permission import Permission


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
