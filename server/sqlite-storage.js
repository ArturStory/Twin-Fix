/**
 * SQLite implementation of IStorage interface
 * This file provides a complete SQLite database adapter for the issue tracking system
 */

import Database from 'better-sqlite3';
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

// Enum values matching our schema
const IssueStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SCHEDULED: 'scheduled',
  URGENT: 'urgent',
  FIXED: 'fixed'
};

const IssuePriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

const IssueType = {
  FRYER: 'fryer',
  GRILL: 'grill',
  ICE_CREAM: 'ice_cream_machine',
  DRINK_DISPENSER: 'drink_dispenser',
  REFRIGERATOR: 'refrigerator',
  SEATING: 'seating',
  COUNTER: 'counter',
  BATHROOM: 'bathroom',
  FLOOR: 'floor',
  CEILING: 'ceiling',
  LIGHTING: 'lighting',
  HVAC: 'hvac',
  EXTERIOR: 'exterior',
  PLAYGROUND: 'playground',
  DRIVE_THRU: 'drive_thru',
  OTHER: 'other'
};

export class SQLiteStorage {
  constructor() {
    console.log(`Initializing SQLite database at ${DB_PATH}`);
    try {
      this.db = new Database(DB_PATH);
      this.initializeDatabase();
      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error(`Error initializing SQLite database: ${error}`);
      throw error;
    }
  }

