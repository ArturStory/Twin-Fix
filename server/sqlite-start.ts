/**
 * This is a wrapper script to start the server with SQLite storage enabled.
 * It sets the environment variables before importing any modules to ensure
 * the SQLite database is used instead of PostgreSQL.
 * 
 * This provides a complete SQLite-based alternative to the PostgreSQL database
 * for development and testing purposes.
 */
console.log("✅ Twin Fix server starting...");
// Force enable SQLite mode before importing any modules
process.env.USE_SQLITE = 'true';

// Disable PostgreSQL mode by unsetting the DATABASE_URL
delete process.env.DATABASE_URL;

// Configure paths for the drizzle schema
process.env.DRIZZLE_SCHEMA = './shared/schema-sqlite.ts';

console.log('Starting server with SQLite storage enabled');

// Initialize the SQLite database
import { migrateDatabase } from './drizzle-sqlite';

// Run migrations before starting the server
migrateDatabase()
 .then(async () => {
  console.log('✅ SQLite database initialized, starting server...');
  console.log('⚡️ Migrations finished. Attempting to start the server...');
  try {
    await import('./index');
  } catch (err) {
    console.error('❌ Failed to import server/index.ts:', err);
  }
}) 