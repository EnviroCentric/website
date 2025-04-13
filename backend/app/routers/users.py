from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.connection import get_db
from app.models.users import User
from app.schemas.users import User as UserSchema
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.get("/users/self", response_model=UserSchema)
async def get_self(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return user
