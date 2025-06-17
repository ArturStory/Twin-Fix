#!/bin/bash
# This script starts the application with SQLite database storage

echo "Starting Twin Fix application with SQLite database"

# Create data directory if it doesn't exist
mkdir -p data

# Set environment variable to enable SQLite mode
export USE_SQLITE=true

# Unset PostgreSQL environment variables to ensure we use SQLite
unset DATABASE_URL
unset PGDATABASE
unset PGUSER
unset PGPASSWORD
unset PGPORT
unset PGHOST

# Run the development server with SQLite mode
NODE_ENV=development tsx server/sqlite-start.ts