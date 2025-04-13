from pathlib import Path


def load_sql_template(template_name: str) -> str:
    """
    Load a SQL template from the sql directory.

    Args:
        template_name: The name of the SQL file to load

    Returns:
        The contents of the SQL file as a string
    """
    # Get the directory where this script is located
    current_dir = Path(__file__).parent
    # Construct the path to the SQL template
    template_path = current_dir / template_name

    if not template_path.exists():
        raise FileNotFoundError(f"SQL template not found: {template_name}")

    with open(template_path, "r") as f:
        return f.read()