  initializeDatabase() {
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
        issue_type TEXT DEFAULT 'other',
        latitude REAL,
        longitude REAL,
        pin_x REAL,
        pin_y REAL,
        is_interior_pin INTEGER,
        reported_by_id INTEGER,
        reported_by_name TEXT,
        estimated_cost REAL DEFAULT 0,
        final_cost REAL,
        fixed_by_id INTEGER,
        fixed_by_name TEXT,
        fixed_at TEXT,
        time_to_fix INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        image_urls TEXT
      )
    `);

    // Create comments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        user_id INTEGER,
        username TEXT NOT NULL,
        issue_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
      )
    `);

    // Create images table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
        data TEXT NOT NULL,
        issue_id INTEGER,
        metadata TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
      )
    `);

    // Create status history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        issue_id INTEGER NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_by_id INTEGER,
        changed_by_name TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
      )
    `);
  }

  // User operations
  async getUser(id) {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
      const user = stmt.get(id);
      
      if (!user) return undefined;
      
      return {
        id: user.id,
        username: user.username,
        password: user.password,
        displayName: user.display_name,
        avatarUrl: user.avatar_url
      };
    } catch (error) {
      console.error(`Error in getUser: ${error}`);
      return undefined;
    }
  }

  async getUserByUsername(username) {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
      const user = stmt.get(username);
      
      if (!user) return undefined;
      
      return {
        id: user.id,
        username: user.username,
        password: user.password,
        displayName: user.display_name,
        avatarUrl: user.avatar_url
      };
    } catch (error) {
      console.error(`Error in getUserByUsername: ${error}`);
      return undefined;
    }
  }

  async createUser(user) {
    try {
      const stmt = this.db.prepare(
        'INSERT INTO users (username, password, display_name, avatar_url) VALUES (?, ?, ?, ?)'
      );
      
      const info = stmt.run(
        user.username, 
        user.password, 
        user.displayName || null, 
        user.avatarUrl || null
      );
      
      return {
        id: Number(info.lastInsertRowid),
        username: user.username,
        password: user.password,
        displayName: user.displayName || null,
        avatarUrl: user.avatarUrl || null
      };
    } catch (error) {
      console.error(`Error in createUser: ${error}`);
      throw error;
    }
  }

  // Issue operations
  async getIssues() {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id, title, description, location, status, priority, issue_type as issueType,
          latitude, longitude, pin_x as pinX, pin_y as pinY, is_interior_pin as isInteriorPin,
          reported_by_id as reportedById, reported_by_name as reportedByName,
          estimated_cost as estimatedCost, final_cost as finalCost,
          fixed_by_id as fixedById, fixed_by_name as fixedByName,
          fixed_at as fixedAt, time_to_fix as timeToFix,
          created_at as createdAt, updated_at as updatedAt, image_urls as imageUrlsJson
        FROM issues
        ORDER BY updated_at DESC
      `);
      
      const issues = stmt.all();
      
      // Convert JSON strings to objects and fix dates
      return issues.map(issue => ({
        ...issue,
        createdAt: new Date(issue.createdAt),
        updatedAt: new Date(issue.updatedAt),
        fixedAt: issue.fixedAt ? new Date(issue.fixedAt) : null,
        imageUrls: issue.imageUrlsJson ? JSON.parse(issue.imageUrlsJson) : []
      }));
    } catch (error) {
      console.error(`Error in getIssues: ${error}`);
      return [];
    }
  }

  async getIssue(id) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id, title, description, location, status, priority, issue_type as issueType,
          latitude, longitude, pin_x as pinX, pin_y as pinY, is_interior_pin as isInteriorPin,
          reported_by_id as reportedById, reported_by_name as reportedByName,
          estimated_cost as estimatedCost, final_cost as finalCost,
          fixed_by_id as fixedById, fixed_by_name as fixedByName,
          fixed_at as fixedAt, time_to_fix as timeToFix,
          created_at as createdAt, updated_at as updatedAt, image_urls as imageUrlsJson
        FROM issues
        WHERE id = ?
      `);
      
      const issue = stmt.get(id);
      
      if (!issue) return undefined;
      
      // Convert JSON string to object and fix dates
      return {
        ...issue,
        createdAt: new Date(issue.createdAt),
        updatedAt: new Date(issue.updatedAt),
        fixedAt: issue.fixedAt ? new Date(issue.fixedAt) : null,
        imageUrls: issue.imageUrlsJson ? JSON.parse(issue.imageUrlsJson) : []
      };
    } catch (error) {
      console.error(`Error in getIssue: ${error}`);
      return undefined;
    }
  }

  async createIssue(issue) {
    try {
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO issues (
          title, description, location, status, priority, issue_type,
          latitude, longitude, pin_x, pin_y, is_interior_pin,
          reported_by_id, reported_by_name, estimated_cost, final_cost,
          created_at, updated_at, image_urls
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const imageUrlsJson = JSON.stringify(issue.imageUrls || []);
      
      const info = stmt.run(
        issue.title, 
        issue.description, 
        issue.location,
        issue.status || IssueStatus.PENDING, 
        issue.priority || IssuePriority.MEDIUM, 
        issue.issueType || IssueType.OTHER,
        issue.latitude || null, 
        issue.longitude || null, 
        issue.pinX || null, 
        issue.pinY || null, 
        issue.isInteriorPin ? 1 : 0,
        issue.reportedById || null, 
        issue.reportedByName || null, 
        issue.estimatedCost || 0,
        issue.finalCost || null,
        now, 
        now,
        imageUrlsJson
      );
      
      const issueId = Number(info.lastInsertRowid);
      return this.getIssue(issueId);
    } catch (error) {
      console.error(`Error in createIssue: ${error}`);
      throw error;
    }
  }

  async updateIssue(id, updateData) {
    try {
      // Check if issue exists
      const existingIssue = await this.getIssue(id);
      if (!existingIssue) {
        return undefined;
      }

      // Build the SQL SET clause and params dynamically
      const updates = [];
      const params = [];

      // Map JavaScript property names to database column names
      const fieldMap = {
        title: 'title',
        description: 'description',
        location: 'location',
        status: 'status',
        priority: 'priority',
        issueType: 'issue_type',
        latitude: 'latitude',
        longitude: 'longitude',
        pinX: 'pin_x',
        pinY: 'pin_y',
        isInteriorPin: 'is_interior_pin',
        reportedById: 'reported_by_id',
        reportedByName: 'reported_by_name',
        estimatedCost: 'estimated_cost',
        finalCost: 'final_cost',
        fixedById: 'fixed_by_id',
        fixedByName: 'fixed_by_name',
        fixedAt: 'fixed_at',
        timeToFix: 'time_to_fix',
        imageUrls: 'image_urls'
      };

      // Process each field in the update data
      for (const [field, value] of Object.entries(updateData)) {
        if (field in fieldMap) {
          // Handle special cases
          if (field === 'isInteriorPin') {
            updates.push(`${fieldMap[field]} = ?`);
            params.push(value ? 1 : 0);
          } else if (field === 'imageUrls') {
            updates.push(`${fieldMap[field]} = ?`);
            params.push(JSON.stringify(value || []));
          } else if (field === 'fixedAt' && value) {
            updates.push(`${fieldMap[field]} = ?`);
            params.push(value instanceof Date ? value.toISOString() : value);
          } else {
            updates.push(`${fieldMap[field]} = ?`);
            params.push(value);
          }
        }
      }

      // Always update the updated_at timestamp
      updates.push('updated_at = ?');
      params.push(new Date().toISOString());

      // Add the issue ID as the final parameter
      params.push(id);

      // Execute the update if there are fields to update
      if (updates.length > 0) {
        const sql = `UPDATE issues SET ${updates.join(', ')} WHERE id = ?`;
        const stmt = this.db.prepare(sql);
        stmt.run(...params);
      }

      // Return the updated issue
      return this.getIssue(id);
    } catch (error) {
      console.error(`Error in updateIssue: ${error}`);
      return undefined;
    }
  }

  async deleteIssue(id) {
    try {
      // Delete the issue and count affected rows
      const stmt = this.db.prepare('DELETE FROM issues WHERE id = ?');
      const info = stmt.run(id);
      
      return info.changes > 0;
    } catch (error) {
      console.error(`Error in deleteIssue: ${error}`);
      return false;
    }
  }

  async getNearbyIssues(lat, lng, radius) {
    try {
      // Get all issues with location
      const stmt = this.db.prepare(`
        SELECT 
          id, title, description, location, status, priority, issue_type as issueType,
          latitude, longitude, pin_x as pinX, pin_y as pinY, is_interior_pin as isInteriorPin,
          reported_by_id as reportedById, reported_by_name as reportedByName,
          estimated_cost as estimatedCost, final_cost as finalCost,
          fixed_by_id as fixedById, fixed_by_name as fixedByName,
          fixed_at as fixedAt, time_to_fix as timeToFix,
          created_at as createdAt, updated_at as updatedAt, image_urls as imageUrlsJson
        FROM issues 
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      `);
      
      const issues = stmt.all();
      
      // Process dates and image URLs
      const processedIssues = issues.map(issue => ({
        ...issue,
        createdAt: new Date(issue.createdAt),
        updatedAt: new Date(issue.updatedAt),
        fixedAt: issue.fixedAt ? new Date(issue.fixedAt) : null,
        imageUrls: issue.imageUrlsJson ? JSON.parse(issue.imageUrlsJson) : []
      }));
      
      // Filter by distance (simple calculation)
      return processedIssues.filter(issue => {
        const distance = Math.sqrt(
          Math.pow((issue.latitude - lat), 2) + 
          Math.pow((issue.longitude - lng), 2)
        );
        
        // Roughly convert to kilometers (this is not accurate for large distances)
        const distanceKm = distance * 111;
        return distanceKm <= radius;
      });
    } catch (error) {
      console.error(`Error in getNearbyIssues: ${error}`);
      return [];
    }
  }

  // Comment operations
  async getComments(issueId) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id, content, user_id as userId, username, 
          issue_id as issueId, created_at as createdAt
        FROM comments 
        WHERE issue_id = ? 
        ORDER BY created_at ASC
      `);
      
      const comments = stmt.all(issueId);
      
      return comments.map(comment => ({
        ...comment,
        createdAt: new Date(comment.createdAt)
      }));
    } catch (error) {
      console.error(`Error in getComments: ${error}`);
      return [];
    }
  }

  async createComment(comment) {
    try {
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO comments (content, user_id, username, issue_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const info = stmt.run(
        comment.content,
        comment.userId || null,
        comment.username,
        comment.issueId,
        now
      );
      
      const commentId = Number(info.lastInsertRowid);
      
      // Get and return the created comment
      const getStmt = this.db.prepare(`
        SELECT 
          id, content, user_id as userId, username, 
          issue_id as issueId, created_at as createdAt
        FROM comments 
        WHERE id = ?
      `);
      
      const createdComment = getStmt.get(commentId);
      
      return {
        ...createdComment,
        createdAt: new Date(createdComment.createdAt)
      };
    } catch (error) {
      console.error(`Error in createComment: ${error}`);
      throw error;
    }
  }

  // Image operations
  async getImage(id) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id, filename, mime_type as mimeType, data,
          issue_id as issueId, metadata, created_at as createdAt
        FROM images 
        WHERE id = ?
      `);
      
      const image = stmt.get(id);
      
      if (!image) return undefined;
      
      return {
        ...image,
        createdAt: new Date(image.createdAt)
      };
    } catch (error) {
      console.error(`Error in getImage: ${error}`);
      return undefined;
    }
  }

  async getImagesByIssueId(issueId) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id, filename, mime_type as mimeType, data,
          issue_id as issueId, metadata, created_at as createdAt
        FROM images 
        WHERE issue_id = ?
      `);
      
      const images = stmt.all(issueId);
      
      return images.map(image => ({
        ...image,
        createdAt: new Date(image.createdAt)
      }));
    } catch (error) {
      console.error(`Error in getImagesByIssueId: ${error}`);
      return [];
    }
  }

  async createImage(image) {
    try {
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO images (filename, mime_type, data, issue_id, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const info = stmt.run(
        image.filename,
        image.mimeType,
        image.data,
        image.issueId || null,
        image.metadata || null,
        now
      );
      
      const imageId = Number(info.lastInsertRowid);
      
      return this.getImage(imageId);
    } catch (error) {
      console.error(`Error in createImage: ${error}`);
      throw error;
    }
  }

  // Status history operations
  async getStatusHistory(issueId) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id, issue_id as issueId, old_status as oldStatus, 
          new_status as newStatus, changed_by_id as changedById,
          changed_by_name as changedByName, notes, created_at as createdAt
        FROM status_history
        WHERE issue_id = ?
        ORDER BY created_at DESC
      `);
      
      const history = stmt.all(issueId);
      
      return history.map(record => ({
        ...record,
        createdAt: new Date(record.createdAt)
      }));
    } catch (error) {
      console.error(`Error in getStatusHistory: ${error}`);
      return [];
    }
  }

  async createStatusHistory(history) {
    try {
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO status_history (
          issue_id, old_status, new_status, 
          changed_by_id, changed_by_name, notes, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const info = stmt.run(
        history.issueId,
        history.oldStatus || null,
        history.newStatus,
        history.changedById || null,
        history.changedByName || null,
        history.notes || null,
        now
      );
      
      const historyId = Number(info.lastInsertRowid);
      
      // Get and return the created history record
      const getStmt = this.db.prepare(`
        SELECT 
          id, issue_id as issueId, old_status as oldStatus, 
          new_status as newStatus, changed_by_id as changedById,
          changed_by_name as changedByName, notes, created_at as createdAt
        FROM status_history 
        WHERE id = ?
      `);
      
      const record = getStmt.get(historyId);
      
      return {
        ...record,
        createdAt: new Date(record.createdAt)
      };
    } catch (error) {
      console.error(`Error in createStatusHistory: ${error}`);
      throw error;
    }
  }

  // Issue filtering operations
  async getIssuesByType(issueType) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id, title, description, location, status, priority, issue_type as issueType,
          latitude, longitude, pin_x as pinX, pin_y as pinY, is_interior_pin as isInteriorPin,
          reported_by_id as reportedById, reported_by_name as reportedByName,
          estimated_cost as estimatedCost, final_cost as finalCost,
          fixed_by_id as fixedById, fixed_by_name as fixedByName,
          fixed_at as fixedAt, time_to_fix as timeToFix,
          created_at as createdAt, updated_at as updatedAt, image_urls as imageUrlsJson
        FROM issues
        WHERE issue_type = ?
        ORDER BY updated_at DESC
      `);
      
      const issues = stmt.all(issueType);
      
      return issues.map(issue => ({
        ...issue,
        createdAt: new Date(issue.createdAt),
        updatedAt: new Date(issue.updatedAt),
        fixedAt: issue.fixedAt ? new Date(issue.fixedAt) : null,
        imageUrls: issue.imageUrlsJson ? JSON.parse(issue.imageUrlsJson) : []
      }));
    } catch (error) {
      console.error(`Error in getIssuesByType: ${error}`);
      return [];
    }
  }

  async getIssuesByStatus(status) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id, title, description, location, status, priority, issue_type as issueType,
          latitude, longitude, pin_x as pinX, pin_y as pinY, is_interior_pin as isInteriorPin,
          reported_by_id as reportedById, reported_by_name as reportedByName,
          estimated_cost as estimatedCost, final_cost as finalCost,
          fixed_by_id as fixedById, fixed_by_name as fixedByName,
          fixed_at as fixedAt, time_to_fix as timeToFix,
          created_at as createdAt, updated_at as updatedAt, image_urls as imageUrlsJson
        FROM issues
        WHERE status = ?
        ORDER BY updated_at DESC
      `);
      
      const issues = stmt.all(status);
      
      return issues.map(issue => ({
        ...issue,
        createdAt: new Date(issue.createdAt),
        updatedAt: new Date(issue.updatedAt),
        fixedAt: issue.fixedAt ? new Date(issue.fixedAt) : null,
        imageUrls: issue.imageUrlsJson ? JSON.parse(issue.imageUrlsJson) : []
      }));
    } catch (error) {
      console.error(`Error in getIssuesByStatus: ${error}`);
      return [];
    }
  }

  async updateIssueStatus(id, newStatus, changedById, changedByName, notes) {
    try {
      // Get the current issue to check its status
      const issue = await this.getIssue(id);
      if (!issue) {
        return undefined;
      }
      
      const oldStatus = issue.status;
      const now = new Date();
      
      // Update the issue status
      const updateData = {
        status: newStatus,
        updatedAt: now
      };
      
      // If status is changing to FIXED, record who fixed it and when
      if (newStatus === IssueStatus.FIXED && oldStatus !== IssueStatus.FIXED) {
        Object.assign(updateData, {
          fixedById: changedById || null,
          fixedByName: changedByName || null,
          fixedAt: now,
          // Calculate time to fix if we have creation date
          timeToFix: issue.createdAt ? Math.round((now.getTime() - issue.createdAt.getTime()) / 60000) : null
        });
      }
      
      // Update the issue
      await this.updateIssue(id, updateData);
      
      // Record the status change in history
      if (oldStatus !== newStatus) {
        await this.createStatusHistory({
          issueId: id,
          oldStatus: oldStatus,
          newStatus: newStatus,
          changedById: changedById || null,
          changedByName: changedByName || null,
          notes: notes || null
        });
      }
      
      // Return the updated issue
      return this.getIssue(id);
    } catch (error) {
      console.error(`Error in updateIssueStatus: ${error}`);
      return undefined;
    }
  }

  async markIssueAsFixed(id, fixedById, fixedByName, notes) {
    // This is just a special case of updateIssueStatus
    return this.updateIssueStatus(
      id,
      IssueStatus.FIXED,
      fixedById,
      fixedByName,
      notes || 'Issue marked as fixed'
    );
  }

  async getIssueStatistics(issueType) {
    try {
      // Base query gets all issues or filtered by type
      let query = 'SELECT * FROM issues';
      let params = [];
      
      if (issueType) {
        query += ' WHERE issue_type = ?';
        params.push(issueType);
      }
      
      const stmt = this.db.prepare(query);
      const issues = stmt.all(...params).map(issue => ({
        ...issue,
        createdAt: new Date(issue.created_at),
        updatedAt: new Date(issue.updated_at),
        fixedAt: issue.fixed_at ? new Date(issue.fixed_at) : null
      }));
      
      // Calculate statistics
      const totalIssues = issues.length;
      const openIssues = issues.filter(issue => issue.status !== IssueStatus.FIXED && issue.status !== IssueStatus.COMPLETED).length;
      const fixedIssues = issues.filter(issue => issue.status === IssueStatus.FIXED || issue.status === IssueStatus.COMPLETED).length;
      
      // Average fix time calculation (in minutes)
      const fixedIssuesWithTime = issues.filter(issue => 
        issue.status === IssueStatus.FIXED && issue.time_to_fix !== null
      );
      
      let averageFixTime = null;
      if (fixedIssuesWithTime.length > 0) {
        const totalFixTime = fixedIssuesWithTime.reduce((sum, issue) => sum + issue.time_to_fix, 0);
        averageFixTime = Math.round(totalFixTime / fixedIssuesWithTime.length);
      }
      
      // Most reported location
      const locationCounts = issues.reduce((acc, issue) => {
        acc[issue.location] = (acc[issue.location] || 0) + 1;
        return acc;
      }, {});
      
      let mostReportedLocation = null;
      let highestCount = 0;
      
      for (const [location, count] of Object.entries(locationCounts)) {
        if (count > highestCount) {
          highestCount = count;
          mostReportedLocation = location;
        }
      }
      
      // Find the last fix date
      const sortedByFixDate = [...issues]
        .filter(issue => issue.fixed_at)
        .sort((a, b) => new Date(b.fixed_at).getTime() - new Date(a.fixed_at).getTime());
      
      const lastFixDate = sortedByFixDate.length > 0 ? new Date(sortedByFixDate[0].fixed_at) : null;
      
      return {
        totalIssues,
        openIssues,
        fixedIssues,
        averageFixTime,
        mostReportedLocation,
        lastFixDate
      };
    } catch (error) {
      console.error(`Error in getIssueStatistics: ${error}`);
      return {
        totalIssues: 0,
        openIssues: 0,
        fixedIssues: 0
      };
    }
  }
}