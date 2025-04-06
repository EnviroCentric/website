from typing import List, Optional
from datetime import datetime
import pytz
from models.roles import Role, RoleCreate, UserWithRoles, RoleOut, SecurityLevelConfig
from models.users import UserOut
from db.connection import DatabaseConnection
from sql.loader import load_sql_template


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
    def get_security_levels(self) -> SecurityLevelConfig:
        """Get the current security level configuration."""
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(load_sql_template("roles/get_security_levels.sql"))
                record = result.fetchone()
                if record:
                    return SecurityLevelConfig(
                        create_role=record[0],
                        view_roles=record[1],
                        manage_roles=record[2],
                        view_users=record[3],
                    )
                # Return default values if no configuration exists
                return SecurityLevelConfig()
        except Exception as e:
            print(f"Error getting security levels: {e}")
            return SecurityLevelConfig()

    def update_security_levels(
        self, config: SecurityLevelConfig
    ) -> SecurityLevelConfig:
        """Update the security level configuration."""
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("roles/update_security_levels.sql"),
                    [
                        config.create_role,
                        config.view_roles,
                        config.manage_roles,
                        config.view_users,
                    ],
                )
                record = result.fetchone()
                if record:
                    return SecurityLevelConfig(
                        create_role=record[0],
                        view_roles=record[1],
                        manage_roles=record[2],
                        view_users=record[3],
                    )
                return config
        except Exception as e:
            print(f"Error updating security levels: {e}")
            return config

    def create_role(self, role: RoleCreate) -> Optional[Role]:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("roles/create_role.sql"),
                    [role.name, role.description, role.security_level],
                )
                record = result.fetchone()
                if record is None:
                    return None
                return Role(
                    role_id=record[0],
                    name=record[1],
                    description=record[2],
                    security_level=record[3],
                    created_at=parse_datetime(record[4]),
                    updated_at=parse_datetime(record[5]),
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
                    security_level=record[3],
                    created_at=parse_datetime(record[4]),
                    updated_at=parse_datetime(record[5]),
                )
        except Exception as e:
            print(e)
            return None

    def get_all_roles(self) -> List[Role]:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(load_sql_template("roles/get_all_roles.sql"))
                return [
                    Role(
                        role_id=record[0],
                        name=record[1],
                        description=record[2],
                        security_level=record[3],
                        created_at=parse_datetime(record[4]),
                        updated_at=parse_datetime(record[5]),
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
                print(f"Getting roles for user_id: {user_id}")
                result = db.execute(
                    load_sql_template("roles/get_user_roles.sql"),
                    [user_id],
                )
                roles = [
                    RoleOut(
                        name=record[1],
                        description=record[2],
                        security_level=record[3],
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

    def get_user_max_security_level(self, user_id: int) -> int:
        """Get the highest security level among all roles assigned to a user."""
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("roles/get_user_max_security_level.sql"),
                    [user_id],
                )
                record = result.fetchone()
                return record[0] if record else 0
        except Exception as e:
            print(f"Error getting user max security level: {e}")
            return 0

    def get_role_by_id(self, role_id: int) -> Optional[Role]:
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
                return Role(
                    role_id=record[0],
                    name=record[1],
                    description=record[2],
                    security_level=record[3],
                    created_at=parse_datetime(record[4]),
                    updated_at=parse_datetime(record[5]),
                )
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
                    [role.name, role.description, role.security_level, role_id],
                )
                record = result.fetchone()
                if record:
                    return Role(
                        role_id=record[0],
                        name=record[1],
                        description=record[2],
                        security_level=record[3],
                        created_at=parse_datetime(record[4]),
                        updated_at=parse_datetime(record[5]),
                    )
                return None
        except Exception as e:
            print(f"Error updating role: {e}")
            return None
