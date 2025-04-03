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
from sql.loader import load_sql_template


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
        return UserOut(
            user_id=record[0],
            email=record[1],
            first_name=record[2],
            last_name=record[3],
            last_login=parse_datetime(record[4]),
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

    def get_all_users(self) -> Union[List[UserOut], Error]:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(load_sql_template("users/get_all_users.sql"))
                return [self.record_to_user_out(record) for record in result]
        except Exception as e:
            print(e)
            return {"message": "Could not get users"}

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
                return self.record_to_user_out(record)
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
            print(e)
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
