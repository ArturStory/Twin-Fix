/* ------------------------------------------------------------------ *
*  server/sqlite-storage.ts  –  full SQLite adapter                  *
*  -----------------------------------------------------------------
*  • Written in TypeScript but uses the high-performance             *
*    synchronous “better-sqlite3” driver (zero runtime callbacks).   *
*  • Implements every method that existed in the former JS version.  *
*  • Retains the enums, JSON-encoded imageURLs column, etc.          *
*  ----------------------------------------------------------------- */

import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

// -------------------------------------------------------------------
// 1.  ENUMS (kept identical to the JS version so no API changes)     //
// -------------------------------------------------------------------
export enum IssueStatus {
 PENDING      = "pending",
 IN_PROGRESS  = "in_progress",
 COMPLETED    = "completed",
 SCHEDULED    = "scheduled",
 URGENT       = "urgent",
 FIXED        = "fixed",
}

export enum IssuePriority {
 LOW    = "low",
 MEDIUM = "medium",
 HIGH   = "high",
}

export enum IssueType {
 FRYER          = "fryer",
 GRILL          = "grill",
 ICE_CREAM      = "ice_cream_machine",
 DRINK_DISP     = "drink_dispenser",
 REFRIGERATOR   = "refrigerator",
 SEATING        = "seating",
 COUNTER        = "counter",
 BATHROOM       = "bathroom",
 FLOOR          = "floor",
 CEILING        = "ceiling",
 LIGHTING       = "lighting",
 HVAC           = "hvac",
 EXTERIOR       = "exterior",
 PLAYGROUND     = "playground",
 DRIVE_THRU     = "drive_thru",
 OTHER          = "other",
}

/* ------------------------------------------------------------------ */
/* 2.  EXTERNAL TYPES – imported from your shared schema              */
/* ------------------------------------------------------------------ */
import {
 User,               InsertUser,
 Issue,              InsertIssue,
 Comment,            InsertComment,
 Image,              InsertImage,
 StatusHistory,      InsertStatusHistory,
} from "@shared/schema";

/* ------------------------------------------------------------------ */
/* 3.  Helper: make sure /data exists & open DB                       */
/* ------------------------------------------------------------------ */
const dbDir  = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const DB_PATH = path.join(dbDir, "issues.db");
console.log(`SQLite database path: ${DB_PATH}`);

type RowID = number;

/* ------------------------------------------------------------------ */
/* 4.  Main class                                                     */
/* ------------------------------------------------------------------ */
export class SQLiteStorage {
 private db: Database.Database;

 constructor () {
   // open() synchronously – better-sqlite3 returns a ready connection
   this.db = new Database(DB_PATH);
   this.db.pragma("foreign_keys = ON");
   this.ensureSchema();
 }

