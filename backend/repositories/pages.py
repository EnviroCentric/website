from typing import List, Optional
from models.pages import Page, PageWithRoles
from db.connection import DatabaseConnection
from sql.loader import load_sql_template


class PagesRepository:
    def get_all_pages(self) -> List[Page]:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(load_sql_template("pages/get_all_pages.sql"))
                return [
                    Page(
                        page_id=record[0],
                        name=record[1],
                        path=record[2],
                        description=record[3],
                        created_at=record[4],
                        updated_at=record[5],
                    )
                    for record in result
                ]
        except Exception as e:
            print(f"Error getting all pages: {e}")
            return []

    def get_page(self, page_id: int) -> Optional[Page]:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("pages/get_page.sql"),
                    [page_id],
                )
                record = result.fetchone()
                if record:
                    return Page(
                        page_id=record[0],
                        name=record[1],
                        path=record[2],
                        description=record[3],
                        created_at=record[4],
                        updated_at=record[5],
                    )
                return None
        except Exception as e:
            print(f"Error getting page: {e}")
            return None

    def get_page_roles(self, page_id: int) -> List[int]:
        try:
            with DatabaseConnection.get_db() as db:
                result = db.execute(
                    load_sql_template("pages/get_page_roles.sql"),
                    [page_id],
                )
                return [record[0] for record in result]
        except Exception as e:
            print(f"Error getting page roles: {e}")
            return []

    def update_page_roles(self, page_id: int, role_ids: List[int]) -> bool:
        try:
            with DatabaseConnection.get_db() as db:
                # First delete all existing role associations
                db.execute(
                    load_sql_template("pages/delete_page_roles.sql"),
                    [page_id],
                )
                # Then add the new role associations
                for role_id in role_ids:
                    db.execute(
                        load_sql_template("pages/add_page_role.sql"),
                        [page_id, role_id],
                    )
                return True
        except Exception as e:
            print(f"Error updating page roles: {e}")
            return False

    def get_page_with_roles(self, page_id: int) -> Optional[PageWithRoles]:
        page = self.get_page(page_id)
        if not page:
            return None
        roles = self.get_page_roles(page_id)
        return PageWithRoles(
            page_id=page.page_id,
            name=page.name,
            path=page.path,
            description=page.description,
            created_at=page.created_at,
            updated_at=page.updated_at,
            roles=roles,
        )
