from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from models.roles import Role, RoleCreate, UserWithRoles, SecurityLevelConfig
from repositories.roles import RolesRepository
from repositories.users import UsersRepository
from authenticator import authenticator

router = APIRouter()


def get_roles_repo():
    return RolesRepository()


def get_users_repo():
    return UsersRepository()


def require_admin():
    """Require the user to have the admin role (security level 10)"""

    async def check_admin(
        user_data: dict = Depends(authenticator.get_current_account_data),
    ):
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            )

        roles_repo = RolesRepository()
        user_level = roles_repo.get_user_max_security_level(user_data["user_id"])
        if user_level < 10:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin role (security level 10) required",
            )
        return user_data

    return check_admin


def require_security_level(min_level: int):
    """Require the user to have at least the specified security level"""

    async def check_security_level(
        user_data: dict = Depends(authenticator.get_current_account_data),
    ):
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            )

        roles_repo = RolesRepository()
        user_level = roles_repo.get_user_max_security_level(user_data["user_id"])
        if user_level < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Security level {min_level} required",
            )
        return user_data

    return check_security_level


@router.get("/security-levels", response_model=SecurityLevelConfig)
async def get_security_levels(
    roles_repo: RolesRepository = Depends(get_roles_repo),
    _: dict = Depends(require_admin()),
):
    """Get current security level configuration (admin only)"""
    return roles_repo.get_security_levels()


@router.put("/security-levels", response_model=SecurityLevelConfig)
async def update_security_levels(
    config: SecurityLevelConfig,
    roles_repo: RolesRepository = Depends(get_roles_repo),
    _: dict = Depends(require_admin()),
):
    """Update security level configuration (admin only)"""
    return roles_repo.update_security_levels(config)


@router.post("/roles", response_model=Role)
async def create_role(
    role: RoleCreate,
    roles_repo: RolesRepository = Depends(get_roles_repo),
    _: dict = Depends(require_admin()),
):
    """Create a new role (admin only)"""
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


@router.get("/roles", response_model=List[Role])
async def get_roles(
    roles_repo: RolesRepository = Depends(get_roles_repo),
    _: dict = Depends(require_security_level(5)),
):
    """Get all roles (requires security level 5 or higher)"""
    return roles_repo.get_all_roles()


@router.post("/roles/{user_id}/{role_name}", response_model=UserWithRoles)
async def assign_role(
    user_id: int,
    role_name: str,
    roles_repo: RolesRepository = Depends(get_roles_repo),
    users_repo: UsersRepository = Depends(get_users_repo),
    current_user: dict = Depends(require_security_level(5)),
):
    """Assign a role to a user (requires security level 5 or higher)"""
    # Get the role
    role = roles_repo.get_role(role_name)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role '{role_name}' not found",
        )

    # Get the user
    user = users_repo.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    # Get current user's maximum security level
    current_user_level = roles_repo.get_user_max_security_level(current_user["user_id"])

    # Prevent assigning roles with higher security level than the current user
    if role.security_level > current_user_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot assign role with higher security level",
        )

    # Assign the role
    if not roles_repo.assign_role(user_id, role.role_id):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not assign role",
        )

    return roles_repo.get_user_with_roles(user)


@router.delete("/roles/{user_id}/{role_name}", response_model=UserWithRoles)
async def remove_role(
    user_id: int,
    role_name: str,
    roles_repo: RolesRepository = Depends(get_roles_repo),
    users_repo: UsersRepository = Depends(get_users_repo),
    current_user: dict = Depends(require_security_level(5)),
):
    """Remove a role from a user (requires security level 5 or higher)"""
    # Get the role
    role = roles_repo.get_role(role_name)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role '{role_name}' not found",
        )

    # Get the user
    user = users_repo.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    # Get current user's maximum security level
    current_user_level = roles_repo.get_user_max_security_level(current_user["user_id"])

    # Prevent removing roles with higher security level than the current user
    if role.security_level > current_user_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove role with higher security level",
        )

    # Prevent users from removing their own highest security level role
    user_roles = roles_repo.get_user_roles(user_id)
    user_max_level = max((r.security_level for r in user_roles), default=1)
    if user_id == current_user["user_id"] and role.security_level == user_max_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove your highest security level role",
        )

    # Remove the role
    if not roles_repo.remove_role(user_id, role.role_id):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not remove role",
        )

    return roles_repo.get_user_with_roles(user)


@router.get("/roles/{user_id}", response_model=UserWithRoles)
async def get_user_roles(
    user_id: int,
    roles_repo: RolesRepository = Depends(get_roles_repo),
    users_repo: UsersRepository = Depends(get_users_repo),
    _: dict = Depends(require_security_level(5)),
):
    """Get all roles for a user (requires security level 5 or higher)"""
    user = users_repo.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    return roles_repo.get_user_with_roles(user)


@router.delete("/roles/{role_id}", response_model=dict)
async def delete_role(
    role_id: int,
    roles_repo: RolesRepository = Depends(get_roles_repo),
    _: dict = Depends(require_admin()),
):
    """Delete a role (admin only)"""
    # Check if role exists
    role = roles_repo.get_role_by_id(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {role_id} not found",
        )

    # Check if it's the admin role
    if role.name.lower() == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete the admin role",
        )

    # Delete the role
    if roles_repo.delete_role(role_id):
        return {"message": f"Role '{role.name}' deleted successfully"}

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to delete role",
    )


@router.put("/roles/{role_id}", response_model=Role)
async def update_role(
    role_id: int,
    role: RoleCreate,
    roles_repo: RolesRepository = Depends(get_roles_repo),
    _: dict = Depends(require_admin()),
):
    """Update a role (admin only)"""
    # Check if role exists
    existing_role = roles_repo.get_role_by_id(role_id)
    if not existing_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {role_id} not found",
        )

    # Check if it's the admin role and prevent security level change
    if existing_role.name.lower() == "admin":
        if role.security_level != 10:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot change admin role security level",
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