 /* -------------------------------------------------------------- */
 /* 4-A.  Schema (idempotent – only creates if missing)            */
 /* -------------------------------------------------------------- */
 private ensureSchema(): void {
   console.log("Running SQLite migrations …");

   this.db.exec(`
     /* ---------------- users ---------------- */
     CREATE TABLE IF NOT EXISTS users (
       id            INTEGER PRIMARY KEY AUTOINCREMENT,
       username      TEXT NOT NULL UNIQUE,
       password      TEXT NOT NULL,
       display_name  TEXT,
       avatar_url    TEXT
     );

     /* ---------------- issues --------------- */
     CREATE TABLE IF NOT EXISTS issues (
       id              INTEGER PRIMARY KEY AUTOINCREMENT,
       title           TEXT NOT NULL,
       description     TEXT NOT NULL,
       location        TEXT NOT NULL,
       status          TEXT DEFAULT '${IssueStatus.PENDING}',
       priority        TEXT DEFAULT '${IssuePriority.MEDIUM}',
       issue_type      TEXT DEFAULT '${IssueType.OTHER}',
       latitude        REAL,
       longitude       REAL,
       pin_x           REAL,
       pin_y           REAL,
       is_interior_pin INTEGER,
       reported_by_id  INTEGER,
       reported_by_name TEXT,
       estimated_cost  REAL DEFAULT 0,
       final_cost      REAL,
       fixed_by_id     INTEGER,
       fixed_by_name   TEXT,
       fixed_at        TEXT,
       time_to_fix     INTEGER,
       created_at      TEXT NOT NULL,
       updated_at      TEXT NOT NULL,
       image_urls      TEXT          /* JSON array */
     );

     /* ---------------- comments ------------- */
     CREATE TABLE IF NOT EXISTS comments (
       id         INTEGER PRIMARY KEY AUTOINCREMENT,
       issue_id   INTEGER NOT NULL,
       user_id    INTEGER,
       username   TEXT NOT NULL,
       content    TEXT NOT NULL,
       created_at TEXT NOT NULL,
       FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
     );

     /* ---------------- images --------------- */
     CREATE TABLE IF NOT EXISTS images (
       id         INTEGER PRIMARY KEY AUTOINCREMENT,
       filename   TEXT NOT NULL,
       mime_type  TEXT NOT NULL DEFAULT 'image/jpeg',
       data       TEXT NOT NULL,
       issue_id   INTEGER,
       metadata   TEXT,
       created_at TEXT NOT NULL,
       FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
     );

     /* ------------- status history ---------- */
     CREATE TABLE IF NOT EXISTS status_history (
       id              INTEGER PRIMARY KEY AUTOINCREMENT,
       issue_id        INTEGER NOT NULL,
       old_status      TEXT,
       new_status      TEXT NOT NULL,
       changed_by_id   INTEGER,
       changed_by_name TEXT,
       notes           TEXT,
       created_at      TEXT NOT NULL,
       FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
     );

     /* ------------- machines (optional) ----- */
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

     /* ------------- notifications ----------- */
     CREATE TABLE IF NOT EXISTS notifications (
       id               INTEGER PRIMARY KEY AUTOINCREMENT,
       userId           INTEGER NOT NULL,
       title            TEXT NOT NULL,
       message          TEXT NOT NULL,
       type             TEXT,
       relatedMachineId INTEGER,
       link             TEXT,
       createdAt        TEXT NOT NULL
     );
   `);

   console.log("✅ SQLite schema ready");
 }

 /* ==================================================================
  * 5.  USERS
  * ================================================================== */

