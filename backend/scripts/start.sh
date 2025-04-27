#!/bin/sh

# Wait for the database to be ready
while ! pg_isready -h db -p 5432 -U $POSTGRES_USER
do
    echo "Waiting for database..."
    sleep 2
done

# Start the FastAPI application with uvicorn
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 $UVICORN_EXTRA_FLAGS 