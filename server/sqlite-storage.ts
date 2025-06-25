/***********************************************************************
* server/sqlite-storage.ts
*
* In-memory singleton wrapper around an on-disk SQLite database.
*  • Forces the DB file to live at   /data/issues.db   (adjust if needed)
*  • Creates / migrates all tables at start-up
*  • Implements every method required by IStorage
***********************************************************************/

import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";
import { log } from "./vite";

import {
 User,          InsertUser,
 Issue,         InsertIssue,
 Comment,       InsertComment,
 Image,         InsertImage,
 StatusHistory, InsertStatusHistory,
 IssueStatus,   IssueType
} from "@shared/schema";

import { IStorage } from "./storage";

/* Location of the DB file (→ /data/issues.db) */
const DB_PATH = path.join(process.cwd(), "data", "issues.db");

/* -------------------------------------------------------------- */
/*  Singleton DB handle                                           */
/* -------------------------------------------------------------- */
let db: Database | undefined;

async function getDb(): Promise<Database> {
 if (db) return db;

 /* ensure /data folder exists */
 const fs = await import("fs/promises");
 await fs.mkdir(path.dirname(DB_PATH), { recursive: true });

 db = await open({ filename: DB_PATH, driver: sqlite3.Database });
 await db.run("PRAGMA foreign_keys = ON");
 return db;
}

/* ------------------------------------------------------------------ */
/*  Main storage class                                                */
/* ------------------------------------------------------------------ */
export class SQLiteStorage implements IStorage {
 /* Call await storage.init() once during app boot-strap */
 async init(): Promise<void> {
   log(`SQLite DB @ ${DB_PATH}`, "sqlite");
   await this.initializeSchema();
   log("SQLite schema ready", "sqlite");
 }

 /* ------------------------------------------------------------ */
 /*  Create / migrate ALL tables (runs every start-up, idempotent)*/
 /* ------------------------------------------------------------ */
 private async initializeSchema(): Promise<void> {
   const db = await getDb();

   await db.exec(`
     /* ─────────────────────────────── users table ────────────────────────────── */
     CREATE TABLE IF NOT EXISTS users (
       id            INTEGER PRIMARY KEY AUTOINCREMENT,
       username      TEXT NOT NULL UNIQUE,
       password      TEXT NOT NULL,
       display_name  TEXT,
       avatar_url    TEXT
     );

     /* ─────────────────────────────── issues table ───────────────────────────── */
     CREATE TABLE IF NOT EXISTS issues (
       id              INTEGER PRIMARY KEY AUTOINCREMENT,
       title           TEXT NOT NULL,
       description     TEXT NOT NULL,
       location        TEXT NOT NULL,
       status          TEXT DEFAULT 'pending',
       priority        TEXT DEFAULT 'medium',
       issueType       TEXT DEFAULT 'other',
       latitude        REAL,
       longitude       REAL,
       pinX            REAL,
       pinY            REAL,
       isInteriorPin   INTEGER,
       reportedById    INTEGER NOT NULL,
       reportedByName  TEXT    NOT NULL,
       estimatedCost   REAL    DEFAULT 0,
       finalCost       REAL,
       fixedById       INTEGER,
       fixedByName     TEXT,
       fixedAt         TEXT,
       timeToFix       INTEGER,
       createdAt       TEXT NOT NULL,
       updatedAt       TEXT NOT NULL
     );

     /* ────────────────────────────── comments table ──────────────────────────── */
     CREATE TABLE IF NOT EXISTS comments (
       id        INTEGER PRIMARY KEY AUTOINCREMENT,
       content   TEXT NOT NULL,
       userId    INTEGER,
       username  TEXT NOT NULL,
       issueId   INTEGER NOT NULL,
       createdAt TEXT NOT NULL
     );

     /* ─────────────────────────────── images table ───────────────────────────── */
     CREATE TABLE IF NOT EXISTS images (
       id        INTEGER PRIMARY KEY AUTOINCREMENT,
       filename  TEXT NOT NULL,
       issueId   INTEGER NOT NULL,
       createdAt TEXT NOT NULL
     );

     /* ──────────────────────────── status_history table ──────────────────────── */
     CREATE TABLE IF NOT EXISTS status_history (
       id            INTEGER PRIMARY KEY AUTOINCREMENT,
       issueId       INTEGER NOT NULL,
       oldStatus     TEXT NOT NULL,
       newStatus     TEXT NOT NULL,
       changedById   INTEGER,
       changedByName TEXT,
       notes         TEXT,
       createdAt     TEXT NOT NULL
     );

     /* ────────────────────────────── machines table ──────────────────────────── */
     CREATE TABLE IF NOT EXISTS machines (
       id               INTEGER PRIMARY KEY AUTOINCREMENT,
       name             TEXT NOT NULL,
       serialNumber     TEXT NOT NULL,
       categoryId       INTEGER,
       installationDate TEXT,
       lastServiceDate  TEXT,
       nextServiceDate  TEXT,
       imageUrl         TEXT,
       createdAt        TEXT NOT NULL,
       updatedAt        TEXT NOT NULL
     );

     /* ────────────────────────── machine_categories table ────────────────────── */
     CREATE TABLE IF NOT EXISTS machine_categories (
       id                 INTEGER PRIMARY KEY AUTOINCREMENT,
       name               TEXT NOT NULL,
       serviceIntervalDays INTEGER DEFAULT 0
     );

     /* ─────────────────────────── machine_services table ─────────────────────── */
     CREATE TABLE IF NOT EXISTS machine_services (
       id          INTEGER PRIMARY KEY AUTOINCREMENT,
       machineId   INTEGER NOT NULL,
       title       TEXT NOT NULL,
       notes       TEXT,
       cost        REAL DEFAULT 0,
       serviceDate TEXT NOT NULL,
       createdAt   TEXT NOT NULL,
       FOREIGN KEY (machineId) REFERENCES machines(id) ON DELETE CASCADE
     );

     /* ────────────────────────── machine_assignments table ───────────────────── */
     CREATE TABLE IF NOT EXISTS machine_assignments (
       id                   INTEGER PRIMARY KEY AUTOINCREMENT,
       machineId            INTEGER NOT NULL,
       userId               INTEGER NOT NULL,
       notificationEnabled  INTEGER DEFAULT 1,
       createdAt            TEXT NOT NULL,
       FOREIGN KEY (machineId) REFERENCES machines(id) ON DELETE CASCADE
     );

     /* ───────────────────────────── notifications table ──────────────────────── */
     CREATE TABLE IF NOT EXISTS notifications (
       id              INTEGER PRIMARY KEY AUTOINCREMENT,
       userId          INTEGER NOT NULL,
       title           TEXT NOT NULL,
       message         TEXT NOT NULL,
       type            TEXT,
       relatedMachineId INTEGER,
       link            TEXT,
       createdAt       TEXT NOT NULL
     );
   `);
 }

