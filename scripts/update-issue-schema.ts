/**
 * Script to update the issues table to add the missing imageUrls column
 * This must be run after adding the metadata column to the images table
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function updateIssueSchema() {
  console.log('Adding imageUrls column to issues table...');
  
  try {
    // Check if the column already exists
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'issues' 
      AND column_name = 'image_urls';
    `);
    
    if ((result as any).rows.length === 0) {
      console.log('Column does not exist. Adding it now...');
      
      // Add the missing column
      await db.execute(sql`
        ALTER TABLE issues
        ADD COLUMN IF NOT EXISTS image_urls TEXT[];
      `);
      
      console.log('Successfully added imageUrls column to issues table!');
    } else {
      console.log('Column already exists. No changes needed.');
    }
  } catch (error) {
    console.error('Error updating issues table:', error);
  }
  
  process.exit(0);
}

updateIssueSchema();