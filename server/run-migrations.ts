/**
 * Script to run all migrations in sequence
 * 
 * This ensures the database is properly set up with all required data
 */

import { createDefaultUsers } from './migrations/create-default-users';

async function runAllMigrations() {
  try {
    console.log('Starting migrations process...');
    
    // Run migrations in sequence
    await createDefaultUsers();
    
    console.log('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  }
}

// Run the migrations
runAllMigrations();