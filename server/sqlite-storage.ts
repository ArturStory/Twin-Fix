// server/sqlite-storage.ts

import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";
export let db: Database;

export async function initialize() {
 const dbPath = path.resolve("data", "issues.db");
 db = await open({
   filename: dbPath,
   driver: sqlite3.Database
 });

 log("Creating database tables directly...");

 await db.exec(`
   CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     email TEXT UNIQUE NOT NULL,
     role TEXT NOT NULL,
     createdAt TEXT NOT NULL,
     updatedAt TEXT NOT NULL
   );

   CREATE TABLE IF NOT EXISTS issues (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     title TEXT NOT NULL,
     description TEXT,
     status TEXT NOT NULL,
     createdById INTEGER,
     assignedToId INTEGER,
     imageUrl TEXT,
     createdAt TEXT NOT NULL,
     updatedAt TEXT NOT NULL
   );

   CREATE TABLE IF NOT EXISTS comments (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     issueId INTEGER NOT NULL,
     userId INTEGER NOT NULL,
     content TEXT NOT NULL,
     createdAt TEXT NOT NULL
   );

   CREATE TABLE IF NOT EXISTS images (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     issueId INTEGER NOT NULL,
     url TEXT NOT NULL,
     uploadedById INTEGER,
     uploadedAt TEXT NOT NULL
   );

   CREATE TABLE IF NOT EXISTS statusHistory (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     issueId INTEGER NOT NULL,
     oldStatus TEXT NOT NULL,
     newStatus TEXT NOT NULL,
     changedById INTEGER,
     changedByName TEXT,
     notes TEXT,
     createdAt TEXT NOT NULL
   );

   CREATE TABLE IF NOT EXISTS machines (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     serialNumber TEXT NOT NULL,
     categoryId INTEGER,
     installationDate TEXT,
     lastServiceDate TEXT,
     nextServiceDate TEXT,
     imageUrl TEXT,
     createdAt TEXT NOT NULL,
     updatedAt TEXT NOT NULL
   );

   CREATE TABLE IF NOT EXISTS notifications (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     userId INTEGER NOT NULL,
     title TEXT NOT NULL,
     message TEXT NOT NULL,
     type TEXT,
     relatedMachineId INTEGER,
     link TEXT,
     createdAt TEXT NOT NULL
   );
 `);

 log("✅ migrations finished");
}