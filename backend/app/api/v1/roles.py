from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_roles():
    """Get all roles endpoint."""
    return {"message": "Roles endpoint"} 