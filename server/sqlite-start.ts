// ✅ Force SQLite mode and disable PostgreSQL
process.env.USE_SQLITE = 'true';
delete process.env.DATABASE_URL;

// ✅ Show that SQLite mode is active
console.log("🔧 Using SQLite mode (USE_SQLITE):", process.env.USE_SQLITE);

// ✅ Start
console.log('🟢 Starting server with SQLite storage enabled');

// ✅ Import database migration function
import { migrateDatabase } from './drizzle-sqlite';

// ✅ Run migrations and start the server
migrateDatabase()
  .then(async () => {
    console.log('✅ SQLite database initialized');
    console.log('⚡ Migrations finished. Attempting to start the server...');

    try {
      await import('./index');
    } catch (err) {
      console.error('❌ Failed to import server/index.ts:', err);
    }
  })
  .catch(error => {
    console.error('❌ Failed to initialize SQLite database:', error);
    process.exit(1);
  });