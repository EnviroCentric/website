import os
from psycopg_pool import ConnectionPool
from contextlib import contextmanager
from typing import Generator, Any

pool = ConnectionPool(conninfo=os.environ["DATABASE_URL"])


class DatabaseConnection:
    @staticmethod
    @contextmanager
    def get_db() -> Generator[Any, None, None]:
        with pool.connection() as conn:
            with conn.cursor() as db:
                yield db


# Example usage:
# with DatabaseConnection.get_db() as db:
#     db.execute("SELECT * FROM users")
