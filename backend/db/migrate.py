import os
import psycopg


def run_migrations():
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is not set")

    print("Connecting to database...")
    with psycopg.connect(DATABASE_URL) as conn:
        conn.autocommit = True
        with conn.cursor() as cursor:
            try:
                # Create migrations table if it doesn't exist
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS migrations (
                        id SERIAL PRIMARY KEY,
                        migration_name VARCHAR(255) UNIQUE NOT NULL,
                        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                """
                )

                # Get list of executed migrations
                cursor.execute("SELECT migration_name FROM migrations")
                executed_migrations = {row[0] for row in cursor.fetchall()}

                # Get all migration files
                migration_files = sorted(
                    [f for f in os.listdir("db/migrations") if f.endswith(".sql")]
                )

                for migration_file in migration_files:
                    if migration_file not in executed_migrations:
                        try:
                            print(f"Executing migration: {migration_file}")
                            with open(f"db/migrations/{migration_file}", "r") as f:
                                sql = f.read()
                                cursor.execute(sql)

                            # Record the migration
                            cursor.execute(
                                "INSERT INTO migrations (migration_name) VALUES (%s)",
                                (migration_file,),
                            )
                            print(f"Migration completed: {migration_file}")
                        except Exception as e:
                            msg = f"Error in {migration_file}: {str(e)}"
                            print(msg)
                            if "already exists" not in str(e):
                                raise Exception(msg) from e
                    else:
                        print(f"Skipping executed migration: {migration_file}")

            except Exception as e:
                print(f"Migration error: {str(e)}")
                raise e

    print("Database connection closed")


if __name__ == "__main__":
    run_migrations()