 getUser(id: RowID): User | undefined {
   const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id);
   if (!row) return undefined;
   return {
     id: row.id,
     username: row.username,
     password: row.password,
     displayName: row.display_name,
     avatarUrl: row.avatar_url,
   };
 }

 getUserByUsername(username: string): User | undefined {
   const row = this.db.prepare("SELECT * FROM users WHERE username = ?").get(username);
   if (!row) return undefined;
   return {
     id: row.id,
     username: row.username,
     password: row.password,
     displayName: row.display_name,
     avatarUrl: row.avatar_url,
   };
 }

 createUser(u: InsertUser): User {
   const info = this.db.prepare(`
     INSERT INTO users (username, password, display_name, avatar_url)
     VALUES (?, ?, ?, ?)
   `).run(u.username, u.password, u.displayName ?? null, u.avatarUrl ?? null);

   return {
     id: Number(info.lastInsertRowid),
     username: u.username,
     password: u.password,
     displayName: u.displayName ?? null,
     avatarUrl : u.avatarUrl  ?? null,
   };
 }

 /* ==================================================================
  * 6.  ISSUES  (helper: maps DB row → Issue object)
  * ================================================================== */
 private mapIssue(row: any): Issue {
   return {
     ...row,
     issueType  : row.issue_type,
     pinX       : row.pin_x,
     pinY       : row.pin_y,
     isInteriorPin: !!row.is_interior_pin,
     createdAt  : new Date(row.created_at),
     updatedAt  : new Date(row.updated_at),
     fixedAt    : row.fixed_at ? new Date(row.fixed_at) : undefined,
     imageUrls  : row.image_urls ? JSON.parse(row.image_urls) : [],
   };
 }

 getIssues(): Issue[] {
   const rows = this.db.prepare("SELECT * FROM issues ORDER BY updated_at DESC").all();
   return rows.map(this.mapIssue);
 }

 getIssue(id: RowID): Issue | undefined {
   const row = this.db.prepare("SELECT * FROM issues WHERE id = ?").get(id);
   return row ? this.mapIssue(row) : undefined;
 }

 createIssue(i: InsertIssue): Issue {
   const now = new Date().toISOString();
   const info = this.db.prepare(`
     INSERT INTO issues (
       title, description, location, status, priority, issue_type,
       latitude, longitude, pin_x, pin_y, is_interior_pin,
       reported_by_id, reported_by_name, estimated_cost, final_cost,
       created_at, updated_at, image_urls
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   `).run(
     i.title,
     i.description,
     i.location,
     i.status    ?? IssueStatus.PENDING,
     i.priority  ?? IssuePriority.MEDIUM,
     i.issueType ?? IssueType.OTHER,
     i.latitude  ?? null,
     i.longitude ?? null,
     i.pinX      ?? null,
     i.pinY      ?? null,
     i.isInteriorPin ? 1 : 0,
     i.reportedById   ?? null,
     i.reportedByName ?? null,
     i.estimatedCost  ?? 0,
     i.finalCost      ?? null,
     now, now,
     JSON.stringify(i.imageUrls ?? [])
   );

   return this.getIssue(Number(info.lastInsertRowid))!;
 }

 updateIssue(id: RowID, upd: Partial<InsertIssue>): Issue | undefined {
   if (!Object.keys(upd).length) return this.getIssue(id);

   const fieldMap: Record<string, string> = {
     title           : "title",
     description     : "description",
     location        : "location",
     status          : "status",
     priority        : "priority",
     issueType       : "issue_type",
     latitude        : "latitude",
     longitude       : "longitude",
     pinX            : "pin_x",
     pinY            : "pin_y",
     isInteriorPin   : "is_interior_pin",
     reportedById    : "reported_by_id",
     reportedByName  : "reported_by_name",
     estimatedCost   : "estimated_cost",
     finalCost       : "final_cost",
     fixedById       : "fixed_by_id",
     fixedByName     : "fixed_by_name",
     fixedAt         : "fixed_at",
     timeToFix       : "time_to_fix",
     imageUrls       : "image_urls",
   };

   const sets: string[] = [];
   const params: any[]  = [];

   for (const [k, v] of Object.entries(upd)) {
     if (!(k in fieldMap)) continue;
     const col = fieldMap[k];
     if (k === "isInteriorPin") {
       sets.push(`${col} = ?`); params.push(v ? 1 : 0);
     } else if (k === "imageUrls") {
       sets.push(`${col} = ?`); params.push(JSON.stringify(v ?? []));
     } else if (k === "fixedAt" && v instanceof Date) {
       sets.push(`${col} = ?`); params.push(v.toISOString());
     } else {
       sets.push(`${col} = ?`); params.push(v);
     }
   }

   sets.push("updated_at = ?"); params.push(new Date().toISOString(), id);

   this.db.prepare(`UPDATE issues SET ${sets.join(", ")} WHERE id = ?`).run(...params);
   return this.getIssue(id);
 }

 deleteIssue(id: RowID): boolean {
   const { changes } = this.db.prepare("DELETE FROM issues WHERE id = ?").run(id);
   return changes > 0;
 }

 /* ==================================================================
  * 7.  COMMENTS
  * ================================================================== */
 getComments(issueId: RowID): Comment[] {
   const rows = this.db.prepare("SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at ASC").all(issueId);
   return rows.map((r: any) => ({ ...r, createdAt: new Date(r.created_at) }));
 }

 createComment(c: InsertComment): Comment {
   const now = new Date().toISOString();
   const info = this.db.prepare(`
     INSERT INTO comments (content, user_id, username, issue_id, created_at)
     VALUES (?, ?, ?, ?, ?)
   `).run(c.content, c.userId ?? null, c.username, c.issueId, now);

   const row = this.db.prepare("SELECT * FROM comments WHERE id = ?").get(Number(info.lastInsertRowid));
   return { ...row, createdAt: new Date(row.created_at) };
 }

 /* ==================================================================
  * 8.  IMAGES
  * ================================================================== */
 getImage(id: RowID): Image | undefined {
   const row = this.db.prepare("SELECT * FROM images WHERE id = ?").get(id);
   return row ? { ...row, createdAt: new Date(row.created_at) } : undefined;
 }

 getImagesByIssueId(issueId: RowID): Image[] {
   const rows = this.db.prepare("SELECT * FROM images WHERE issue_id = ?").all(issueId);
   return rows.map((r: any) => ({ ...r, createdAt: new Date(r.created_at) }));
 }

 createImage(img: InsertImage): Image {
   const now  = new Date().toISOString();
   const info = this.db.prepare(`
     INSERT INTO images (filename, mime_type, data, issue_id, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
   `).run(img.filename, img.mimeType, img.data, img.issueId ?? null, img.metadata ?? null, now);

   return this.getImage(Number(info.lastInsertRowid))!;
 }

 /* ==================================================================
  * 9.  STATUS HISTORY + helpers
  * ================================================================== */
 getStatusHistory(issueId: RowID): StatusHistory[] {
   const rows = this.db.prepare("SELECT * FROM status_history WHERE issue_id = ? ORDER BY created_at DESC").all(issueId);
   return rows.map((r: any) => ({ ...r, createdAt: new Date(r.created_at) }));
 }

 createStatusHistory(h: InsertStatusHistory): StatusHistory {
   const now  = new Date().toISOString();
   const info = this.db.prepare(`
     INSERT INTO status_history (issue_id, old_status, new_status, changed_by_id, changed_by_name, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
   `).run(h.issueId, h.oldStatus ?? null, h.newStatus, h.changedById ?? null, h.changedByName ?? null, h.notes ?? null, now);

   const row = this.db.prepare("SELECT * FROM status_history WHERE id = ?").get(Number(info.lastInsertRowid));
   return { ...row, createdAt: new Date(row.created_at) };
 }

 updateIssueStatus(
   id: RowID,
   newStatus: IssueStatus,
   changedById?: RowID,
   changedByName?: string,
   notes?: string
 ): Issue | undefined {
   const issue = this.getIssue(id);
   if (!issue || issue.status === newStatus) return issue;

   const now = new Date();

   /* transaction */
   const trx = this.db.transaction(() => {
     this.createStatusHistory({
       issueId: id,
       oldStatus: issue.status,
       newStatus,
       changedById,
       changedByName,
       notes,
     });

     const upd: Partial<InsertIssue> = {
       status: newStatus,
       updatedAt: now,
     };

     if (newStatus === IssueStatus.FIXED) {
       upd.fixedById   = changedById;
       upd.fixedByName = changedByName;
       upd.fixedAt     = now;
       if (issue.createdAt) {
         upd.timeToFix = Math.round((now.getTime() - issue.createdAt.getTime()) / 60000);
       }
     }

     this.updateIssue(id, upd);
   });

   trx();

   return this.getIssue(id);
 }

 markIssueAsFixed(
   id: RowID,
   fixedById: RowID,
   fixedByName: string,
   notes?: string
 ): Issue | undefined {
   return this.updateIssueStatus(id, IssueStatus.FIXED, fixedById, fixedByName, notes);
 }

 /* ==================================================================
  * 10.  BASIC STATS (same logic as JS version)
  * ================================================================== */
 getIssueStatistics(issueType?: IssueType) {
   const where = issueType ? "WHERE issue_type = ?" : "";
   const param = issueType ? [issueType] : [];

   const tot  = this.db.prepare(`SELECT COUNT(*) c FROM issues ${where}`).get(...param).c as number;
   const open = this.db.prepare(`SELECT COUNT(*) c FROM issues WHERE status != '${IssueStatus.FIXED}' ${where ? "AND "+where.slice(6) : ""}`).get(...param).c as number;
   const fix  = this.db.prepare(`SELECT COUNT(*) c FROM issues WHERE status = '${IssueStatus.FIXED}' ${where ? "AND "+where.slice(6) : ""}`).get(...param).c as number;

   const avg  = this.db.prepare(`
     SELECT AVG(time_to_fix) avg FROM issues
     WHERE status = '${IssueStatus.FIXED}' AND time_to_fix IS NOT NULL
     ${where ? "AND "+where.slice(6) : ""}
   `).get(...param).avg as number | null;

   const loc  = this.db.prepare(`
     SELECT location, COUNT(*) c FROM issues ${where}
     GROUP BY location ORDER BY c DESC LIMIT 1
   `).get(...param) as {location?: string} | undefined;

   const last = this.db.prepare(`
     SELECT fixed_at FROM issues
     WHERE status = '${IssueStatus.FIXED}' AND fixed_at IS NOT NULL
     ${where ? "AND "+where.slice(6) : ""}
     ORDER BY fixed_at DESC LIMIT 1
   `).get(...param) as {fixed_at?: string} | undefined;

   return {
     totalIssues: tot,
     openIssues : open,
     fixedIssues: fix,
     averageFixTime     : avg ?? undefined,
     mostReportedLocation: loc?.location,
     lastFixDate        : last?.fixed_at ? new Date(last.fixed_at) : undefined,
   };
 }
}

/* ------------------------------------------------------------------ */
/* 11.  Default export instance (used like the old `storage.ts`)      */
/* ------------------------------------------------------------------ */

export const sqliteStorage = new SQLiteStorage();

/* If you had a global “storage” switch in server/storage.ts you can
  now `import { sqliteStorage as storage } from "./sqlite-storage";`
  or re-export it from there. */