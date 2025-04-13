from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from models.roles import (
    Role,
    RoleCreate,
    RoleUpdate,
    RoleOut,
    UserWithRoles,
)
from models.permissions import RolePermissions, RolePermissionsUpdate
from repositories.roles import RolesRepository
from repositories.users import UsersRepository
from repositories.permissions import PermissionsRepository
from authenticator import authenticator
from models.users import UserOut
from urllib.parse import unquote
from pydantic import BaseModel

router = APIRouter(prefix="/roles")


class PermissionCheck(BaseModel):
    permission: str


def get_roles_repo():
    return RolesRepository()


def get_permissions_repo():
    return PermissionsRepository()


def get_users_repo():
    return UsersRepository()


# Permission-related endpoints
@router.get("/permissions", response_model=List[str])
async def get_all_permissions(
    current_user: dict = Depends(authenticator.get_current_account_data),
    permissions_repo: PermissionsRepository = Depends(get_permissions_repo),
):
    """Get all available permissions in the system."""
    if not permissions_repo.has_permission(current_user["user_id"], "manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with manage_roles permission can view permissions",
        )
    return permissions_repo.get_all_permissions()


@router.get("/{role_id}/permissions", response_model=RolePermissions)
async def get_role_permissions(
    role_id: int,
    current_user: dict = Depends(authenticator.get_current_account_data),
    permissions_repo: PermissionsRepository = Depends(get_permissions_repo),
):
    """Get permissions for a specific role."""
    if not permissions_repo.has_permission(current_user["user_id"], "manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with manage_roles permission can view role permissions",
        )
    permissions = permissions_repo.get_role_permissions(role_id)
    return RolePermissions(role_id=role_id, permissions=permissions)


@router.put("/{role_id}/permissions")
async def update_role_permissions(
    role_id: int,
    permissions: RolePermissionsUpdate,
    current_user: dict = Depends(authenticator.get_current_account_data),
    permissions_repo: PermissionsRepository = Depends(get_permissions_repo),
):
    """Update permissions for a role."""
    if not permissions_repo.has_permission(current_user["user_id"], "manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with manage_roles permission can update role permissions",
        )
    if not permissions_repo.update_role_permissions(role_id, permissions.permissions):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )
    return {"message": "Role permissions updated successfully"}


@router.post("/check-permission")
async def check_permission(
    permission_check: PermissionCheck,
    current_user: dict = Depends(authenticator.get_current_account_data),
    permissions_repo: PermissionsRepository = Depends(get_permissions_repo),
):
    """Check if the current user has a specific permission."""
    has_permission = permissions_repo.has_permission(
        current_user["user_id"], permission_check.permission
    )
    return {"has_permission": has_permission}


@router.get("/", response_model=List[RoleOut])
async def get_all_roles(
    current_user: dict = Depends(authenticator.get_current_account_data),
    roles_repo: RolesRepository = Depends(get_roles_repo),
    permissions_repo: PermissionsRepository = Depends(get_permissions_repo),
):
    """Get all roles."""
    if not permissions_repo.has_permission(current_user["user_id"], "manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with manage_roles permission can view roles",
        )
    roles = roles_repo.get_all_roles()
    # Add permissions to each role
    for role in roles:
        role.permissions = permissions_repo.get_role_permissions(role.role_id)
    return roles


@router.get("/{role_id}", response_model=RoleOut)
async def get_role(
    role_id: int,
    current_user: UserOut = Depends(authenticator.get_current_account_data),
    roles_repo: RolesRepository = Depends(get_roles_repo),
    permissions_repo: PermissionsRepository = Depends(get_permissions_repo),
):
    """Get a specific role by ID."""
    if not permissions_repo.has_permission(current_user["user_id"], "manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with manage_roles permission can view roles",
        )
    role = roles_repo.get_role_by_id(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )
    # Add permissions to the role
    role.permissions = permissions_repo.get_role_permissions(role.role_id)
    return role


@router.post("/", response_model=RoleOut)
async def create_role(
    role: RoleCreate,
    current_user: UserOut = Depends(authenticator.get_current_account_data),
    roles_repo: RolesRepository = Depends(get_roles_repo),
    permissions_repo: PermissionsRepository = Depends(get_permissions_repo),
):
    """Create a new role."""
    if not permissions_repo.has_permission(current_user["user_id"], "manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with manage_roles permission can create roles",
        )
    existing_role = roles_repo.get_role(role.name)
    if existing_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{role.name}' already exists",
        )

    new_role = roles_repo.create_role(role)
    if not new_role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create role",
        )
    return new_role


