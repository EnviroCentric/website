from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import User, Role, Permission
from app.core.security import get_current_user

router = APIRouter()


@router.get("/", response_model=List[dict])
async def get_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get all roles (except admin).
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")

    roles = db.query(Role).filter(Role.name != "admin").all()
    return [{"role_id": role.id, "name": role.name} for role in roles]


@router.get("/permissions", response_model=List[str])
async def get_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get all available permissions.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")

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
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")

    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    return [permission.name for permission in role.permissions]


@router.put("/{role_id}/permissions", response_model=dict)
async def update_role_permissions(
    role_id: int,
    permissions: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update permissions for a specific role.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")

    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Clear existing permissions
    role.permissions = []

    # Add new permissions
    for perm_name in permissions.get("permissions", []):
        permission = db.query(Permission).filter(Permission.name == perm_name).first()
        if permission:
            role.permissions.append(permission)

    db.add(role)
    db.commit()
    db.refresh(role)

    return {"message": "Permissions updated successfully"}
