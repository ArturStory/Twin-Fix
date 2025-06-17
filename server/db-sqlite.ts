/**
 * SQLite database connection using better-sqlite3 and drizzle-orm
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import path from 'path';
import fs from 'fs';

// Create database directory if it doesn't exist
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Database file path
const DB_PATH = path.join(dbDir, 'issues.db');
console.log(`SQLite database path: ${DB_PATH}`);

// Create SQLite database connection
const sqlite = new Database(DB_PATH);

// Initialize SQLite with foreign keys enabled
sqlite.pragma('foreign_keys = ON');

// Export the drizzle DB instance
export const db = drizzle(sqlite, { schema });