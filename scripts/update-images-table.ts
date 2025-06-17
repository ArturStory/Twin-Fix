/**
 * This script updates the images table to add the missing columns
 */
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function updateImagesTable() {
  console.log('Adding missing columns to images table...');
  
  try {
    // Check all columns and tables
    const result = await db.execute(sql`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name = 'images';
    `);
    
    console.log('Existing columns in images table:', (result as any).rows);
    
    // Check if metadata column exists
    const hasMetadata = (result as any).rows.some(row => row.column_name === 'metadata');
    
    if (!hasMetadata) {
      console.log('Metadata column is missing. Adding it now...');
      
      // Add just the metadata column
      await db.execute(sql`
        ALTER TABLE images
        ADD COLUMN IF NOT EXISTS metadata TEXT;
      `);
      
      console.log('Successfully added metadata column to images table!');
    } else {
      console.log('All required columns already exist. No changes needed.');
    }
    
    // Check if issue_id is nullable
    const issueIdRow = (result as any).rows.find(row => row.column_name === 'issue_id');
    if (issueIdRow) {
      // Get constraint info
      const constraintResult = await db.execute(sql`
        SELECT c.conname, c.contype
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
        WHERE a.attname = 'issue_id'
        AND c.conrelid = 'images'::regclass
        AND c.contype = 'n';
      `);
      
      if ((constraintResult as any).rows.length > 0) {
        console.log('Making issue_id column nullable...');
        
        await db.execute(sql`
          ALTER TABLE images
          ALTER COLUMN issue_id DROP NOT NULL;
        `);
        
        console.log('Successfully made issue_id column nullable!');
      } else {
        console.log('issue_id is already nullable. No changes needed.');
      }
    }
  } catch (error) {
    console.error('Error updating images table:', error);
  }
  
  process.exit(0);
}

updateImagesTable();