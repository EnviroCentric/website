from pathlib import Path


def load_sql_template(filename: str) -> str:
    """
    Load a SQL template file from the sql directory.

    Args:
        filename: The name of the SQL file to load

    Returns:
        The contents of the SQL file as a string
    """
    sql_dir = Path(__file__).parent
    with open(sql_dir / filename) as f:
        return f.read()
