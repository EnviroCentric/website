from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import update
from typing import List
from backend.models.user import User
from backend.models.role import Role
from backend.utils.auth import get_current_user
from backend.utils.db import get_db
from backend.utils.utils import has_permission, user_to_dict, role_to_dict

router = APIRouter()


@router.get("/users/management-data", response_model=dict)
async def get_management_data(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Get combined user and role data for management interface.
    """
    # Check if user has permission to manage users
    if not has_permission(current_user, "manage_users"):
        raise HTTPException(status_code=403, detail="Not authorized to manage users")

    # Get all users with their roles
    users = db.query(User).options(joinedload(User.roles)).all()

    # Get all roles
    roles = db.query(Role).all()

    return {
        "users": [user_to_dict(user) for user in users],
        "roles": [role_to_dict(role) for role in roles],
    }


@router.put("/users/{user_id}/roles/batch", response_model=dict)
async def update_user_roles_batch(
    user_id: int,
    role_changes: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update multiple roles for a user in a single request.
    """
    if not has_permission(current_user, "manage_users"):
        raise HTTPException(status_code=403, detail="Not authorized to manage users")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        # Process role additions
        for role_id in role_changes.get("add", []):
            role = db.query(Role).filter(Role.role_id == role_id).first()
            if role and role not in user.roles:
                user.roles.append(role)

        # Process role removals
        for role_id in role_changes.get("remove", []):
            role = db.query(Role).filter(Role.role_id == role_id).first()
            if role and role in user.roles:
                user.roles.remove(role)

        db.commit()
        return {"message": "User roles updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
