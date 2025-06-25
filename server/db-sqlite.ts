import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'issues.db');

export const initDb = async () => {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  console.log("🔧 Attempting to create table...");

  await db.exec(`
    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'open'
    );
  `);

  console.log("✅ Table created (or already exists).");

  return db;
};