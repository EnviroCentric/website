from typing import List, Optional
from datetime import datetime
from models.roles import Role, RoleCreate, UserWithRoles, RoleOut
from models.users import UserOut
from db.connection import DatabaseConnection
from sql.loader import load_sql_template


def parse_datetime(dt):
    if isinstance(dt, str):
        try:
            return datetime.strptime(dt, "%m-%d-%Y")
        except ValueError:
            return dt
    return dt


class RolesRepository:
    def create_role(self, role: RoleCreate) -> Optional[Role]:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("create_role.sql"),
                    [role.name, role.description],
                )
                record = result.fetchone()
                if record is None:
                    return None
                return Role(
                    role_id=record[0],
                    name=record[1],
                    description=record[2],
                    created_at=parse_datetime(record[3]),
                    updated_at=parse_datetime(record[4]),
                )
        except Exception as e:
            print(e)
            return None

    def get_role(self, name: str) -> Optional[Role]:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("get_role.sql"),
                    [name],
                )
                record = result.fetchone()
                if record is None:
                    return None
                return Role(
                    role_id=record[0],
                    name=record[1],
                    description=record[2],
                    created_at=parse_datetime(record[3]),
                    updated_at=parse_datetime(record[4]),
                )
        except Exception as e:
            print(e)
            return None

    def get_all_roles(self) -> List[Role]:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(load_sql_template("get_all_roles.sql"))
                return [
                    Role(
                        role_id=record[0],
                        name=record[1],
                        description=record[2],
                        created_at=parse_datetime(record[3]),
                        updated_at=parse_datetime(record[4]),
                    )
                    for record in result
                ]
        except Exception as e:
            print(e)
            return []

    def assign_role(self, user_id: int, role_id: int) -> bool:
        try:
            with DatabaseConnection.get_db() as db:
                db.execute(
                    load_sql_template("assign_role.sql"),
                    [user_id, role_id],
                )
                return True
        except Exception as e:
            print(e)
            return False

    def remove_role(self, user_id: int, role_id: int) -> bool:
        try:
            with DatabaseConnection.get_db() as db:
                db.execute(
                    load_sql_template("remove_role.sql"),
                    [user_id, role_id],
                )
                return True
        except Exception as e:
            print(e)
            return False

    def get_user_roles(self, user_id: int) -> List[RoleOut]:
        try:
            with DatabaseConnection.get_db() as db:
                print(f"Getting roles for user_id: {user_id}")
                result = db.execute(
                    load_sql_template("roles/get_user_roles.sql"),
                    [user_id],
                )
                roles = [
                    RoleOut(
                        name=record[1],
                        description=record[2],
                    )
                    for record in result
                ]
                print(f"Found roles: {[role.name for role in roles]}")
                return roles
        except Exception as e:
            print(f"Error getting user roles: {e}")
            return []

    def get_user_with_roles(self, user: UserOut) -> UserWithRoles:
        roles = self.get_user_roles(user.user_id)
        # Get user timestamps from database
        with DatabaseConnection.get_db() as db:
            result = db.execute(
                load_sql_template("users/get_user_timestamps.sql"),
                [user.user_id],
            )
            record = result.fetchone()
            created_at = parse_datetime(record[0]) if record else None
            updated_at = parse_datetime(record[1]) if record else None

        return UserWithRoles(
            user_id=user.user_id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            roles=roles,
            created_at=created_at,
            updated_at=updated_at,
            last_login=user.last_login,
        )
