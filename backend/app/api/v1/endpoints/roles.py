from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import User, Role, Permission
from app.core.security import get_current_user
from app.schemas.role import (
    RoleCreate,
    RoleUpdate,
    RoleResponse,
    RolePermissionUpdate,
)

router = APIRouter()

# Core system permissions
CORE_PERMISSIONS = [
    "manage_roles",  # Permission to manage roles and their permissions
    "manage_users",  # Permission to manage users and their roles
]


def check_role_management_access(user: User) -> None:
    """
    Check if user has permission to manage roles.
    """
    if user.is_superuser:
        return

    has_permission = any(
        permission.name == "manage_roles"
        for role in user.roles
        for permission in role.permissions
    )

    if not has_permission:
        raise HTTPException(status_code=403, detail="Not authorized to manage roles")


@router.get("/", response_model=List[RoleResponse])
async def get_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get all roles (except admin).
    """
    check_role_management_access(current_user)

    roles = db.query(Role).filter(Role.name != "admin").all()
    return [
        {
            "role_id": role.id,
            "name": role.name,
            "description": role.description,
            "created_at": role.created_at,
            "updated_at": role.updated_at,
        }
        for role in roles
    ]


@router.post("/", response_model=RoleResponse)
async def create_role(
    role_data: RoleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Create a new role.
    """
    check_role_management_access(current_user)

    # Check if role name already exists
    existing_role = db.query(Role).filter(Role.name == role_data.name).first()
    if existing_role:
        raise HTTPException(
            status_code=400, detail="Role with this name already exists"
        )

    # Create new role
    new_role = Role(
        name=role_data.name,
        description=role_data.description,
    )
    db.add(new_role)
    db.commit()
    db.refresh(new_role)

    # Add permissions if provided
    if role_data.permissions:
        for perm_name in role_data.permissions:
            perm = db.query(Permission).filter(Permission.name == perm_name).first()
            if perm:
                new_role.permissions.append(perm)
        db.add(new_role)
        db.commit()
        db.refresh(new_role)

    return {
        "role_id": new_role.id,
        "name": new_role.name,
        "description": new_role.description,
        "created_at": new_role.created_at,
        "updated_at": new_role.updated_at,
    }


@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update a role.
    """
    check_role_management_access(current_user)

    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Check if new name conflicts with existing role
    existing_role = (
        db.query(Role).filter(Role.name == role_data.name, Role.id != role_id).first()
    )
    if existing_role:
        raise HTTPException(
            status_code=400, detail="Role with this name already exists"
        )

    role.name = role_data.name
    if role_data.description is not None:
        role.description = role_data.description

    # Update permissions if provided
    if role_data.permissions is not None:
        role.permissions = []
        for perm_name in role_data.permissions:
            perm = db.query(Permission).filter(Permission.name == perm_name).first()
            if perm:
                role.permissions.append(perm)

    db.add(role)
    db.commit()
    db.refresh(role)

    return {
        "role_id": role.id,
        "name": role.name,
        "description": role.description,
        "created_at": role.created_at,
        "updated_at": role.updated_at,
    }


@router.delete("/{role_id}", response_model=dict)
async def delete_role(
    role_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Delete a role. Only superusers can delete roles.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only superusers can delete roles")

    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Check if role is assigned to any users
    users_with_role = db.query(User).filter(User.roles.contains(role)).first()
    if users_with_role:
        raise HTTPException(
            status_code=400, detail="Cannot delete role that is assigned to users"
        )

    db.delete(role)
    db.commit()

    return {"message": "Role deleted successfully"}


@router.get("/permissions", response_model=List[str])
async def get_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get all available permissions.
    """
    check_role_management_access(current_user)

    permissions = db.query(Permission).all()
    return [permission.name for permission in permissions]


@router.get("/{role_id}/permissions", response_model=List[str])
async def get_role_permissions(
    role_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get permissions for a specific role.
    """
    check_role_management_access(current_user)

    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    return [permission.name for permission in role.permissions]


@router.put("/{role_id}/permissions", response_model=dict)
async def update_role_permissions(
    role_id: int,
    permissions: RolePermissionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update permissions for a specific role.
    """
    check_role_management_access(current_user)

    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Clear existing permissions
    role.permissions = []

    # Add new permissions
    for perm_name in permissions.permissions:
        perm = db.query(Permission).filter(Permission.name == perm_name).first()
        if perm:
            role.permissions.append(perm)

    db.add(role)
    db.commit()
    db.refresh(role)

    return {"message": "Role permissions updated successfully"}


@router.post("/init-permissions", response_model=dict)
async def initialize_core_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Initialize core system permissions.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="Only superusers can initialize permissions"
        )

    created_permissions = []
    existing_permissions = []

    # Create core permissions if they don't exist
    for perm_name in CORE_PERMISSIONS:
        perm = db.query(Permission).filter(Permission.name == perm_name).first()
        if not perm:
            perm = Permission(name=perm_name)
            db.add(perm)
            created_permissions.append(perm_name)
        else:
            existing_permissions.append(perm_name)

    db.commit()
    return {
        "created": created_permissions,
        "existing": existing_permissions,
        "message": "Core permissions initialized successfully",
    }
