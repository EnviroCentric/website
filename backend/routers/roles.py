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


def require_admin(user_data: dict = Depends(authenticator.get_current_account_data)):
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    roles_repo = RolesRepository()
    user_roles = roles_repo.get_user_roles(user_data["user_id"])
    if not any(role.name == "admin" for role in user_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user_data


@router.post("/roles", response_model=Role)
async def create_role(
    role: RoleCreate,
    roles_repo: RolesRepository = Depends(get_roles_repo),
    _: dict = Depends(require_admin),
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
    _: dict = Depends(require_admin),
):
    """Get all roles (admin only)"""
    return roles_repo.get_all_roles()


@router.post("/roles/{user_id}/{role_name}", response_model=UserWithRoles)
async def assign_role(
    user_id: int,
    role_name: str,
    roles_repo: RolesRepository = Depends(get_roles_repo),
    users_repo: UsersRepository = Depends(get_users_repo),
    _: dict = Depends(require_admin),
):
    """Assign a role to a user (admin only)"""
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
    _: dict = Depends(require_admin),
):
    """Remove a role from a user (admin only)"""
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
    _: dict = Depends(require_admin),
):
    """Get all roles for a user (admin only)"""
    user = users_repo.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    return roles_repo.get_user_with_roles(user)
