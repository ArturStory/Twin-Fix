/**
 * Database cleanup script for testing purposes
 * 
 * This script deletes all issues and related data from the database
 * Useful for testing the app with a fresh state
 */

import { db } from "../server/db";
import { issues, comments, statusChanges, images } from "../shared/schema";

async function cleanDatabase() {
  try {
    console.log("Starting database cleanup...");
    
    // 1. Delete all comments
    await db.delete(comments);
    console.log("✓ Deleted all comments");
    
    // 2. Delete all status history
    await db.delete(statusChanges);
    console.log("✓ Deleted all status history");
    
    // 3. Delete all images
    await db.delete(images);
    console.log("✓ Deleted all images");
    
    // 4. Delete all issues
    await db.delete(issues);
    console.log("✓ Deleted all issues");
    
    console.log("Database cleanup completed successfully!");
  } catch (error) {
    console.error("Error during database cleanup:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the cleanup
cleanDatabase();