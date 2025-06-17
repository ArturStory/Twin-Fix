import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import ws from 'ws';

// Required for Neon serverless
neonConfig.webSocketConstructor = ws;

async function addColumnsIfNotExist() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  console.log('Starting database schema update...');
  
  try {
    // Check if the status_history table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'status_history'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Creating status_history table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS status_history (
          id SERIAL PRIMARY KEY,
          issue_id INTEGER NOT NULL REFERENCES issues(id),
          old_status TEXT,
          new_status TEXT NOT NULL,
          changed_by_id INTEGER REFERENCES users(id),
          changed_by_name TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('status_history table created successfully');
    }
    
    // Check if issue_type column exists in issues table
    const issueTypeExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'issues' AND column_name = 'issue_type'
      );
    `);
    
    if (!issueTypeExists.rows[0].exists) {
      console.log('Adding issue_type column to issues table...');
      await db.execute(sql`
        ALTER TABLE issues 
        ADD COLUMN issue_type TEXT DEFAULT 'other';
      `);
      console.log('issue_type column added successfully');
    }
    
    // Check if pin_x column exists in issues table
    const pinXExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'issues' AND column_name = 'pin_x'
      );
    `);
    
    if (!pinXExists.rows[0].exists) {
      console.log('Adding pin coordinates columns to issues table...');
      await db.execute(sql`
        ALTER TABLE issues 
        ADD COLUMN pin_x REAL,
        ADD COLUMN pin_y REAL,
        ADD COLUMN is_interior_pin BOOLEAN;
      `);
      console.log('Pin coordinate columns added successfully');
    }
    
    // Check if fixed_by_id column exists in issues table
    const fixedByIdExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'issues' AND column_name = 'fixed_by_id'
      );
    `);
    
    if (!fixedByIdExists.rows[0].exists) {
      console.log('Adding repair tracking columns to issues table...');
      await db.execute(sql`
        ALTER TABLE issues 
        ADD COLUMN fixed_by_id INTEGER REFERENCES users(id),
        ADD COLUMN fixed_by_name TEXT,
        ADD COLUMN fixed_at TIMESTAMP,
        ADD COLUMN time_to_fix INTEGER;
      `);
      console.log('Repair tracking columns added successfully');
    }
    
    console.log('Database schema update completed successfully');
  } catch (error) {
    console.error('Database schema update failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addColumnsIfNotExist();