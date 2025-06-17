# SQLite Support for Twin Fix

This application supports SQLite as an alternative database to PostgreSQL. This is useful for:

1. Development without requiring a PostgreSQL server
2. Testing with an isolated database
3. Deployments where PostgreSQL is not available
4. Lightweight installations with minimal dependencies

## Using SQLite

To run the application with SQLite, use the included shell script:

```bash
./start_with_sqlite.sh
```

This script:
- Creates a `data` directory for the SQLite database
- Sets environment variables to use SQLite instead of PostgreSQL
- Unsets PostgreSQL environment variables
- Starts the server with SQLite storage

## Implementation Details

The SQLite implementation uses:

- `better-sqlite3` for the database connection
- `drizzle-orm` for ORM functionality
- SQLite-specific schema definitions in `shared/schema-sqlite.ts`
- A custom database connection in `server/db-sqlite.ts`

## Project Structure

- `start_with_sqlite.sh` - Script to start the app with SQLite
- `server/sqlite-start.ts` - TypeScript entry point for SQLite mode
- `server/db-sqlite.ts` - SQLite database connection configuration
- `shared/schema-sqlite.ts` - SQLite-specific schema definitions
- `drizzle-sqlite.config.ts` - Drizzle ORM configuration for SQLite
- `data/issues.db` - SQLite database file (created automatically)

## Database Migration

The application will automatically create tables in the SQLite database based on the schema definitions. This happens when you start the application in SQLite mode.

To generate migrations manually (if needed):

```bash
# Generate migrations for SQLite
npx drizzle-kit generate --config=drizzle-sqlite.config.ts
```

## Troubleshooting

If you experience issues with the SQLite implementation:

1. Check if the `data` directory exists and is writable
2. Verify that the SQLite database file exists in `data/issues.db`
3. Look for error messages in the server logs

If everything fails, you can delete the database file to start fresh:

```bash
rm -f data/issues.db
```

Then restart the application with the SQLite script.