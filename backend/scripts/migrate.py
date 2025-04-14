import os
from alembic.config import Config
from alembic import command


def run_migrations():
    # Get the absolute path to the alembic.ini file
    alembic_ini_path = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")

    # Create Alembic configuration
    alembic_cfg = Config(alembic_ini_path)

    # Run the migration command
    command.upgrade(alembic_cfg, "head")


if __name__ == "__main__":
    run_migrations()
