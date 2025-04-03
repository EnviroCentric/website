from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from models.roles import Role, RoleCreate, UserWithRoles
from repositories.roles import RolesRepository
from repositories.users import UsersRepository
from authenticator import authenticator

router = APIRouter()


def get_roles_repo():
    return RolesRepository()


def get_users_repo():
    return UsersRepository()


def require_security_level(min_level: int):
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


@router.post("/roles", response_model=Role)
async def create_role(
    role: RoleCreate,
    roles_repo: RolesRepository = Depends(get_roles_repo),
    _: dict = Depends(require_security_level(10)),
):
    """Create a new role (requires security level 10)"""
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

    # Prevent assigning roles with higher security level than the current user
    if role.security_level > current_user["security_level"]:
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

    # Prevent removing roles with higher security level than the current user
    if role.security_level > current_user["security_level"]:
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
