from fastapi import Depends, HTTPException, status
from authenticator import authenticator
from repositories.permissions import PermissionsRepository


def require_permission(permission_name: str):
    """Require the user to have a specific permission"""

    async def check_permission(
        user_data: dict = Depends(authenticator.get_current_account_data),
    ):
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            )

        permissions_repo = PermissionsRepository()
        if not permissions_repo.has_permission(user_data["user_id"], permission_name):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission_name}' required",
            )
        return user_data

    return check_permission
