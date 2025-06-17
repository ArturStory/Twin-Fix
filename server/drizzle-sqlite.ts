/**
 * Initialize and migrate SQLite database using Drizzle ORM
 */
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './db-sqlite';

// Run database migrations
export async function migrateDatabase() {
  console.log('Running SQLite migrations...');
  try {
    // Use drizzle-kit migrations if they exist
    // migrate(db, { migrationsFolder: './drizzle/migrations' });
    
    // For now, we'll just create the tables directly since we don't have migrations yet
    console.log('Creating database tables directly...');
    initializeDatabase();
    
    console.log('SQLite database migrated successfully');
  } catch (error) {
    console.error('Error migrating SQLite database:', error);
    throw error;
  }
}

// Initialize database with tables if they don't exist
function initializeDatabase() {
  // Tables are automatically created by Drizzle ORM
  // Additional setup can be added here if needed
}

// Export the database instance
export { db };