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
from models.roles import UserWithRoles, Role
from repositories.users import UsersRepository
from repositories.roles import RolesRepository
from typing import Union, List, Dict, Any
import os
from utils.permissions import require_permission
import random
import string


router = APIRouter()

# Get admin creation secret from environment variable
ADMIN_CREATION_SECRET = os.getenv("ADMIN_CREATION_SECRET")
if not ADMIN_CREATION_SECRET:
    raise ValueError(
        "ADMIN_CREATION_SECRET environment variable is not set. "
        "Please set it before running the application."
    )


def user_to_dict(user: UserOut) -> Dict[str, Any]:
    """Convert a User model to a dictionary."""
    return {
        "user_id": user.user_id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "roles": (
            [role_to_dict(role) for role in user.roles]
            if hasattr(user, "roles")
            else []
        ),
    }


def role_to_dict(role: Role) -> Dict[str, Any]:
    """Convert a Role model to a dictionary."""
    return {"role_id": role.role_id, "name": role.name, "description": role.description}


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


@router.get("/users", response_model=List[UserWithRoles])
def get_all_users(
    repo: UsersRepository = Depends(),
    _: dict = Depends(require_permission("manage_users")),
):
    """Get all users (requires manage_users permission)"""
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


@router.post("/users/generate-test-accounts", response_model=List[UserOut])
async def generate_test_accounts(
    repo: UsersRepository = Depends(),
    _: dict = Depends(require_permission("manage_users")),
):
    """
    Generate 10 test accounts with random information.
    This endpoint is only accessible to users with manage_users permission.
    """
    test_accounts = []

    # List of common first and last names for variety
    first_names = [
        "John",
        "Jane",
        "Michael",
        "Emily",
        "David",
        "Sarah",
        "Robert",
        "Lisa",
        "William",
        "Jennifer",
        "James",
        "Jessica",
        "Thomas",
        "Amanda",
        "Daniel",
    ]
    last_names = [
        "Smith",
        "Johnson",
        "Williams",
        "Brown",
        "Jones",
        "Garcia",
        "Miller",
        "Davis",
        "Rodriguez",
        "Martinez",
        "Hernandez",
        "Lopez",
        "Gonzalez",
    ]

    # Define allowed special characters based on the validator
    allowed_special_chars = '!@#$%^&*(),.?":{}|<>'

    for _ in range(10):
        # Generate random user information
        first_name = random.choice(first_names)
        last_name = random.choice(last_names)
        email = f"{first_name.lower()}.{last_name.lower()}{random.randint(100,999)}@test.com"

        # Generate password that meets all requirements
        # At least 12 characters, with at least one uppercase, one number, and one special char
        password = (
            random.choice(string.ascii_uppercase)  # At least one uppercase
            + random.choice(string.digits)  # At least one number
            + random.choice(allowed_special_chars)  # At least one special char
            + "".join(
                random.choices(  # Remaining characters
                    string.ascii_letters + string.digits + allowed_special_chars, k=9
                )
            )
        )
        # Shuffle the password to make it more random
        password = "".join(random.sample(password, len(password)))

        # Create user info object
        user_info = UserIn(
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=password,
            password_confirmation=password,
        )

        try:
            # Hash the password
            hashed_password = authenticator.hash_password(password)
            # Create the user
            user = repo.create_user(user_info, hashed_password)
            test_accounts.append(user)
        except DuplicateUserError:
            # If email already exists, try again with a different random number
            continue

    return test_accounts


@router.get("/users/management-data", response_model=dict)
async def get_management_data(
    repo: UsersRepository = Depends(),
    roles_repo: RolesRepository = Depends(),
    _: dict = Depends(require_permission("manage_users")),
):
    """
    Get combined user and role data for management interface.
    """
    users = repo.get_all_users()
    roles = roles_repo.get_all_roles()

    return {
        "users": [user_to_dict(user) for user in users],
        "roles": [role_to_dict(role) for role in roles],
    }


@router.put("/users/{user_id}/roles/batch", response_model=dict)
async def update_user_roles_batch(
    user_id: int,
    role_changes: dict,
    repo: UsersRepository = Depends(),
    roles_repo: RolesRepository = Depends(),
    _: dict = Depends(require_permission("manage_users")),
):
    """
    Update multiple roles for a user in a single request.
    """
    user = repo.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        # Process role additions
        for role_id in role_changes.get("add", []):
            role = roles_repo.get_role_by_id(role_id)
            if role and role not in user.roles:
                roles_repo.assign_role(user_id, role_id)

        # Process role removals
        for role_id in role_changes.get("remove", []):
            role = roles_repo.get_role_by_id(role_id)
            if role and role in user.roles:
                roles_repo.remove_role(user_id, role_id)

        return {"message": "User roles updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
