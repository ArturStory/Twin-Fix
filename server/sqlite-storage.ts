import Database from 'better-sqlite3';
import { IStorage } from './storage';
import { 
  User, 
  InsertUser, 
  Issue, 
  InsertIssue, 
  Comment, 
  InsertComment,
  Image, 
  InsertImage, 
  StatusHistory, 
  InsertStatusHistory,
  IssueStatus,
  IssueType,
  IssuePriority
} from '@shared/schema';
import path from 'path';
import { log } from './vite';

// Use a more explicit path for the database file
const DB_PATH = path.join(process.cwd(), 'issues.db');

export class SQLiteStorage implements IStorage {
  private db: Database.Database;

  constructor() {
    log(`Initializing SQLite database at ${DB_PATH}`, 'sqlite');
    try {
      this.db = new Database(DB_PATH);
      this.initializeDatabase();
      log('SQLite database initialized successfully', 'sqlite');
    } catch (error) {
      log(`Error initializing SQLite database: ${error}`, 'sqlite');
      throw error;
    }
  }

  private initializeDatabase(): void {
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Create users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT
      )
    `);

    // Create issues table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        issueType TEXT DEFAULT 'other',
        latitude REAL,
        longitude REAL,
        pinX REAL,
        pinY REAL,
        isInteriorPin INTEGER,
        reportedById INTEGER NOT NULL,
        reportedByName TEXT NOT NULL,
        estimatedCost REAL DEFAULT 0,
        finalCost REAL,
        fixedById INTEGER,
        fixedByName TEXT,
        fixedAt TEXT,
        timeToFix INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create comments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        userId INTEGER,
        username TEXT NOT NULL,
        issueId INTEGER NOT NULL,
        createdAt TEXT NOT NULL
      )
    `);

    // Create images table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        issueId INTEGER NOT NULL,
        createdAt TEXT NOT NULL
      )
    `);

    // Create status history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        issueId INTEGER NOT NULL,
        oldStatus TEXT NOT NULL,
        newStatus TEXT NOT NULL,
        changedById INTEGER,
        changedByName TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL
      )
    `);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
      const user = stmt.get(id) as User | undefined;
      return user;
    } catch (error) {
      log(`Error in getUser: ${error}`, 'sqlite');
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
      const user = stmt.get(username) as User | undefined;
      return user;
    } catch (error) {
      log(`Error in getUserByUsername: ${error}`, 'sqlite');
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const stmt = this.db.prepare(
        'INSERT INTO users (username, password, display_name, avatar_url) VALUES (?, ?, ?, ?)'
      );
      const info = stmt.run(user.username, user.password, user.displayName, user.avatarUrl);
      
      return {
        id: info.lastInsertRowid as number,
        username: user.username,
        password: user.password,
        displayName: user.displayName || null,
        avatarUrl: user.avatarUrl || null
      };
    } catch (error) {
      log(`Error in createUser: ${error}`, 'sqlite');
      throw error;
    }
  }

  // Issue operations
  async getIssues(): Promise<Issue[]> {
    try {
      // Get all issues
      const issueStmt = this.db.prepare(`
        SELECT * FROM issues ORDER BY updatedAt DESC
      `);
      const issues = issueStmt.all() as Issue[];

      // Get image URLs for each issue
      for (const issue of issues) {
        const imageStmt = this.db.prepare('SELECT filename FROM images WHERE issueId = ?');
        const images = imageStmt.all(issue.id) as { filename: string }[];
        issue.imageUrls = images.map(img => img.filename);
      }

      return issues;
    } catch (error) {
      log(`Error in getIssues: ${error}`, 'sqlite');
      return [];
    }
  }

  async getIssue(id: number): Promise<Issue | undefined> {
    try {
      const stmt = this.db.prepare('SELECT * FROM issues WHERE id = ?');
      const issue = stmt.get(id) as Issue | undefined;

      if (issue) {
        // Get images for the issue
        const imageStmt = this.db.prepare('SELECT filename FROM images WHERE issueId = ?');
        const images = imageStmt.all(issue.id) as { filename: string }[];
        issue.imageUrls = images.map(img => img.filename);
      }

      return issue;
    } catch (error) {
      log(`Error in getIssue: ${error}`, 'sqlite');
      return undefined;
    }
  }

  async createIssue(issue: InsertIssue): Promise<Issue> {
    try {
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO issues (
          title, description, location, status, priority, issueType,
          latitude, longitude, pinX, pinY, isInteriorPin,
          reportedById, reportedByName, estimatedCost,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const info = stmt.run(
        issue.title, 
        issue.description, 
        issue.location,
        issue.status || 'pending', 
        issue.priority || 'medium', 
        issue.issueType || 'other',
        issue.latitude, 
        issue.longitude, 
        issue.pinX, 
        issue.pinY, 
        issue.isInteriorPin ? 1 : 0,
        issue.reportedById, 
        issue.reportedByName, 
        issue.estimatedCost || 0,
        now, 
        now
      );
      
      const issueId = info.lastInsertRowid as number;
      
      // Add images if provided
      if (issue.imageUrls && issue.imageUrls.length > 0) {
        const imageStmt = this.db.prepare(
          'INSERT INTO images (filename, issueId, createdAt) VALUES (?, ?, ?)'
        );
        
        for (const imageUrl of issue.imageUrls) {
          imageStmt.run(imageUrl, issueId, now);
        }
      }
      
      return this.getIssue(issueId) as Promise<Issue>;
    } catch (error) {
      log(`Error in createIssue: ${error}`, 'sqlite');
      throw error;
    }
  }

  async updateIssue(id: number, updateData: Partial<InsertIssue>): Promise<Issue | undefined> {
    try {
      // Check if issue exists
      const existingIssue = await this.getIssue(id);
      if (!existingIssue) {
        return undefined;
      }

      // Build the SQL SET clause dynamically
      const updateFields: string[] = [];
      const params: any[] = [];

      // Map of allowed fields to update
      const allowedFields: Record<string, string> = {
        title: 'title',
        description: 'description',
        location: 'location',
        status: 'status',
        priority: 'priority',
        issueType: 'issueType',
        latitude: 'latitude',
        longitude: 'longitude',
        pinX: 'pinX',
        pinY: 'pinY',
        isInteriorPin: 'isInteriorPin',
        estimatedCost: 'estimatedCost',
        finalCost: 'finalCost',
        scheduledDate: 'scheduledDate',
        notes: 'notes'
      };

      // Add updateable fields to SQL
      for (const [field, value] of Object.entries(updateData)) {
        if (field in allowedFields) {
          updateFields.push(`${field} = ?`);
          // Special handling for boolean isInteriorPin
          if (field === 'isInteriorPin') {
            params.push(value ? 1 : 0);
          } else {
            params.push(value);
          }
        }
      }

      // Always update timestamp
      updateFields.push('updatedAt = ?');
      params.push(new Date().toISOString());

      // Add issue ID as the final parameter
      params.push(id);

      // Build and execute the update statement
      const sql = `UPDATE issues SET ${updateFields.join(', ')} WHERE id = ?`;
      const stmt = this.db.prepare(sql);
      stmt.run(...params);

      // Return the updated issue
      return this.getIssue(id);
    } catch (error) {
      log(`Error in updateIssue: ${error}`, 'sqlite');
      return undefined;
    }
  }

  async deleteIssue(id: number): Promise<boolean> {
    try {
      // Delete the issue and count affected rows
      const stmt = this.db.prepare('DELETE FROM issues WHERE id = ?');
      const info = stmt.run(id);
      
      return info.changes > 0;
    } catch (error) {
      log(`Error in deleteIssue: ${error}`, 'sqlite');
      return false;
    }
  }

  async getNearbyIssues(lat: number, lng: number, radius: number): Promise<Issue[]> {
    try {
      // Get all issues with location
      const stmt = this.db.prepare(`
        SELECT * FROM issues 
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      `);
      
      const issues = stmt.all() as Issue[];
      
      // Filter by distance (simple calculation)
      const result = issues.filter(issue => {
        const distance = Math.sqrt(
          Math.pow((issue.latitude! - lat), 2) + 
          Math.pow((issue.longitude! - lng), 2)
        );
        
        // Roughly convert to kilometers (this is not accurate for large distances)
        const distanceKm = distance * 111;
        return distanceKm <= radius;
      });
      
      // Add image URLs
      for (const issue of result) {
        const imageStmt = this.db.prepare('SELECT filename FROM images WHERE issueId = ?');
        const images = imageStmt.all(issue.id) as { filename: string }[];
        issue.imageUrls = images.map(img => img.filename);
      }
      
      return result;
    } catch (error) {
      log(`Error in getNearbyIssues: ${error}`, 'sqlite');
      return [];
    }
  }

  // Comment operations
  async getComments(issueId: number): Promise<Comment[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM comments 
        WHERE issueId = ? 
        ORDER BY createdAt ASC
      `);
      
      return stmt.all(issueId) as Comment[];
    } catch (error) {
      log(`Error in getComments: ${error}`, 'sqlite');
      return [];
    }
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    try {
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO comments (content, userId, username, issueId, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const info = stmt.run(
        comment.content,
        comment.userId || null,
        comment.username,
        comment.issueId,
        now
      );
      
      const commentId = info.lastInsertRowid as number;
      
      // Get and return the created comment
      const getStmt = this.db.prepare('SELECT * FROM comments WHERE id = ?');
      return getStmt.get(commentId) as Comment;
    } catch (error) {
      log(`Error in createComment: ${error}`, 'sqlite');
      throw error;
    }
  }

  // Image operations
  async getImage(id: number): Promise<Image | undefined> {
    try {
      const stmt = this.db.prepare('SELECT * FROM images WHERE id = ?');
      return stmt.get(id) as Image | undefined;
    } catch (error) {
      log(`Error in getImage: ${error}`, 'sqlite');
      return undefined;
    }
  }

  async getImagesByIssueId(issueId: number): Promise<Image[]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM images WHERE issueId = ?');
      return stmt.all(issueId) as Image[];
    } catch (error) {
      log(`Error in getImagesByIssueId: ${error}`, 'sqlite');
      return [];
    }
  }

  async createImage(image: InsertImage): Promise<Image> {
    try {
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO images (filename, issueId, createdAt)
        VALUES (?, ?, ?)
      `);
      
      const info = stmt.run(
        image.filename,
        image.issueId,
        now
      );
      
      const imageId = info.lastInsertRowid as number;
      
      // Get and return the created image
      const getStmt = this.db.prepare('SELECT * FROM images WHERE id = ?');
      return getStmt.get(imageId) as Image;
    } catch (error) {
      log(`Error in createImage: ${error}`, 'sqlite');
      throw error;
    }
  }

  // Status history operations
  async getStatusHistory(issueId: number): Promise<StatusHistory[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM status_history
        WHERE issueId = ?
        ORDER BY createdAt DESC
      `);
      
      return stmt.all(issueId) as StatusHistory[];
    } catch (error) {
      log(`Error in getStatusHistory: ${error}`, 'sqlite');
      return [];
    }
  }

  async createStatusHistory(history: InsertStatusHistory): Promise<StatusHistory> {
    try {
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO status_history (
          issueId, oldStatus, newStatus, 
          changedById, changedByName, notes, createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const info = stmt.run(
        history.issueId,
        history.oldStatus,
        history.newStatus,
        history.changedById,
        history.changedByName,
        history.notes,
        now
      );
      
      const historyId = info.lastInsertRowid as number;
      
      // Get and return the created history record
      const getStmt = this.db.prepare('SELECT * FROM status_history WHERE id = ?');
      return getStmt.get(historyId) as StatusHistory;
    } catch (error) {
      log(`Error in createStatusHistory: ${error}`, 'sqlite');
      throw error;
    }
  }

  // Issue filtering operations
  async getIssuesByType(issueType: IssueType): Promise<Issue[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM issues
        WHERE issueType = ?
        ORDER BY updatedAt DESC
      `);
      
      const issues = stmt.all(issueType) as Issue[];
      
      // Add image URLs
      for (const issue of issues) {
        const imageStmt = this.db.prepare('SELECT filename FROM images WHERE issueId = ?');
        const images = imageStmt.all(issue.id) as { filename: string }[];
        issue.imageUrls = images.map(img => img.filename);
      }
      
      return issues;
    } catch (error) {
      log(`Error in getIssuesByType: ${error}`, 'sqlite');
      return [];
    }
  }

  async getIssuesByStatus(status: IssueStatus): Promise<Issue[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM issues
        WHERE status = ?
        ORDER BY updatedAt DESC
      `);
      
      const issues = stmt.all(status) as Issue[];
      
      // Add image URLs
      for (const issue of issues) {
        const imageStmt = this.db.prepare('SELECT filename FROM images WHERE issueId = ?');
        const images = imageStmt.all(issue.id) as { filename: string }[];
        issue.imageUrls = images.map(img => img.filename);
      }
      
      return issues;
    } catch (error) {
      log(`Error in getIssuesByStatus: ${error}`, 'sqlite');
      return [];
    }
  }

  async updateIssueStatus(
    id: number, 
    newStatus: IssueStatus, 
    changedById?: number, 
    changedByName?: string, 
    notes?: string
  ): Promise<Issue | undefined> {
    try {
      // Get current issue
      const issue = await this.getIssue(id);
      if (!issue) {
        return undefined;
      }
      
      const oldStatus = issue.status;
      
      // If status hasn't changed, return the issue as is
      if (oldStatus === newStatus) {
        return issue;
      }
      
      // Begin transaction
      const now = new Date().toISOString();
      this.db.exec('BEGIN TRANSACTION');
      
      // Update issue status
      const updateStmt = this.db.prepare(`
        UPDATE issues
        SET status = ?, updatedAt = ?
        WHERE id = ?
      `);
      
      updateStmt.run(newStatus, now, id);
      
      // Record status change in history
      const historyStmt = this.db.prepare(`
        INSERT INTO status_history (
          issueId, oldStatus, newStatus, 
          changedById, changedByName, notes, createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      historyStmt.run(
        id, 
        oldStatus, 
        newStatus, 
        changedById, 
        changedByName, 
        notes, 
        now
      );
      
      // If issue is marked as fixed, update related fields
      if (newStatus === IssueStatus.FIXED) {
        // Calculate time to fix in minutes
        const createdDate = new Date(issue.createdAt);
        const fixedDate = new Date(now);
        const timeToFix = Math.floor((fixedDate.getTime() - createdDate.getTime()) / (1000 * 60));
        
        const fixedStmt = this.db.prepare(`
          UPDATE issues
          SET fixedAt = ?, timeToFix = ?, fixedById = ?, fixedByName = ?
          WHERE id = ?
        `);
        
        fixedStmt.run(now, timeToFix, changedById, changedByName, id);
      }
      
      // Commit transaction
      this.db.exec('COMMIT');
      
      // Get updated issue
      return this.getIssue(id);
    } catch (error) {
      // Rollback on error
      this.db.exec('ROLLBACK');
      log(`Error in updateIssueStatus: ${error}`, 'sqlite');
      return undefined;
    }
  }

  async markIssueAsFixed(
    id: number, 
    fixedById: number, 
    fixedByName: string,
    notes?: string
  ): Promise<Issue | undefined> {
    return this.updateIssueStatus(id, IssueStatus.FIXED, fixedById, fixedByName, notes);
  }

  async getIssueStatistics(issueType?: IssueType): Promise<{
    totalIssues: number;
    openIssues: number;
    fixedIssues: number;
    averageFixTime?: number;
    mostReportedLocation?: string;
    lastFixDate?: Date;
  }> {
    try {
      let typeFilter = '';
      let typeParam: IssueType | undefined;
      
      if (issueType) {
        typeFilter = 'WHERE issueType = ?';
        typeParam = issueType;
      }
      
      // Total issues count
      const totalStmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM issues ${typeFilter}
      `);
      
      const totalResult = typeParam 
        ? totalStmt.get(typeParam) as {count: number} 
        : totalStmt.get() as {count: number};
        
      const totalIssues = totalResult.count;
      
      // Open issues count
      const openStmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM issues
        WHERE status != '${IssueStatus.FIXED}' ${typeFilter ? 'AND ' + typeFilter.substring(6) : ''}
      `);
      
      const openResult = typeParam 
        ? openStmt.get(typeParam) as {count: number} 
        : openStmt.get() as {count: number};
        
      const openIssues = openResult.count;
      
      // Fixed issues count
      const fixedStmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM issues
        WHERE status = '${IssueStatus.FIXED}' ${typeFilter ? 'AND ' + typeFilter.substring(6) : ''}
      `);
      
      const fixedResult = typeParam 
        ? fixedStmt.get(typeParam) as {count: number} 
        : fixedStmt.get() as {count: number};
        
      const fixedIssues = fixedResult.count;
      
      // Average fix time
      const avgTimeStmt = this.db.prepare(`
        SELECT AVG(timeToFix) as avg FROM issues
        WHERE status = '${IssueStatus.FIXED}' AND timeToFix IS NOT NULL
        ${typeFilter ? 'AND ' + typeFilter.substring(6) : ''}
      `);
      
      const avgTimeResult = typeParam 
        ? avgTimeStmt.get(typeParam) as {avg: number | null} 
        : avgTimeStmt.get() as {avg: number | null};
        
      const averageFixTime = avgTimeResult.avg;
      
      // Most reported location
      const locationStmt = this.db.prepare(`
        SELECT location, COUNT(*) as count FROM issues
        ${typeFilter}
        GROUP BY location
        ORDER BY count DESC
        LIMIT 1
      `);
      
      const locationResult = typeParam 
        ? locationStmt.get(typeParam) as {location: string, count: number} | undefined
        : locationStmt.get() as {location: string, count: number} | undefined;
        
      const mostReportedLocation = locationResult?.location;
      
      // Last fix date
      const dateStmt = this.db.prepare(`
        SELECT fixedAt FROM issues
        WHERE status = '${IssueStatus.FIXED}' AND fixedAt IS NOT NULL
        ${typeFilter ? 'AND ' + typeFilter.substring(6) : ''}
        ORDER BY fixedAt DESC
        LIMIT 1
      `);
      
      const dateResult = typeParam 
        ? dateStmt.get(typeParam) as {fixedAt: string} | undefined
        : dateStmt.get() as {fixedAt: string} | undefined;
        
      const lastFixDate = dateResult ? new Date(dateResult.fixedAt) : undefined;
      
      return {
        totalIssues,
        openIssues,
        fixedIssues,
        averageFixTime: averageFixTime !== null ? averageFixTime : undefined,
        mostReportedLocation,
        lastFixDate
      };
    } catch (error) {
      log(`Error in getIssueStatistics: ${error}`, 'sqlite');
      return {
        totalIssues: 0,
        openIssues: 0,
        fixedIssues: 0
      };
    }
  }
}