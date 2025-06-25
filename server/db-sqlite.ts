import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

// This function opens the SQLite DB connection
export async function initDb() {
  const dbPath = path.join(process.cwd(), "data", "issues.db");
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
  return db;
}

// If needed, export db directly
export const db = await initDb();