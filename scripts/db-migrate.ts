import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Starting database migration...');
    
    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if users table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);

      if (!tableCheck.rows[0].exists) {
        console.log('Creating users table...');
        // Create users table
        await client.query(`
          CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL,
            password TEXT NOT NULL,
            phone TEXT,
            photo TEXT,
            role TEXT NOT NULL DEFAULT 'reporter',
            position TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } else {
        console.log('Users table exists, checking columns...');
        
        // Check if columns exist and add them if they don't
        const columnsQuery = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'users';
        `);
        
        const existingColumns = columnsQuery.rows.map(row => row.column_name);
        
        // Check and add created_at column
        if (!existingColumns.includes('created_at')) {
          console.log('Adding created_at column...');
          await client.query(`
            ALTER TABLE users 
            ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
          `);
        }
        
        // Check and add updated_at column
        if (!existingColumns.includes('updated_at')) {
          console.log('Adding updated_at column...');
          await client.query(`
            ALTER TABLE users 
            ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
          `);
        }
        
        // Check and add role column
        if (!existingColumns.includes('role')) {
          console.log('Adding role column...');
          await client.query(`
            ALTER TABLE users 
            ADD COLUMN role TEXT NOT NULL DEFAULT 'reporter';
          `);
        }
        
        // Check and add phone column
        if (!existingColumns.includes('phone')) {
          console.log('Adding phone column...');
          await client.query(`
            ALTER TABLE users 
            ADD COLUMN phone TEXT;
          `);
        }
        
        // Check and add photo column
        if (!existingColumns.includes('photo')) {
          console.log('Adding photo column...');
          await client.query(`
            ALTER TABLE users 
            ADD COLUMN photo TEXT;
          `);
        }
        
        // Check and add position column
        if (!existingColumns.includes('position')) {
          console.log('Adding position column...');
          await client.query(`
            ALTER TABLE users 
            ADD COLUMN position TEXT;
          `);
        }
      }

      // Check for session table
      const sessionTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'session'
        );
      `);

      if (!sessionTableCheck.rows[0].exists) {
        console.log('Creating session table...');
        // Create sessions table for connect-pg-simple
        await client.query(`
          CREATE TABLE "session" (
            "sid" varchar NOT NULL COLLATE "default",
            "sess" json NOT NULL,
            "expire" timestamp(6) NOT NULL,
            CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
          );
          
          CREATE INDEX "IDX_session_expire" ON "session" ("expire");
        `);
      }

      // Create first admin user if no users exist
      const userCount = await client.query('SELECT COUNT(*) FROM users;');
      if (parseInt(userCount.rows[0].count) === 0) {
        console.log('Creating default admin user...');
        await client.query(`
          INSERT INTO users (username, email, password, role)
          VALUES ('admin', 'admin@mcdonalds.com', '$2b$10$v1vU1dJ1UMoGf5aSRwXkT.LtLOKQET4uZ3lCw.TnIvmvQy/Q9LCNO', 'admin');
        `);
        console.log('Created admin user with password: admin123');
      }

      await client.query('COMMIT');
      console.log('Migration completed successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Migration failed:', err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await pool.end();
  }
}

runMigration();