 /* ============================================================================
  *  USERS
  * ========================================================================== */
 async getUser(id: number): Promise<User | undefined> {
   const db = await getDb();
   return db.get<User>("SELECT * FROM users WHERE id = ?", id);
 }

 async getUserByUsername(username: string): Promise<User | undefined> {
   const db = await getDb();
   return db.get<User>("SELECT * FROM users WHERE username = ?", username);
 }

 async createUser(u: InsertUser): Promise<User> {
   const db = await getDb();
   const res = await db.run(
     `INSERT INTO users (username, password, display_name, avatar_url)
      VALUES (?, ?, ?, ?)`,
     u.username, u.password, u.displayName, u.avatarUrl
   );
   return {
     id: res.lastID!,
     username: u.username,
     password: u.password,
     displayName: u.displayName ?? null,
     avatarUrl: u.avatarUrl ?? null
   };
 }

 /* ============================================================================
  *  ISSUES
  * ========================================================================== */
 async getIssues(): Promise<Issue[]> {
   const db = await getDb();
   const list = await db.all<Issue[]>(`SELECT * FROM issues ORDER BY updatedAt DESC`);
   for (const issue of list) {
     const imgs = await db.all<{filename: string}[]>(
       "SELECT filename FROM images WHERE issueId = ?", issue.id
     );
     issue.imageUrls = imgs.map(i => i.filename);
   }
   return list;
 }

 async getIssue(id: number): Promise<Issue | undefined> {
   const db = await getDb();
   const issue = await db.get<Issue>("SELECT * FROM issues WHERE id = ?", id);
   if (!issue) return undefined;
   const imgs = await db.all<{filename: string}[]>(
     "SELECT filename FROM images WHERE issueId = ?", id
   );
   issue.imageUrls = imgs.map(i => i.filename);
   return issue;
 }

