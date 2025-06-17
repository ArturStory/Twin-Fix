import { sql } from 'drizzle-orm';
import { db, pool } from '../server/db';

/**
 * Migration to update the users table with new fields for enhanced login system
 */
async function updateUsersSchema() {
  console.log('Starting user schema update migration...');
  
  try {
    // Check if necessary columns already exist
    const columnsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('phone', 'photo', 'position', 'role');
    `);
    
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    console.log('Existing columns:', existingColumns);
    
    // Start a transaction to ensure all changes are applied or none
    await pool.query('BEGIN');
    
    // Add phone column if it doesn't exist
    if (!existingColumns.includes('phone')) {
      console.log('Adding phone column to users table...');
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN phone TEXT NULL;
      `);
    }
    
    // Add photo column if it doesn't exist
    if (!existingColumns.includes('photo')) {
      console.log('Adding photo column to users table...');
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN photo TEXT NULL;
      `);
    }
    
    // Add position column if it doesn't exist
    if (!existingColumns.includes('position')) {
      console.log('Adding position column to users table...');
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN position TEXT NULL;
      `);
    }
    
    // Add role column if it doesn't exist
    if (!existingColumns.includes('role')) {
      console.log('Adding role column to users table...');
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN role TEXT NOT NULL DEFAULT 'reporter';
      `);
    }
    
    // Make email NOT NULL if needed
    const emailNullableResult = await pool.query(`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'email';
    `);
    
    if (emailNullableResult.rows.length > 0 && emailNullableResult.rows[0].is_nullable === 'YES') {
      console.log('Making email column NOT NULL...');
      // First update any NULL emails to empty string
      await pool.query(`
        UPDATE users
        SET email = ''
        WHERE email IS NULL;
      `);
      
      // Then alter the column to NOT NULL
      await pool.query(`
        ALTER TABLE users
        ALTER COLUMN email SET NOT NULL;
      `);
    }
    
    // Commit the transaction
    await pool.query('COMMIT');
    console.log('User schema update migration completed successfully!');
    
  } catch (error) {
    // Rollback in case of errors
    await pool.query('ROLLBACK');
    console.error('Error updating user schema:', error);
    throw error;
  }
}

async function createAdminUser() {
  console.log('Checking if admin user exists...');
  
  try {
    // Check if admin user already exists
    const adminResult = await pool.query(`
      SELECT id FROM users WHERE role = 'admin' LIMIT 1
    `);
    
    if (adminResult.rows.length === 0) {
      console.log('Creating default admin user...');
      
      // Create a default admin user
      await db.execute(sql`
        INSERT INTO users (username, email, password, role, position)
        VALUES ('admin', 'admin@mcdonalds-repairs.com', '$2b$10$rIC1Vk./Tk5WlCzFqUu.nuhS.PAKKcqZlPXKyRFTnPt9OYZqkBDEG', 'admin', 'System Administrator')
      `);
      // Note: password hash is for 'adminpassword'
      
      console.log('Default admin user created successfully');
    } else {
      console.log('Admin user already exists, skipping creation');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

// Run migrations
(async function runMigration() {
  try {
    await updateUsersSchema();
    await createAdminUser();
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
})();