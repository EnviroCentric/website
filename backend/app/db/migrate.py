import os
import psycopg2
from app.core.config import settings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_sql_file(file_path):
    """Execute a SQL file against the database."""
    try:
        with open(file_path, "r") as f:
            sql = f.read()
        logger.info(f"Connecting to database: {settings.DATABASE_URL}")
        conn = psycopg2.connect(settings.DATABASE_URL)
        try:
            with conn:
                with conn.cursor() as cursor:
                    logger.info(f"Executing SQL from {file_path}")
                    cursor.execute(sql)
                    logger.info("SQL executed successfully")
            logger.info(f"✅ Executed: {file_path}")
        except psycopg2.Error as e:
            logger.error(f"❌ Database error running {file_path}: {e}")
            raise
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"❌ Error running {file_path}: {e}")
        raise


def run_migrations():
    """Run all SQL migrations in order."""
    # Get the absolute path to the backend directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    migration_dir = os.path.join(backend_dir, "sql")

    if not os.path.exists(migration_dir):
        logger.error(f"Migration directory not found: {migration_dir}")
        raise FileNotFoundError(f"Migration directory not found: {migration_dir}")

    for filename in sorted(os.listdir(migration_dir)):
        file_path = os.path.join(migration_dir, filename)
        # Skip directories and non-SQL files
        if os.path.isdir(file_path) or not filename.endswith(".sql"):
            logger.info(f"Skipping {file_path} - not a SQL file")
            continue

        logger.info(f"Running migration: {file_path}")
        run_sql_file(file_path)


if __name__ == "__main__":
    run_migrations()
