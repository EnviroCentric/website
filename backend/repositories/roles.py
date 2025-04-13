from typing import List, Optional
from datetime import datetime
import pytz
from models.roles import Role, RoleCreate, UserWithRoles, RoleOut
from models.users import UserOut
from db.connection import DatabaseConnection
from sql.loader import load_sql_template
from repositories.permissions import PermissionsRepository


def parse_datetime(dt):
    if not dt:
        return None
    try:
        # Convert to datetime if it's a string
        if isinstance(dt, str):
            dt = datetime.strptime(dt, "%m-%d-%Y")

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


class RolesRepository:
    def create_role(self, role: RoleCreate) -> Optional[Role]:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("roles/create_role.sql"),
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
                    load_sql_template("roles/get_role.sql"),
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

    def get_all_roles(self) -> List[RoleOut]:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(load_sql_template("roles/get_all_roles.sql"))
                permissions_repo = PermissionsRepository()
                roles = []
                for record in result:
                    role_id = record[0]
                    role = RoleOut(
                        role_id=role_id,
                        name=record[1],
                        description=record[2],
                        created_at=parse_datetime(record[3]),
                        updated_at=parse_datetime(record[4]),
                    )
                    # Get permissions for this role
                    role.permissions = permissions_repo.get_role_permissions(role_id)
                    roles.append(role)
                return roles
        except Exception as e:
            print(e)
            return []

    def assign_role(self, user_id: int, role_id: int) -> bool:
        try:
            with DatabaseConnection.get_db() as db:
                db.execute(
                    load_sql_template("roles/assign_role.sql"),
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
                    load_sql_template("roles/remove_role.sql"),
                    [user_id, role_id],
                )
                return True
        except Exception as e:
            print(e)
            return False

    def get_user_roles(self, user_id: int) -> List[RoleOut]:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("roles/get_user_roles.sql"),
                    [user_id],
                )
                permissions_repo = PermissionsRepository()
                roles = []
                for record in result:
                    role_id = record[0]
                    role = RoleOut(
                        role_id=role_id,
                        name=record[1],
                        description=record[2],
                    )
                    # Get permissions for this role
                    role.permissions = permissions_repo.get_role_permissions(role_id)
                    roles.append(role)
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
            last_login = parse_datetime(user.last_login) if user.last_login else None

        return UserWithRoles(
            user_id=user.user_id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            roles=roles,
            created_at=created_at,
            updated_at=updated_at,
            last_login=last_login,
        )

    def get_role_by_id(self, role_id: int) -> Optional[RoleOut]:
        """Get a role by its ID."""
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("roles/get_role_by_id.sql"),
                    [role_id],
                )
                record = result.fetchone()
                if record is None:
                    return None
                permissions_repo = PermissionsRepository()
                role = RoleOut(
                    role_id=record[0],
                    name=record[1],
                    description=record[2],
                    created_at=parse_datetime(record[3]),
                    updated_at=parse_datetime(record[4]),
                )
                # Get permissions for this role
                role.permissions = permissions_repo.get_role_permissions(role.role_id)
                return role
        except Exception as e:
            print(f"Error getting role by ID: {e}")
            return None

    def delete_role(self, role_id: int) -> bool:
        """Delete a role by its ID."""
        try:
            with DatabaseConnection.get_db() as db:
                # First delete user-role associations
                db.execute(
                    load_sql_template("roles/delete_user_roles.sql"),
                    [role_id],
                )
                # Then delete the role
                db.execute(
                    load_sql_template("roles/delete_role.sql"),
                    [role_id],
                )
                return True
        except Exception as e:
            print(f"Error deleting role: {e}")
            return False

    def update_role(self, role_id: int, role: RoleCreate) -> Optional[Role]:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("roles/update_role.sql"),
                    [role.name, role.description, role_id],
                )
                record = result.fetchone()
                if record:
                    return Role(
                        role_id=record[0],
                        name=record[1],
                        description=record[2],
                        created_at=parse_datetime(record[3]),
                        updated_at=parse_datetime(record[4]),
                    )
                return None
        except Exception as e:
            print(f"Error updating role: {e}")
            return None
