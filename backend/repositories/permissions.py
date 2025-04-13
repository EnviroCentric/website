from typing import List, Optional
from models.permissions import Permission, RolePermissions
from db.connection import DatabaseConnection
from sql.loader import load_sql_template


class PermissionsRepository:
    def get_role_permissions(self, role_id: int) -> List[str]:
        """Get all permissions for a specific role."""
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("permissions/get_role_permissions.sql"),
                    [role_id],
                )
                return [record[0] for record in result]
        except Exception as e:
            print(f"Error getting role permissions: {e}")
            return []

    def update_role_permissions(self, role_id: int, permissions: List[str]) -> bool:
        """Update permissions for a role."""
        try:
            with DatabaseConnection.get_db() as db:
                # First delete all existing permissions
                db.execute(
                    load_sql_template("permissions/delete_role_permissions.sql"),
                    [role_id],
                )
                # Then add the new permissions
                for permission in permissions:
                    db.execute(
                        load_sql_template("permissions/add_role_permission.sql"),
                        [role_id, permission],
                    )
                return True
        except Exception as e:
            print(f"Error updating role permissions: {e}")
            return False

    def has_permission(self, user_id: int, permission_name: str) -> bool:
        """Check if a user has a specific permission through their roles."""
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("permissions/check_permission.sql"),
                    [user_id, permission_name],
                )
                return bool(result.fetchone())
        except Exception as e:
            print(f"Error checking permission: {e}")
            return False

    def get_all_permissions(self) -> List[str]:
        """Get all available permissions in the system."""
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("permissions/get_all_permissions.sql")
                )
                return [record[0] for record in result]
        except Exception as e:
            print(f"Error getting all permissions: {e}")
            return []
