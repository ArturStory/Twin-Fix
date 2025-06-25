import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'issues.db');

export const initDb = async () => {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

   Uncomment and customize this block if needed to create your table
   await db.exec(`
     CREATE TABLE IF NOT EXISTS issues (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       title TEXT NOT NULL,
       description TEXT,
       status TEXT DEFAULT 'open'
     );
   `);

  return db;
};