 async createIssue(i: InsertIssue): Promise<Issue> {
   const db  = await getDb();
   const now = new Date().toISOString();
   const res = await db.run(
     `INSERT INTO issues (
        title, description, location, status, priority, issueType,
        latitude, longitude, pinX, pinY, isInteriorPin,
        reportedById, reportedByName, estimatedCost,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
     i.title, i.description, i.location,
     i.status ?? "pending",
     i.priority ?? "medium",
     i.issueType ?? "other",
     i.latitude, i.longitude, i.pinX, i.pinY,
     i.isInteriorPin ? 1 : 0,
     i.reportedById, i.reportedByName,
     i.estimatedCost ?? 0,
     now, now
   );
   const newId = res.lastID!;
   if (i.imageUrls?.length) {
     const sql = `INSERT INTO images (filename, issueId, createdAt) VALUES (?, ?, ?)`;
     for (const url of i.imageUrls) await db.run(sql, url, newId, now);
   }
   return (await this.getIssue(newId))!;
 }

 async updateIssue(
   id: number,
   upd: Partial<InsertIssue>
 ): Promise<Issue | undefined> {
   const db  = await getDb();
   const now = new Date().toISOString();

   const allowed: Record<string, any> = {
     title: upd.title, description: upd.description, location: upd.location,
     status: upd.status, priority: upd.priority, issueType: upd.issueType,
     latitude: upd.latitude, longitude: upd.longitude,
     pinX: upd.pinX, pinY: upd.pinY, isInteriorPin: upd.isInteriorPin ? 1 : 0,
     estimatedCost: upd.estimatedCost, finalCost: upd.finalCost
   };

   const fields: string[] = [];
   const values: any[]   = [];
   for (const [k, v] of Object.entries(allowed)) {
     if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); }
   }
   fields.push("updatedAt = ?"); values.push(now, id);

   if (fields.length > 1) {
     await db.run(`UPDATE issues SET ${fields.join(", ")} WHERE id = ?`, values);
   }
   return this.getIssue(id);
 }

 async deleteIssue(id: number): Promise<boolean> {
   const db = await getDb();
   const res = await db.run("DELETE FROM issues WHERE id = ?", id);
   return res.changes! > 0;
 }

 /* ============================================================================
  *  COMMENTS
  * ========================================================================== */
 async getComments(issueId: number): Promise<Comment[]> {
   const db = await getDb();
   return db.all<Comment[]>(
     `SELECT * FROM comments WHERE issueId = ? ORDER BY createdAt ASC`, issueId
   );
 }

 async createComment(c: InsertComment): Promise<Comment> {
   const db  = await getDb();
   const now = new Date().toISOString();
   const res = await db.run(
     `INSERT INTO comments (content, userId, username, issueId, createdAt)
      VALUES (?, ?, ?, ?, ?)`,
     c.content, c.userId ?? null, c.username, c.issueId, now
   );
   return db.get<Comment>("SELECT * FROM comments WHERE id = ?", res.lastID!);
 }

 /* ============================================================================
  *  IMAGES
  * ========================================================================== */
 async getImage(id: number): Promise<Image | undefined> {
   const db = await getDb();
   return db.get<Image>("SELECT * FROM images WHERE id = ?", id);
 }

 async getImagesByIssueId(issueId: number): Promise<Image[]> {
   const db = await getDb();
   return db.all<Image[]>("SELECT * FROM images WHERE issueId = ?", issueId);
 }

 async createImage(img: InsertImage): Promise<Image> {
   const db  = await getDb();
   const now = new Date().toISOString();
   const res = await db.run(
     `INSERT INTO images (filename, issueId, createdAt) VALUES (?, ?, ?)`,
     img.filename, img.issueId, now
   );
   return db.get<Image>("SELECT * FROM images WHERE id = ?", res.lastID!);
 }

 /* ============================================================================
  *  STATUS HISTORY
  * ========================================================================== */
 async getStatusHistory(issueId: number): Promise<StatusHistory[]> {
   const db = await getDb();
   return db.all<StatusHistory[]>(
     `SELECT * FROM status_history WHERE issueId = ? ORDER BY createdAt DESC`,
     issueId
   );
 }

 async createStatusHistory(h: InsertStatusHistory): Promise<StatusHistory> {
   const db  = await getDb();
   const now = new Date().toISOString();
   const res = await db.run(
     `INSERT INTO status_history (
        issueId, oldStatus, newStatus,
        changedById, changedByName, notes, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
     h.issueId, h.oldStatus, h.newStatus,
     h.changedById, h.changedByName, h.notes, now
   );
   return db.get<StatusHistory>(
     "SELECT * FROM status_history WHERE id = ?", res.lastID!
   );
 }

 /* ============================================================================
  *  Mark / update status helpers
  * ========================================================================== */
 async updateIssueStatus(
   id: number,
   newStatus: IssueStatus,
   changedById?: number,
   changedByName?: string,
   notes?: string
 ): Promise<Issue | undefined> {
   const db   = await getDb();
   const issue = await this.getIssue(id);
   if (!issue) return undefined;

   if (issue.status === newStatus) return issue;

   /* Start transaction */
   await db.run("BEGIN");
   try {
     const now = new Date().toISOString();
     await db.run(
       `UPDATE issues SET status = ?, updatedAt = ? WHERE id = ?`,
       newStatus, now, id
     );
     await db.run(
       `INSERT INTO status_history (
          issueId, oldStatus, newStatus,
          changedById, changedByName, notes, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
       id, issue.status, newStatus, changedById, changedByName, notes, now
     );
     if (newStatus === IssueStatus.FIXED) {
       const diffMin = Math.floor(
         (Date.now() - new Date(issue.createdAt).getTime()) / (1000 * 60)
       );
       await db.run(
         `UPDATE issues SET fixedAt = ?, timeToFix = ?,
          fixedById = ?, fixedByName = ? WHERE id = ?`,
         now, diffMin, changedById, changedByName, id
       );
     }
     await db.run("COMMIT");
     return this.getIssue(id);
   } catch (err) {
     await db.run("ROLLBACK");
     throw err;
   }
 }

 async markIssueAsFixed(
   id: number,
   fixedById: number,
   fixedByName: string,
   notes?: string
 ): Promise<Issue | undefined> {
   return this.updateIssueStatus(
     id, IssueStatus.FIXED, fixedById, fixedByName, notes
   );
 }

 /* ============================================================================
  *  BASIC STATS
  * ========================================================================== */
 async getIssueStatistics(issueType?: IssueType): Promise<{
   totalIssues: number; openIssues: number; fixedIssues: number;
   averageFixTime?: number; mostReportedLocation?: string; lastFixDate?: Date;
 }> {
   const db = await getDb();
   const tf = issueType ? "WHERE issueType = ?" : "";
   const tp = issueType ? [issueType] : [];

   const total       = (await db.get<{cnt:number}>(`SELECT COUNT(*) cnt FROM issues ${tf}`, ...tp)).cnt;
   const open        = (await db.get<{cnt:number}>(`
     SELECT COUNT(*) cnt FROM issues WHERE status != '${IssueStatus.FIXED}'
     ${tf ? "AND " + tf.slice(6) : ""}`, ...tp)).cnt;
   const fixed       = (await db.get<{cnt:number}>(`
     SELECT COUNT(*) cnt FROM issues WHERE status = '${IssueStatus.FIXED}'
     ${tf ? "AND " + tf.slice(6) : ""}`, ...tp)).cnt;
   const avgFixTime  = (await db.get<{avg:number|null}>(`
     SELECT AVG(timeToFix) avg FROM issues
     WHERE status = '${IssueStatus.FIXED}' AND timeToFix IS NOT NULL
     ${tf ? "AND " + tf.slice(6) : ""}`, ...tp)).avg ?? undefined;
   const topLoc      = await db.get<{location:string}>(`
     SELECT location, COUNT(*) c FROM issues ${tf}
     GROUP BY location ORDER BY c DESC LIMIT 1`, ...tp);
   const lastDate    = await db.get<{fixedAt:string}>(`
     SELECT fixedAt FROM issues
     WHERE status = '${IssueStatus.FIXED}' AND fixedAt IS NOT NULL
     ${tf ? "AND " + tf.slice(6) : ""} ORDER BY fixedAt DESC LIMIT 1`, ...tp);

   return {
     totalIssues: total,
     openIssues : open,
     fixedIssues: fixed,
     averageFixTime,
     mostReportedLocation: topLoc?.location,
     lastFixDate: lastDate ? new Date(lastDate.fixedAt) : undefined
   };
 }
}