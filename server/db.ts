import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../sqlite.db');
export const db = new Database(dbPath);