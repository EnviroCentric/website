#!/bin/bash
set -e

echo "Running database migrations..."
python db/migrate.py

echo "Starting the application..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 ${UVICORN_EXTRA_FLAGS:-} 