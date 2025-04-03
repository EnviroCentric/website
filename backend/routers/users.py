from fastapi import (
    Depends,
    HTTPException,
    status,
    Response,
    APIRouter,
    Request,
    Header,
)
from authenticator import authenticator
from db.connection import DatabaseConnection
from models.users import (
    UserIn,
    UserOut,
    UserUpdateIn,
    DuplicateUserError,
    Error,
    HttpError,
    UserUpdateOut,
    AdminUserIn,
)
from models.auth import AccountForm, AccountToken
from models.roles import UserWithRoles
from repositories.users import UsersRepository
from repositories.roles import RolesRepository
from typing import Union, List
import os
from routers.roles import require_security_level


router = APIRouter()

# Get admin creation secret from environment variable
ADMIN_CREATION_SECRET = os.getenv("ADMIN_CREATION_SECRET")
if not ADMIN_CREATION_SECRET:
    raise ValueError(
        "ADMIN_CREATION_SECRET environment variable is not set. "
        "Please set it before running the application."
    )


@router.post("/users", response_model=AccountToken | HttpError)
async def create_user(
    info: UserIn,
    request: Request,
    response: Response,
    repo: UsersRepository = Depends(),
):
    if info.password != info.password_confirmation:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match",
        )
    hashed_password = authenticator.hash_password(info.password)
    try:
        user = repo.create_user(info, hashed_password)
    except DuplicateUserError:
        raise HTTPException(
            status_code=400,
            detail=(
                "An account with this email address already exists. "
                "Please use a different email or try logging in."
            ),
        )
    # Create form with email as username for jwtdown-fastapi
    form = AccountForm(username=info.email, email=info.email, password=info.password)
    token = await authenticator.login(response, request, form, repo)
    # Convert account to dictionary before creating AccountToken
    user_dict = {
        "user_id": user.user_id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "last_login": user.last_login,
    }
    return AccountToken(account=user_dict, **token.dict())


@router.get("/users", response_model=Union[Error, List[UserOut]])
def get_all_users(
    repo: UsersRepository = Depends(),
    _: dict = Depends(require_security_level(5)),
):
    """Get all users (requires security level 5 or higher)"""
    return repo.get_all_users()


@router.get("/users/self", response_model=UserWithRoles)
async def view_self(
    repo: UsersRepository = Depends(),
    roles_repo: RolesRepository = Depends(),
    user_data: dict = Depends(authenticator.get_current_account_data),
):
    """
    View own profile with roles.
    """
    if user_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Must be logged in to view user profile",
        )
    user = repo.view_user(email=user_data["email"])
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )
    return roles_repo.get_user_with_roles(user)


@router.get("/token", response_model=AccountToken | None)
async def get_token(
    request: Request,
    account: dict = Depends(authenticator.try_get_current_account_data),
    repo: UsersRepository = Depends(),
) -> AccountToken | None:
    if account and authenticator.cookie_name in request.cookies:
        # Update last login time
        with DatabaseConnection.get_db() as db:
            result = db.execute(
                "UPDATE users SET last_login = NOW() " "WHERE email = %s RETURNING *",
                [account["email"]],
            )
            updated_user = result.fetchone()
            if updated_user:
                account.update({"last_login": updated_user[6]})
        return AccountToken(
            access_token=request.cookies[authenticator.cookie_name],
            token_type="Bearer",
            account=account,
        )
    return None


@router.put("/users/self", response_model=UserUpdateOut | None)
async def update_user(
    update_in: UserUpdateIn,
    repo: UsersRepository = Depends(),
    user_data: dict = Depends(authenticator.get_current_account_data),
):
    try:
        if user_data is not None:
            user_id = user_data["user_id"]
            result = repo.update_user(user_id, update_in)
            if isinstance(result, dict) and "message" in result:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=result["message"],
                )
            return result
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Must be logged in to update user",
            )
    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update user",
        )


@router.get("/users/check-email/{email}", response_model=dict)
async def check_email_exists(
    email: str,
    repo: UsersRepository = Depends(),
):
    """
    Check if an email exists in the system.
    """
    user = repo.get_user(email)
    return {"exists": user is not None}


@router.post("/users/create-admin", response_model=AccountToken | HttpError)
async def create_admin_user(
    info: AdminUserIn,
    request: Request,
    response: Response,
    secret_key: str = Header(None),
    repo: UsersRepository = Depends(),
):
    """
    Create an admin account. This endpoint is only accessible when directly
    calling the backend with the correct secret key in the headers.
    """
    if not secret_key or secret_key != ADMIN_CREATION_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing secret key",
        )

    if info.password != info.password_confirmation:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match",
        )

    hashed_password = authenticator.hash_password(info.password)
    try:
        # Create the account with admin role
        user = repo.create_admin_user(info, hashed_password)
    except DuplicateUserError:
        raise HTTPException(
            status_code=400,
            detail=(
                "An account with this email address already exists. "
                "Please use a different email or try logging in."
            ),
        )

    # Create form with email as username for jwtdown-fastapi
    form = AccountForm(username=info.email, email=info.email, password=info.password)
    token = await authenticator.login(response, request, form, repo)

    # Convert account to dictionary before creating AccountToken
    user_dict = {
        "user_id": user.user_id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "last_login": user.last_login,
        "is_admin": True,
    }
    return AccountToken(account=user_dict, **token.dict())
