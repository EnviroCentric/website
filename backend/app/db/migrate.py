import os
import logging
from app.db.engine import get_connection

logger = logging.getLogger(__name__)

def split_sql_statements(sql: str) -> list[str]:
    """Split SQL file into individual statements."""
    # Remove comments
    lines = []
    for line in sql.split('\n'):
        if not line.strip().startswith('--'):
            lines.append(line)
    
    # Join lines and split by semicolon
    sql_no_comments = '\n'.join(lines)
    statements = [stmt.strip() for stmt in sql_no_comments.split(';') if stmt.strip()]
    return statements

async def run_migrations():
    """Run all SQL migrations in the migrations directory."""
    migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
    
    # Get all SQL files and sort them
    migration_files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])
    
    # Create connection pool
    pool = await get_connection()
    
    try:
        async with pool.acquire() as conn:
            for migration_file in migration_files:
                logger.info(f"Running migration: {migration_file}")
                file_path = os.path.join(migrations_dir, migration_file)
                
                with open(file_path, 'r') as f:
                    sql = f.read()
                
                # Split SQL into individual statements
                statements = split_sql_statements(sql)
                
                # Execute each statement separately
                for statement in statements:
                    if statement:  # Skip empty statements
                        await conn.execute(statement)
                
                logger.info(f"Completed migration: {migration_file}")
    finally:
        await pool.close()

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_migrations()) 