import os

SQL_DIR = os.path.join(os.path.dirname(__file__), "../../sql")


def load_sql(filename: str) -> str:
    """
    Load SQL file from the sql directory.

    Args:
        filename: Name of the SQL file to load

    Returns:
        str: Contents of the SQL file
    """
    path = os.path.join(SQL_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()
