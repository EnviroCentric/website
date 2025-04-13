from datetime import datetime
from typing import List, Optional, Union
import pytz
from db.connection import DatabaseConnection
from models.users import (
    UserIn,
    UserOut,
    UserUpdateIn,
    UserUpdateOut,
    DuplicateUserError,
    UserOutWithPassword,
    Error,
)
from models.roles import UserWithRoles, RoleOut
from sql.loader import load_sql_template
from repositories.roles import RolesRepository
from repositories.permissions import PermissionsRepository
from fastapi import HTTPException, status


def parse_datetime(date_str: str) -> Optional[str]:
    if not date_str:
        return None
    try:
        # Convert to datetime if it's a string
        if isinstance(date_str, str):
            dt = datetime.strptime(date_str, "%m-%d-%Y")
        else:
            dt = date_str

        # Convert to PST timezone
        pst = pytz.timezone("America/Los_Angeles")
        if dt.tzinfo is None:
            dt = pytz.UTC.localize(dt)
        dt_pst = dt.astimezone(pst)

        # Format as yyyy-mm-dd hh:MM
        return dt_pst.strftime("%Y-%m-%d %H:%M")
    except (ValueError, TypeError, AttributeError) as e:
        print(f"Error parsing datetime: {e}")
        return None


class UsersRepository:
    def record_to_user_out(self, record) -> UserOut:
        # SQL columns: user_id, email, first_name, last_name, created_at, updated_at, last_login
        return UserOut(
            user_id=record[0],
            email=record[1],
            first_name=record[2],
            last_name=record[3],
            created_at=record[4],  # created_at from DB
            updated_at=record[5],  # updated_at from DB
            last_login=record[6],  # last_login from DB
        )

    def get_user(self, email: str) -> Optional[UserOutWithPassword]:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("users/get_user.sql"),
                    [email],
                )
                record = result.fetchone()
                if record:
                    return UserOutWithPassword(
                        user_id=record[0],
                        email=record[1],
                        hashed_password=record[2],
                        first_name=record[3],
                        last_name=record[4],
                        last_login=None,  # last_login not in query
                    )
                return None
        except Exception as e:
            print(e)
            return None

    def view_user(self, email: str) -> Optional[UserOut]:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("users/view_user.sql"),
                    [email],
                )
                record = result.fetchone()
                if record is None:
                    return None
                return UserOut(
                    user_id=record[0],
                    email=record[3],
                    first_name=record[1],
                    last_name=record[2],
                    last_login=parse_datetime(record[6]),
                )
        except Exception as e:
            print(e)
            return None

    def get_all_users(self) -> List[UserWithRoles]:
        try:
            with DatabaseConnection.get_db() as db:
                sql = load_sql_template("users/get_all_users.sql")
                result = db.execute(sql)
                users = [self.record_to_user_out(record) for record in result]

                # Get roles with permissions for each user
                roles_repo = RolesRepository()
                permissions_repo = PermissionsRepository()
                users_with_roles = []
                for user in users:
                    roles = roles_repo.get_user_roles(user.user_id)
                    # Ensure each role has its permissions
                    for role in roles:
                        role.permissions = permissions_repo.get_role_permissions(
                            role.role_id
                        )
                    # Format timestamps as strings if they exist
                    last_login_str = None
                    created_at_str = None
                    updated_at_str = None

                    if user.last_login:
                        if isinstance(user.last_login, str):
                            last_login_str = user.last_login
                        else:
                            last_login_str = user.last_login.strftime(
                                "%Y-%m-%d %H:%M:%S"
                            )

                    if user.created_at:
                        if isinstance(user.created_at, str):
                            created_at_str = user.created_at
                        else:
                            created_at_str = user.created_at.strftime(
                                "%Y-%m-%d %H:%M:%S"
                            )

                    if user.updated_at:
                        if isinstance(user.updated_at, str):
                            updated_at_str = user.updated_at
                        else:
                            updated_at_str = user.updated_at.strftime(
                                "%Y-%m-%d %H:%M:%S"
                            )

                    user_with_roles = UserWithRoles(
                        user_id=user.user_id,
                        email=user.email,
                        first_name=user.first_name,
                        last_name=user.last_name,
                        last_login=last_login_str,
                        roles=roles,
                        created_at=created_at_str,
                        updated_at=updated_at_str,
                    )
                    users_with_roles.append(user_with_roles)
                return users_with_roles
        except Exception as e:
            print(e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not get users",
            )

    def create_user(self, info: UserIn, hashed_password: str) -> UserOut:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("users/create_user.sql"),
                    [
                        info.email,
                        info.first_name,
                        info.last_name,
                        hashed_password,
                    ],
                )
                record = result.fetchone()
                user = self.record_to_user_out(record)

                # Assign default role to the new user
                default_role_name = "user"  # Assuming 'user' is the default role
                roles_repo = RolesRepository()
                default_role = roles_repo.get_role(default_role_name)
                if default_role:
                    roles_repo.assign_role(user.user_id, default_role.role_id)

                return user
        except Exception as e:
            print(e)
            raise DuplicateUserError from e

    def update_user(
        self, user_id: int, update_in: UserUpdateIn
    ) -> Union[UserUpdateOut, Error]:
        try:
            with DatabaseConnection.get_db() as db:
                # If password is provided, hash it
                hashed_password = None
                if update_in.new_password:
                    if update_in.new_password != update_in.new_password_confirmation:
                        return {"message": "Passwords do not match"}
                    from authenticator import authenticator

                    hashed_password = authenticator.hash_password(
                        update_in.new_password
                    )

                result = db.execute(
                    load_sql_template("users/update_account.sql"),
                    [
                        update_in.email,
                        hashed_password,
                        update_in.first_name,
                        update_in.last_name,
                        user_id,
                    ],
                )
                record = result.fetchone()
                if record is None:
                    return {"message": "Could not update user"}

                return UserUpdateOut(
                    user_id=record[0],
                    first_name=record[1],
                    last_name=record[2],
                    email=record[3],
                    created_at=parse_datetime(record[4]),
                    updated_at=parse_datetime(record[5]),
                    last_login=parse_datetime(record[6]),
                    message="Profile updated successfully. Please log in again to continue.",
                )
        except Exception as e:
            print(e)
            return {"message": "Could not update user"}

    def check_email_exists(self, email: str) -> bool:
        with DatabaseConnection.get_db() as db:
            result = db.execute(
                load_sql_template("users/check_email_exists.sql"),
                [email],
            )
            return bool(result.fetchone())

    def get_user_by_id(self, user_id: int) -> Optional[UserOut]:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("users/get_user_by_id.sql"),
                    [user_id],
                )
                record = result.fetchone()
                if record:
                    return self.record_to_user_out(record)
                return None
        except Exception as e:
            print(f"Error getting user by ID: {e}")
            return None

    def create_admin_user(self, info: UserIn, hashed_password: str) -> UserOut:
        try:
            with DatabaseConnection.get_db() as db:
                print("Creating admin user...")
                # First create the user
                result = db.execute(
                    load_sql_template("users/create_user.sql"),
                    [
                        info.email,
                        info.first_name,
                        info.last_name,
                        hashed_password,
                    ],
                )
                record = result.fetchone()
                if not record:
                    raise Exception("Failed to create user")
                user_id = record[0]
                print(f"Created user with ID: {user_id}")

                # Then assign the admin role
                print("Assigning admin role...")
                db.execute(
                    load_sql_template("users/assign_admin_role.sql"),
                    [user_id],
                )
                print("Admin role assigned successfully")
                return self.record_to_user_out(record)
        except Exception as e:
            print(f"Error creating admin user: {e}")
            raise DuplicateUserError from e