@router.put("/{role_id}", response_model=RoleOut)
async def update_role(
    role_id: int,
    role: RoleUpdate,
    current_user: UserOut = Depends(authenticator.get_current_account_data),
    roles_repo: RolesRepository = Depends(get_roles_repo),
    permissions_repo: PermissionsRepository = Depends(get_permissions_repo),
):
    """Update a role."""
    if not permissions_repo.has_permission(current_user["user_id"], "manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with manage_roles permission can update roles",
        )
    existing_role = roles_repo.get_role_by_id(role_id)
    if not existing_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {role_id} not found",
        )

    # Check if it's the admin role and prevent name change
    if existing_role.name.lower() == "admin":
        if role.name.lower() != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot change admin role name",
            )

    # Check if new name already exists (if name is being changed)
    if role.name != existing_role.name:
        name_check = roles_repo.get_role(role.name)
        if name_check:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role name '{role.name}' already exists",
            )

    # Update the role
    updated_role = roles_repo.update_role(role_id, role)
    if not updated_role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update role",
        )
    return updated_role


@router.delete("/{role_id}")
async def delete_role(
    role_id: int,
    current_user: UserOut = Depends(authenticator.get_current_account_data),
    roles_repo: RolesRepository = Depends(get_roles_repo),
    permissions_repo: PermissionsRepository = Depends(get_permissions_repo),
):
    """Delete a role."""
    if not permissions_repo.has_permission(current_user["user_id"], "manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with manage_roles permission can delete roles",
        )
    if not roles_repo.delete_role(role_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )
    return {"message": "Role deleted successfully"}


@router.post("/{user_id}/{role_id}", response_model=UserWithRoles)
async def assign_role(
    user_id: int,
    role_id: int,
    roles_repo: RolesRepository = Depends(get_roles_repo),
    users_repo: UsersRepository = Depends(get_users_repo),
    permissions_repo: PermissionsRepository = Depends(get_permissions_repo),
    current_user: dict = Depends(authenticator.get_current_account_data),
):
    """Assign a role to a user."""
    if not permissions_repo.has_permission(current_user["user_id"], "manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with manage_roles permission can assign roles",
        )

    # Get the role by ID
    role = roles_repo.get_role_by_id(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {role_id} not found",
        )

    # Get the user
    user = users_repo.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    # Assign the role
    if not roles_repo.assign_role(user_id, role_id):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign role",
        )

    # Return updated user with roles
    return roles_repo.get_user_with_roles(user)


@router.delete("/{user_id}/{role_id}", response_model=UserWithRoles)
async def remove_role(
    user_id: int,
    role_id: int,
    roles_repo: RolesRepository = Depends(get_roles_repo),
    users_repo: UsersRepository = Depends(get_users_repo),
    permissions_repo: PermissionsRepository = Depends(get_permissions_repo),
    current_user: dict = Depends(authenticator.get_current_account_data),
):
    """Remove a role from a user."""
    if not permissions_repo.has_permission(current_user["user_id"], "manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with manage_roles permission can remove roles",
        )

    # Get the role by ID
    role = roles_repo.get_role_by_id(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {role_id} not found",
        )

    # Get the user
    user = users_repo.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    # Remove the role
    if not roles_repo.remove_role(user_id, role_id):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove role",
        )

    # Return updated user with roles
    return roles_repo.get_user_with_roles(user)


@router.get("/{user_id}", response_model=UserWithRoles)
async def get_user_roles(
    user_id: int,
    roles_repo: RolesRepository = Depends(get_roles_repo),
    users_repo: UsersRepository = Depends(get_users_repo),
    permissions_repo: PermissionsRepository = Depends(get_permissions_repo),
    current_user: dict = Depends(authenticator.get_current_account_data),
):
    """Get all roles for a user"""
    if not permissions_repo.has_permission(current_user["user_id"], "manage_roles"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with manage_roles permission can view user roles",
        )

    user = users_repo.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    return roles_repo.get_user_with_roles(user)
