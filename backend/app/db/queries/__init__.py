from pathlib import Path
import os

# Get the directory containing this file
QUERIES_DIR = Path(__file__).parent

def load_sql(filename: str) -> str:
    """Load SQL from a file in the queries directory."""
    file_path = QUERIES_DIR / filename
    with open(file_path, 'r') as f:
        return f.read() 