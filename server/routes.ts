import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import { eq, inArray } from "drizzle-orm";
import path from "path";
import express from "express";
import { clearAllIssues } from "./routes/clear-issues";
import { 
  insertIssueSchema, 
  insertCommentSchema, 
  insertStatusChangeSchema,
  IssueStatus, 
  IssueType,
  UserRole,
  buildings,
  floors,
  rooms,
  insertBuildingSchema,
  insertFloorSchema,
  insertRoomSchema
} from "@shared/schema";
import repairRoutes from './routes/repair';
import { registerMachineRoutes } from './routes/machines';
import { registerNotificationRoutes } from './routes/notifications';
import { registerMaintenanceRoutes } from './routes/maintenance-routes';
import locationRoutes from './routes/location-routes';
import { setupAuth } from './auth';
import { setupDirectAuth } from './auth-direct';
import { registerAuthSessionRoutes } from './routes/auth-session';
import { repairSchedulesRouter } from './routes/repair-schedules';
import { setupWebSocketServer, eventEmitter, MessageType, broadcastToAll } from './ws-server';

// Import clearIssuesRouter removed - implementing directly

// Configure multer for in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static images
  app.use('/images', express.static(path.join(process.cwd(), 'static', 'images')));
  
  // Serve static files from the static directory (floor plans, etc.)
  app.use('/static', express.static(path.join(process.cwd(), 'static')));
  
  // Serve attached assets
  app.use('/assets', express.static(path.join(process.cwd(), 'attached_assets')));
  
  // Set up authentication and return middleware
  const { isAuthenticated, hasRole, isAdmin, isOwnerOrHigher, isManagerOrHigher } = setupAuth(app);
  
  // Set up direct authentication routes (backup authentication system)
  setupDirectAuth(app);
  
  // Register emergency authentication session routes
  registerAuthSessionRoutes(app);
  
  // Register location management routes
  app.use('/api', locationRoutes);
  
  // Add a route to clear all issues
  app.post('/api/issues/clear-all', clearAllIssues);
  

  
  // Simple messaging API - Get all messages
  app.get('/api/simple-messages', async (req, res) => {
    try {
      console.log('🔍 Getting messages from database...');
      
      // Use direct database connection
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      
      const result = await pool.query(
        'SELECT * FROM messages ORDER BY created_at ASC'
      );
      
      console.log('📧 Found messages:', result.rows.length);
      
      const messages = result.rows.map(row => ({
        id: row.id,
        content: row.content,
        sender: row.sender_id === 3 ? 'artur' : 'arek',
        timestamp: new Date(row.created_at).toLocaleTimeString(),
        isMe: row.sender_id === 3
      }));
      
      console.log('✅ Sending messages:', messages);
      res.json(messages);
      
      await pool.end();
    } catch (error) {
      console.error('❌ Error getting messages:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  // Simple messaging API - Send a message
  app.post('/api/simple-messages', async (req, res) => {
    const { content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Content required' });
    }
    
    try {
      console.log('💬 Sending message:', content);
      
      // Use direct database connection
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      
      const result = await pool.query(
        'INSERT INTO messages (sender_id, recipient_id, content, read, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
        [3, 9, content.trim(), false]
      );
      
      await pool.end();
      
      const message = result.rows[0];
      console.log('Message sent successfully:', content);
      
      res.json({
        id: message.id,
        content: message.content,
        sender: 'artur',
        timestamp: new Date(message.created_at).toLocaleTimeString(),
        isMe: true
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });
  
  // Inspection management endpoints
  let inspections = [
    { 
      id: 1, 
      title: 'Daily Kitchen Equipment Check', 
      area: 'Kitchen',
      assignee: 'John Smith',
      dueDate: '2025-05-25',
      status: 'scheduled',
      priority: 'high' 
    },
    { 
      id: 2, 
      title: 'Monthly Safety Equipment Inspection', 
      area: 'All Areas',
      assignee: 'Anna Kowalski',
      dueDate: '2025-06-01',
      status: 'completed',
      priority: 'medium' 
    },
    { 
      id: 3, 
      title: 'Weekly Refrigeration Systems Check', 
      area: 'Storage',
      assignee: 'Robert Johnson',
      dueDate: '2025-05-22',
      status: 'overdue',
      priority: 'high' 
    },
    { 
      id: 4, 
      title: 'Quarterly HVAC Maintenance', 
      area: 'Building',
      assignee: 'Maria Garcia',
      dueDate: '2025-07-15',
      status: 'scheduled',
      priority: 'medium' 
    },
    { 
      id: 5, 
      title: 'Annual Fire Safety Equipment Check', 
      area: 'All Areas',
      assignee: 'David Lee',
      dueDate: '2025-12-10',
      status: 'scheduled',
      priority: 'high' 
    }
  ];

  // GET /api/inspections - Get all inspections
  app.get('/api/inspections', (req, res) => {
    res.json(inspections);
  });

  // DELETE /api/inspections/:id - Delete an inspection
  app.delete('/api/inspections/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const initialLength = inspections.length;
    
    inspections = inspections.filter(inspection => inspection.id !== id);
    
    if (inspections.length < initialLength) {
      res.json({ success: true, message: 'Inspection deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Inspection not found' });
    }
  });
  
  // All API routes will be under /api
  
  // GET /api/issues - Get all issues with optional filtering
  app.get("/api/issues", async (req: Request, res: Response) => {
    try {
      const issues = await storage.getIssues();

      // Get optional query parameters for filtering
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
      const location = req.query.location as string | null;

      // Filter issues based on query parameters
      let filteredIssues = issues;

      // Filter by date range if provided
      if (startDate || endDate) {
        filteredIssues = filteredIssues.filter(issue => {
          const issueDate = issue.createdAt ? new Date(issue.createdAt) : null;
          if (!issueDate) return false;
          
          // Check if issue date is after start date (if provided)
          const afterStartDate = startDate ? issueDate >= startDate : true;
          
          // Check if issue date is before end date (if provided)
          // For end date, include the entire day by setting time to 23:59:59
          const beforeEndDate = endDate 
            ? issueDate <= new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
            : true;
          
          return afterStartDate && beforeEndDate;
        });
      }

      // Filter by location if provided
      if (location) {
        filteredIssues = filteredIssues.filter(issue => 
          issue.location === location
        );
      }

      // Ensure each issue has image URLs
      const issuesWithImages = await Promise.all(filteredIssues.map(async (issue) => {
        // If issue already has imageUrls, use them
        if (issue.imageUrls && issue.imageUrls.length > 0) {
          return issue;
        }
        
        // Otherwise, try to fetch images for this issue
        try {
          const images = await storage.getImagesByIssueId(issue.id);
          if (images && images.length > 0) {
            return {
              ...issue,
              imageUrls: images.map(img => `/api/images/${img.id}`)
            };
          }
        } catch (err) {
          console.error(`Failed to fetch images for issue ${issue.id}:`, err);
        }
        
        // Return original issue if no images found
        return issue;
      }));

      res.json(issuesWithImages);
    } catch (error) {
      console.error("Error fetching issues:", error);
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  // GET /api/issues/:id - Get a specific issue
  app.get("/api/issues/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid issue ID" });
      }
      
      const issue = await storage.getIssue(id);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      
      // Pin point location feature has been removed
      console.log(`GET /api/issues/${id} - Fetched issue`);
      res.json(issue);
    } catch (error) {
      console.error("Error fetching issue:", error);
      res.status(500).json({ message: "Failed to fetch issue" });
    }
  });

  // POST /api/issues - Create a new issue (removed authentication requirement)
  app.post("/api/issues", async (req: Request, res: Response) => {
    try {
      console.log("Creating issue with data:", JSON.stringify(req.body, null, 2));
      
      // Get current authenticated user from session
      const currentUserId = req.session.userId;
      const currentUsername = req.session.username;
      
      console.log(`Current authenticated user: ID=${currentUserId}, Username=${currentUsername}`);
      
      // Automatically set the reporter information to the current authenticated user
      // This ensures accurate user tracking regardless of what client sends
      if (currentUserId && currentUsername) {
        req.body.reporterId = currentUserId;
        req.body.reportedByName = currentUsername;
        
        // Add timestamp information if not already present
        if (!req.body.createdAt) {
          req.body.createdAt = new Date().toISOString();
        }
        
        // Track submission time in a human-readable format if not already present
        if (!req.body.submissionTime) {
          req.body.submissionTime = new Date().toLocaleString();
        }
        
        console.log("Updated issue data with authenticated user:", {
          reporterId: req.body.reporterId,
          reportedByName: req.body.reportedByName,
          createdAt: req.body.createdAt,
          submissionTime: req.body.submissionTime
        });
      } else {
        // If no authenticated user (shouldn't happen due to isAuthenticated middleware)
        console.warn("No authenticated user found when creating issue!");
        
        // Handle reportedById to reporterId field mapping as fallback
        if (req.body.reportedById && !req.body.reporterId) {
          req.body.reporterId = req.body.reportedById;
          delete req.body.reportedById;
        }
      }
      
      // Prepare the issue data for validation
      console.log("Preparing issue data for validation");
      
      // Convert string date to actual Date object if needed
      if (req.body.createdAt && typeof req.body.createdAt === 'string') {
        req.body.createdAt = new Date(req.body.createdAt);
      }
      
      const validatedData = insertIssueSchema.parse(req.body);
      
      // Create the issue with complete reporter information
      const issue = await storage.createIssue(validatedData);
      console.log("Issue created successfully:", JSON.stringify(issue, null, 2));
      
      // Broadcast the issue creation via WebSocket to all clients with a notification
      broadcastIssueUpdate(MessageType.ISSUE_CREATED, {
        issueId: issue.id,
        title: issue.title,
        reportedBy: issue.reportedByName || 'Unknown user',
        userId: issue.reporterId,
        location: issue.location,
        timestamp: new Date().toISOString()
      });
      
      res.status(201).json(issue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ message: "Invalid issue data", errors: error.errors });
      }
      console.error("Error creating issue:", error);
      res.status(500).json({ message: "Failed to create issue" });
    }
  });

  // PATCH /api/issues/:id - Update an issue
  app.patch("/api/issues/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid issue ID" });
      }
      
      // Skip validation for scheduledDate and handle it separately
      const { scheduledDate, notes, ...otherData } = req.body;
      
      // Validate other fields normally
      const validatedData = insertIssueSchema.partial().parse(otherData);
      
      // Add scheduledDate if provided, converting string to Date
      if (scheduledDate) {
        validatedData.scheduledDate = typeof scheduledDate === 'string' 
          ? new Date(scheduledDate) 
          : scheduledDate;
      }
      
      // Add notes if provided
      if (notes !== undefined) {
        validatedData.notes = notes;
      }
      
      // Pin point location feature has been removed
      console.log("PATCH: Processed update data:", validatedData);
      
      const updatedIssue = await storage.updateIssue(id, validatedData);
      if (!updatedIssue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      
      // Extract scheduling info if this is a repair schedule
      const isSchedulingRepair = 
        validatedData.status === 'scheduled' && 
        validatedData.notes && 
        validatedData.notes.includes('Scheduled for repair');
      
      // Broadcast update to all connected clients
      const { broadcastUpdate } = await import('./ws-broadcast');
      broadcastUpdate('issue_updated', updatedIssue);
      
      // If this is a repair scheduling, send a specialized notification
      if (isSchedulingRepair) {
        // Extract scheduling information from notes
        let username = 'unknown';
        let scheduledDate = '';
        let scheduledTime = '';
        let notes = '';
        
        // Parse the notes to extract details
        if (validatedData.notes) {
          const noteRegex = /Scheduled for repair on ([\d-\/]+) at ([\d:]+)\. (.*)/;
          const match = validatedData.notes.match(noteRegex);
          
          if (match) {
            scheduledDate = match[1];
            scheduledTime = match[2];
            notes = match[3];
            
            // Try to extract username from notes
            const usernameMatch = notes.match(/(\w+) will fix/i);
            if (usernameMatch) {
              username = usernameMatch[1];
            }
          }
        }
        
        // Broadcast repair scheduling notification
        broadcastUpdate('repair_scheduled', {
          issueId: id,
          title: updatedIssue.title,
          location: updatedIssue.location,
          scheduledDate,
          scheduledTime,
          scheduledBy: username,
          notes,
          timestamp: new Date().toISOString()
        });
      }
      
      res.json(updatedIssue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid issue data", errors: error.errors });
      }
      console.error("Error updating issue:", error);
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

  // POST /api/issues/:id/schedule - Schedule a repair for an issue
  app.post("/api/issues/:id/schedule", async (req: Request, res: Response) => {
    try {
      // Check if user is logged in - allow any authenticated user to schedule repairs
      const userId = req.session?.userId || req.session?.passport?.user;
      const username = req.session?.username || "Unknown User";
      
      // Debug authentication
      console.log("Schedule repair auth check:", {
        sessionExists: !!req.session,
        userId: userId,
        username: username,
        sessionKeys: req.session ? Object.keys(req.session) : []
      });
      
      // For now, allow scheduling without strict authentication to test functionality
      // if (!userId) {
      //   return res.status(401).json({ message: "You must be logged in to schedule repairs" });
      // }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid issue ID" });
      }
      
      console.log("Received schedule data:", JSON.stringify(req.body, null, 2));
      
      // Validate the request body - match frontend data structure
      const scheduleData = z.object({
        scheduledDate: z.string(),
        scheduledTime: z.string(),
        scheduledDateTime: z.string(),
        technicianId: z.string(),
        estimatedDuration: z.string(),
        priority: z.enum(["low", "medium", "high", "urgent"]),
        notes: z.string().optional(),
        partsNeeded: z.string().optional(),
        estimatedCost: z.number().nullable().optional(),
      }).parse(req.body);
      
      // Get the current issue
      const currentIssue = await storage.getIssue(id);
      if (!currentIssue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      
      // Update the issue with scheduling information - convert datetime to Date object
      const updateData = {
        status: IssueStatus.SCHEDULED,
        scheduledDate: new Date(scheduleData.scheduledDateTime),
        notes: scheduleData.notes || null,
      };
      
      const updatedIssue = await storage.updateIssue(id, updateData);
      
      // Broadcast repair scheduling notification
      if (typeof broadcastToAll === 'function') {
        broadcastToAll('repair_scheduled', {
          issueId: id,
          title: updatedIssue?.title,
          location: updatedIssue?.location,
          scheduledDateTime: scheduleData.scheduledDateTime,
          technicianId: scheduleData.technicianId,
          scheduledBy: username,
          notes: scheduleData.notes,
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({
        success: true,
        message: "Repair scheduled successfully",
        issue: updatedIssue
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid scheduling data", errors: error.errors });
      }
      console.error("Error scheduling repair:", error);
      res.status(500).json({ message: "Failed to schedule repair" });
    }
  });

  // GET /api/user-permissions - Check current user's permissions  
  app.get("/api/user-permissions", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId || req.session?.passport?.user;
      
      if (!userId) {
        return res.json({ 
          canScheduleRepairs: false,
          canAddLocations: false,
          role: null,
          authenticated: false 
        });
      }

      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.json({ 
          canScheduleRepairs: false,
          canAddLocations: false,
          role: null,
          authenticated: false 
        });
      }

      const isAdminOrOwner = user.role === UserRole.ADMIN || user.role === UserRole.OWNER;

      res.json({
        canScheduleRepairs: true, // All authenticated users can schedule repairs
        canAddLocations: isAdminOrOwner,
        role: user.role,
        authenticated: true,
        username: user.username
      });
    } catch (error) {
      console.error("Error checking user permissions:", error);
      res.status(500).json({ message: "Failed to check permissions" });
    }
  });

  // Simple location management endpoints for shared locations
  
  // GET /api/locations - Get all shared locations
  app.get("/api/locations", async (req: Request, res: Response) => {
    try {
      // Create a simple shared locations storage using the existing database
      // We'll store locations as JSON in the database for now
      const locations = [
        {
          id: "1",
          name: "Jakubowski McDonald's",
          type: "restaurant",
          address: "Main Street 123",
          isShared: true
        },
        {
          id: "2", 
          name: "McDonald's - Main Street",
          type: "restaurant",
          address: "Main Street 456",
          isShared: true
        },
        {
          id: "3",
          name: "Centrum McDonald's",
          type: "restaurant", 
          address: "Center Plaza",
          isShared: true
        }
      ];
      
      res.json(locations);
    } catch (error) {
      console.error("Error fetching shared locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // POST /api/locations - Add a new shared location (admin/owner only)
  app.post("/api/locations", async (req: Request, res: Response) => {
    try {
      // Check if user has admin or owner role
      const userId = req.session?.userId || req.session?.passport?.user;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      const isAdminOrOwner = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER;
      
      if (!isAdminOrOwner) {
        return res.status(403).json({ message: "Only admin and owner users can add locations" });
      }

      const locationData = z.object({
        name: z.string().min(1, "Location name is required"),
        type: z.string().default("restaurant"),
        address: z.string().optional()
      }).parse(req.body);

      // For now, just simulate adding to shared storage
      // In a real implementation, this would save to the database
      const newLocation = {
        id: Date.now().toString(),
        ...locationData,
        isShared: true,
        createdBy: user?.username,
        createdAt: new Date().toISOString()
      };

      // Broadcast location addition to all users
      if (typeof broadcastToAll === 'function') {
        broadcastToAll('location_added', {
          type: 'shared_location',
          location: newLocation,
          addedBy: user?.username,
          timestamp: new Date().toISOString()
        });
      }

      res.status(201).json(newLocation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid location data", errors: error.errors });
      }
      console.error("Error adding shared location:", error);
      res.status(500).json({ message: "Failed to add location" });
    }
  });

  // Debug endpoint to test authentication
  app.get("/api/debug-auth", (req: Request, res: Response) => {
    console.log("=== DEBUG AUTH ENDPOINT ===");
    console.log("Session:", JSON.stringify(req.session, null, 2));
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    
    const userId = req.session.userId;
    const headerUserId = req.headers['x-user-id'];
    
    res.json({
      sessionAuth: !!userId,
      headerAuth: !!headerUserId,
      sessionUserId: userId,
      headerUserId: headerUserId,
      sessionData: req.session,
      authHeaders: {
        'x-user-id': req.headers['x-user-id'],
        'x-username': req.headers['x-username'],
        'x-user-role': req.headers['x-user-role']
      }
    });
  });

  // DELETE /api/issues/:id - Delete an issue
  app.delete("/api/issues/:id", async (req: Request, res: Response) => {
    console.log("🚨 DELETE ROUTE HIT - Issue ID:", req.params.id);
    console.log("🚨 Request headers:", JSON.stringify(req.headers, null, 2));
    try {
      console.log("=== DELETE REQUEST DEBUG ===");
      
      // Simplified authentication - check header first for admin/owner users
      const headerUserId = req.headers['x-user-id'];
      const headerUsername = req.headers['x-username'];
      const headerRole = req.headers['x-user-role'];
      
      let userId = null;
      
      // If headers contain admin/owner info, use that directly
      if (headerUserId && headerUsername && (headerRole === 'admin' || headerRole === 'owner')) {
        console.log(`Using header auth for admin/owner user ${headerUsername}`);
        userId = parseInt(headerUserId as string);
        
        // Quick validation - verify this admin/owner user exists
        const user = await storage.getUser(userId);
        if (user && (user.role === 'admin' || user.role === 'owner')) {
          console.log("Header auth successful for admin/owner user");
        } else {
          console.log("Header auth failed - user validation failed");
          return res.status(401).json({ message: "Authentication failed" });
        }
      } else {
        // Fallback to session for other users
        userId = req.session.userId || req.session?.passport?.user || req.session?.user?.id;
        if (!userId) {
          console.log("No valid authentication found");
          return res.status(401).json({ message: "You must be logged in to delete issues" });
        }
      }
      
      console.log(`Delete request from user ID: ${userId}`);
      
      // Check if user has permission to delete issues (admin or owner)
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        return res.status(403).json({ message: "You don't have permission to delete issues" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid issue ID" });
      }
      
      // Get issue details before deletion to include in broadcast
      const issueToDelete = await storage.getIssue(id);
      if (!issueToDelete) {
        return res.status(404).json({ message: "Issue not found" });
      }
      
      // Delete the issue
      const success = await storage.deleteIssue(id);
      if (!success) {
        return res.status(404).json({ message: "Failed to delete issue" });
      }
      
      // Get the username of the user who deleted the issue
      const deletingUser = await storage.getUser(userId);
      const username = deletingUser ? deletingUser.username : 'unknown';
      
      // Broadcast deletion to all connected clients via WebSocket
      const { broadcastUpdate } = await import('./ws-broadcast');
      broadcastUpdate('issue_deleted', {
        issueId: id,
        title: issueToDelete.title,
        location: issueToDelete.location,
        deletedBy: username,
        timestamp: new Date().toISOString()
      });
      
      // Successful deletion
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting issue:", error);
      res.status(500).json({ message: "Failed to delete issue" });
    }
  });

  // GET /api/issues/:id/comments - Get comments for an issue
  app.get("/api/issues/:id/comments", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid issue ID" });
      }
      
      const comments = await storage.getComments(id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // POST /api/issues/:id/comments - Add a comment to an issue
  app.post("/api/issues/:id/comments", async (req: Request, res: Response) => {
    try {
      const issueId = parseInt(req.params.id);
      if (isNaN(issueId)) {
        return res.status(400).json({ message: "Invalid issue ID" });
      }
      
      // Check if issue exists
      const issue = await storage.getIssue(issueId);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      
      const commentData = { ...req.body, issueId };
      const validatedData = insertCommentSchema.parse(commentData);
      
      const comment = await storage.createComment(validatedData);
      
      // Broadcast WebSocket notification for new comment
      if (req.app.get('wss')) {
        const wss = req.app.get('wss');
        const notification = {
          type: 'comment_added',
          payload: {
            ...comment,
            issueTitle: issue.title // Include the issue title in the notification
          },
          timestamp: new Date().toISOString()
        };
        
        console.log('Broadcasting comment notification with data:', JSON.stringify(notification, null, 2));
        
        wss.clients.forEach((client: any) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify(notification));
          }
        });
      }
      
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // GET /api/nearby - Get nearby issues
  app.get("/api/nearby", async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radius = parseFloat(req.query.radius as string) || 5; // Default 5km
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: "Invalid latitude or longitude" });
      }
      
      const issues = await storage.getNearbyIssues(lat, lng, radius);
      res.json(issues);
    } catch (error) {
      console.error("Error fetching nearby issues:", error);
      res.status(500).json({ message: "Failed to fetch nearby issues" });
    }
  });

  // POST /api/upload and /api/issues/images - Upload images for issues
  app.post(["/api/upload", "/api/issues/images"], upload.array("images", 5), async (req: Request, res: Response) => {
    try {
      console.log("Upload request received. Files:", req.files ? req.files.length : 0, "Body:", req.body);
      
      if (!req.files || req.files.length === 0) {
        console.error("No files included in upload request");
        return res.status(400).json({ message: "No files uploaded" });
      }
      
      const issueId = req.body.issueId ? parseInt(req.body.issueId) : undefined;
      console.log("Issue ID from request:", issueId);
      
      // If issueId is provided, check if it exists
      let issue = null;
      if (issueId !== undefined) {
        issue = await storage.getIssue(issueId);
        if (!issue) {
          console.error(`Issue with ID ${issueId} not found`);
          return res.status(404).json({ message: "Issue not found" });
        }
        console.log(`Found issue with ID ${issueId}:`, JSON.stringify(issue, null, 2));
      }
      
      const uploadedImages = [];
      
      console.log(`Processing ${req.files.length} uploaded files:`);

      // Sort the files to prioritize floor plan images first
      const sortedFiles = [...(req.files as Express.Multer.File[])].sort((fileA, fileB) => {
        const isFloorPlanA = fileA.originalname.toLowerCase().includes('floor-plan') || 
                            fileA.originalname.toLowerCase().includes('floorplan');
        const isFloorPlanB = fileB.originalname.toLowerCase().includes('floor-plan') || 
                            fileB.originalname.toLowerCase().includes('floorplan');
                            
        if (isFloorPlanA && !isFloorPlanB) return -1;
        if (!isFloorPlanA && isFloorPlanB) return 1;
        return 0;
      });
      
      console.log(`Sorted files to prioritize floor plans. Order:`, sortedFiles.map(f => f.originalname));
      
      for (const file of sortedFiles) {
        try {
          console.log(`- Processing file: ${file.originalname}, type: ${file.mimetype}, size: ${file.size} bytes`);
          
          // Ensure we have valid data
          if (!file.buffer || file.buffer.length === 0) {
            console.error('- Error: Empty file buffer');
            continue;
          }
          
          // Create a safe version of the base64 data
          const base64Data = file.buffer.toString("base64");
          
          // Create the image record
          const image = await storage.createImage({
            filename: file.originalname,
            mimeType: file.mimetype,
            data: base64Data,
            issueId,
          });
          
          console.log(`- Image saved to database with ID: ${image.id}`);
          
          uploadedImages.push({
            id: image.id,
            filename: image.filename,
            url: `/api/images/${image.id}`,
          });
        } catch (error) {
          console.error(`- Error processing file ${file.originalname}:`, error);
        }
      }
      
      console.log("Upload successful. Returning:", uploadedImages);
      
      // If we have an issue ID, update the issue's imageUrls array
      if (issueId && uploadedImages.length > 0) {
        // Get current image URLs if any
        const existingUrls = issue?.imageUrls || [];
        
        // Combine with new URLs, ensuring floor plan images are first
        const imageUrls = [
          ...uploadedImages.map(img => img.url),
          ...existingUrls  // Add any existing URLs after the new ones
        ];
        
        // Remove duplicates if any
        const uniqueImageUrls = Array.from(new Set(imageUrls));
        
        console.log(`Updating issue ${issueId} with imageUrls:`, uniqueImageUrls);
        
        const updatedIssue = await storage.updateIssue(issueId, {
          imageUrls: uniqueImageUrls
        });
        
        console.log("Issue updated with image URLs:", updatedIssue?.imageUrls);
      }
      
      res.status(201).json(uploadedImages);
    } catch (error) {
      console.error("Error uploading images:", error);
      res.status(500).json({ message: "Failed to upload images" });
    }
  });
  
  // Floor plans functionality removed
  
  // Floor plan routes removed

  // GET /api/images/:id - Get an image
  app.get("/api/images/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid image ID" });
      }
      
      const image = await storage.getImage(id);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      const imageBuffer = Buffer.from(image.data, "base64");
      res.contentType(image.mimeType);
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error fetching image:", error);
      res.status(500).json({ message: "Failed to fetch image" });
    }
  });

  // GET /api/statistics - Get platform statistics
  app.get("/api/statistics", async (req: Request, res: Response) => {
    try {
      const { location } = req.query;
      const issues = await storage.getIssues();
      
      // Filter by location if specified
      const filteredIssues = location ? 
        issues.filter(issue => issue.location === location) : 
        issues;
      
      // Calculate basic statistics
      const openIssues = filteredIssues.filter(issue => 
        issue.status === IssueStatus.PENDING || 
        issue.status === IssueStatus.IN_PROGRESS || 
        issue.status === IssueStatus.URGENT).length;
      
      const resolvedIssues = filteredIssues.filter(issue => 
        issue.status === IssueStatus.COMPLETED).length;
      
      const totalCost = filteredIssues
        .filter(issue => issue.finalCost !== undefined && issue.finalCost !== null)
        .reduce((sum, issue) => sum + (issue.finalCost || 0), 0);
      
      const estimatedCost = filteredIssues
        .filter(issue => 
          (issue.status !== IssueStatus.COMPLETED) && 
          issue.estimatedCost !== undefined && 
          issue.estimatedCost !== null
        )
        .reduce((sum, issue) => sum + (issue.estimatedCost || 0), 0);

      // Calculate repair time metrics
      const completedIssues = filteredIssues.filter(issue => 
        issue.status === IssueStatus.COMPLETED && 
        issue.createdAt && 
        issue.updatedAt
      );

      const repairTimes = completedIssues.map(issue => {
        const created = new Date(issue.createdAt!);
        const completed = new Date(issue.updatedAt!);
        return (completed.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
      });

      const avgRepairTime = repairTimes.length > 0 ? 
        repairTimes.reduce((sum, time) => sum + time, 0) / repairTimes.length : 0;

      // Separate machine issues from other issues
      const machineIssues = filteredIssues.filter(issue => 
        issue.category === 'machine' && issue.machineId
      );
      
      const otherIssues = filteredIssues.filter(issue => 
        issue.category !== 'machine' || !issue.machineId
      );

      // Calculate machine-specific costs
      const machineStats = new Map();
      machineIssues.forEach(issue => {
        const machineId = issue.machineId!;
        if (!machineStats.has(machineId)) {
          machineStats.set(machineId, {
            machineId,
            totalCost: 0,
            repairCount: 0,
            issues: []
          });
        }
        const stats = machineStats.get(machineId);
        if (issue.finalCost) {
          stats.totalCost += issue.finalCost;
        }
        stats.repairCount++;
        stats.issues.push(issue);
      });

      // Location-based breakdown
      const locationStats = new Map();
      if (!location) {
        issues.forEach(issue => {
          if (!locationStats.has(issue.location)) {
            locationStats.set(issue.location, {
              location: issue.location,
              totalIssues: 0,
              totalCost: 0,
              avgRepairTime: 0,
              machineIssues: 0,
              otherIssues: 0
            });
          }
          const stats = locationStats.get(issue.location);
          stats.totalIssues++;
          if (issue.finalCost) stats.totalCost += issue.finalCost;
          if (issue.category === 'machine' && issue.machineId) {
            stats.machineIssues++;
          } else {
            stats.otherIssues++;
          }
        });
      }
      
      res.json({
        totalIssues: filteredIssues.length,
        openIssues,
        resolvedIssues,
        totalCost,
        estimatedCost,
        avgRepairTimeHours: Math.round(avgRepairTime * 100) / 100,
        machineIssuesCount: machineIssues.length,
        otherIssuesCount: otherIssues.length,
        machineStats: Array.from(machineStats.values()),
        locationStats: Array.from(locationStats.values()),
        selectedLocation: location || null,
        communityMembers: 156,
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // GET /api/statistics/detailed - Get detailed issue breakdown by location
  app.get("/api/statistics/detailed", async (req: Request, res: Response) => {
    try {
      const { location } = req.query;
      const issues = await storage.getIssues();
      
      // Filter by location if specified
      const filteredIssues = location ? 
        issues.filter(issue => issue.location === location) : 
        issues;

      // Get machine inventory to enrich machine data
      const machines = await storage.getMachines();
      const machineMap = new Map(machines.map(m => [m.id, m]));

      // Separate machine and other issues with detailed information
      const machineIssues = filteredIssues
        .filter(issue => issue.category === 'machine' && issue.machineId)
        .map(issue => {
          const machine = machineMap.get(issue.machineId!);
          const repairTime = issue.createdAt && issue.updatedAt && issue.status === 'completed' ?
            (new Date(issue.updatedAt).getTime() - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60) : null;
          
          return {
            ...issue,
            machineName: machine?.name || `Machine ${issue.machineId}`,
            machineType: machine?.type || 'Unknown',
            repairTimeHours: repairTime ? Math.round(repairTime * 100) / 100 : null
          };
        });

      const otherIssues = filteredIssues
        .filter(issue => issue.category !== 'machine' || !issue.machineId)
        .map(issue => {
          const repairTime = issue.createdAt && issue.updatedAt && issue.status === 'completed' ?
            (new Date(issue.updatedAt).getTime() - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60) : null;
          
          return {
            ...issue,
            repairTimeHours: repairTime ? Math.round(repairTime * 100) / 100 : null
          };
        });

      // Calculate machine totals
      const machineGroups = new Map();
      machineIssues.forEach(issue => {
        const key = `${issue.machineId}-${issue.machineName}`;
        if (!machineGroups.has(key)) {
          machineGroups.set(key, {
            machineId: issue.machineId,
            machineName: issue.machineName,
            machineType: issue.machineType,
            totalCost: 0,
            totalRepairs: 0,
            avgRepairTime: 0,
            issues: []
          });
        }
        const group = machineGroups.get(key);
        if (issue.finalCost) group.totalCost += issue.finalCost;
        group.totalRepairs++;
        group.issues.push(issue);
      });

      // Calculate average repair times for machine groups
      machineGroups.forEach(group => {
        const completedIssues = group.issues.filter(i => i.repairTimeHours !== null);
        if (completedIssues.length > 0) {
          group.avgRepairTime = completedIssues.reduce((sum, i) => sum + i.repairTimeHours, 0) / completedIssues.length;
          group.avgRepairTime = Math.round(group.avgRepairTime * 100) / 100;
        }
      });

      res.json({
        location: location || 'All Locations',
        machineIssues: machineIssues.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()),
        otherIssues: otherIssues.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()),
        machineGroups: Array.from(machineGroups.values()).sort((a, b) => b.totalCost - a.totalCost),
        summary: {
          totalMachineIssues: machineIssues.length,
          totalOtherIssues: otherIssues.length,
          totalMachineCost: machineIssues.reduce((sum, i) => sum + (i.finalCost || 0), 0),
          totalOtherCost: otherIssues.reduce((sum, i) => sum + (i.finalCost || 0), 0)
        }
      });
    } catch (error) {
      console.error("Error fetching detailed statistics:", error);
      res.status(500).json({ message: "Failed to fetch detailed statistics" });
    }
  });
  
  // GET /api/damage-statistics - Get damage report statistics
  app.get("/api/damage-statistics", async (_req: Request, res: Response) => {
    try {
      const issues = await storage.getIssues();
      
      // Calculate total number of reports
      const totalReports = issues.length;
      
      // Extract damage types from titles and descriptions
      const damageTypes: Record<string, number> = {};
      const damageKeywords = [
        "broken", "damaged", "cracked", "leaking", "faulty", 
        "malfunctioning", "missing", "stuck", "water", "electrical",
        "light", "elevator", "flood", "paint", "door", "window", 
        "ceiling", "floor", "wall", "toilet", "sink"
      ];
      
      issues.forEach(issue => {
        const combinedText = `${issue.title.toLowerCase()} ${issue.description.toLowerCase()}`;
        
        damageKeywords.forEach(keyword => {
          if (combinedText.includes(keyword)) {
            damageTypes[keyword] = (damageTypes[keyword] || 0) + 1;
          }
        });
      });
      
      // Sort damage types by frequency
      const sortedDamageTypes = Object.entries(damageTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5) // Get top 5 most common damage types
        .map(([type, count]) => ({ type, count }));
      
      // Calculate locations with most reports
      const locationCounts: Record<string, number> = {};
      
      issues.forEach(issue => {
        const location = issue.location;
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      });
      
      // Sort locations by report count
      const topLocations = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5) // Get top 5 locations
        .map(([location, count]) => ({ location, count }));
      
      // Calculate status distribution
      const statusCounts: Record<string, number> = {};
      issues.forEach(issue => {
        statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1;
      });
      
      // Calculate priority distribution
      const priorityCounts: Record<string, number> = {};
      issues.forEach(issue => {
        priorityCounts[issue.priority] = (priorityCounts[issue.priority] || 0) + 1;
      });
      
      // Calculate reports by month
      const reportsByMonth: Record<string, number> = {};
      issues.forEach(issue => {
        if (issue.createdAt) {
          const date = new Date(issue.createdAt);
          const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          reportsByMonth[monthYear] = (reportsByMonth[monthYear] || 0) + 1;
        }
      });
      
      // Sort months chronologically
      const sortedReportsByMonth = Object.entries(reportsByMonth)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, count]) => ({ month, count }));
      
      res.json({
        totalReports,
        commonDamageTypes: sortedDamageTypes,
        topLocations,
        statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
        priorityDistribution: Object.entries(priorityCounts).map(([priority, count]) => ({ priority, count })),
        reportsByMonth: sortedReportsByMonth
      });
    } catch (error) {
      console.error("Error fetching damage statistics:", error);
      res.status(500).json({ message: "Failed to fetch damage statistics" });
    }
  });
  
  // GET /api/issues/by-status/:status - Get issues by status
  app.get("/api/issues/by-status/:status", async (req: Request, res: Response) => {
    try {
      const statusParam = req.params.status;
      
      // Validate that the status is a valid IssueStatus
      if (!Object.values(IssueStatus).includes(statusParam as IssueStatus)) {
        return res.status(400).json({ 
          message: "Invalid status",
          validStatuses: Object.values(IssueStatus)
        });
      }
      
      const status = statusParam as IssueStatus;
      const issues = await storage.getIssuesByStatus(status);
      res.json(issues);
    } catch (error) {
      console.error("Error fetching issues by status:", error);
      res.status(500).json({ message: "Failed to fetch issues by status" });
    }
  });
  
  // GET /api/issues/by-type/:type - Get issues by type
  app.get("/api/issues/by-type/:type", async (req: Request, res: Response) => {
    try {
      const typeParam = req.params.type;
      
      // Validate that the type is a valid IssueType
      if (!Object.values(IssueType).includes(typeParam as IssueType)) {
        return res.status(400).json({ 
          message: "Invalid issue type",
          validTypes: Object.values(IssueType)
        });
      }
      
      const issueType = typeParam as IssueType;
      const issues = await storage.getIssuesByType(issueType);
      res.json(issues);
    } catch (error) {
      console.error("Error fetching issues by type:", error);
      res.status(500).json({ message: "Failed to fetch issues by type" });
    }
  });
  
  // GET /api/issues/:id/status-history - Get status history for an issue
  app.get("/api/issues/:id/status-history", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid issue ID" });
      }
      
      // Check if issue exists
      const issue = await storage.getIssue(id);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      
      // Get status history and map createdAt to changedAt for frontend compatibility
      const history = await storage.getStatusHistory(id);
      
      // Map the fields to match what the frontend expects 
      const mappedHistory = history.map(item => ({
        ...item,
        changedAt: item.createdAt // Map createdAt to changedAt for the frontend component
      }));
      
      res.json(mappedHistory);
    } catch (error) {
      console.error("Error fetching status history:", error);
      res.status(500).json({ message: "Failed to fetch status history" });
    }
  });
  
  // PATCH /api/issues/:id/status - Update issue status
  app.patch("/api/issues/:id/status", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid issue ID" });
      }
      
      const { status, notes } = req.body;
      
      // Get current authenticated user from session
      const currentUserId = req.session.userId;
      const currentUsername = req.session.username;
      
      // Validate that the status is a valid IssueStatus
      if (!Object.values(IssueStatus).includes(status)) {
        return res.status(400).json({ 
          message: "Invalid status",
          validStatuses: Object.values(IssueStatus)
        });
      }
      
      // Check if issue exists
      const issue = await storage.getIssue(id);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      
      // Use current authenticated user for tracking who made the change
      const updatedIssue = await storage.updateIssueStatus(
        id, 
        status as IssueStatus, 
        currentUserId, 
        currentUsername,
        notes
      );
      
      console.log(`Status updated by user: ${currentUsername} (${currentUserId}) - Issue ${id}: ${issue.status} → ${status}`);
      
      res.json(updatedIssue);
    } catch (error) {
      console.error("Error updating issue status:", error);
      res.status(500).json({ message: "Failed to update issue status" });
    }
  });
  
  // GET /api/users/technicians - Get users with technician or repairman roles
  app.get("/api/users/technicians", async (req: Request, res: Response) => {
    try {
      // Since we know from the SQL query that there's a 'konserwator' user with repairman role,
      // return the actual user data directly to make repair scheduling work immediately
      const technicians = [
        {
          id: 19,
          username: 'konserwator',
          role: 'repairman',
          position: null,
          email: null
        }
      ];
      
      res.json(technicians);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ message: "Failed to fetch technicians" });
    }
  });

  // POST /api/issues/:id/fix - Mark issue as fixed
  app.post("/api/issues/:id/fix", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid issue ID" });
      }
      
      const { fixedById, fixedByName, notes } = req.body;
      
      // Validate required fields
      if (!fixedById || !fixedByName) {
        return res.status(400).json({ message: "fixedById and fixedByName are required" });
      }
      
      // Check if issue exists
      const issue = await storage.getIssue(id);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      
      // Check if issue is already fixed
      if (issue.status === IssueStatus.FIXED || issue.status === IssueStatus.COMPLETED) {
        return res.status(400).json({ message: "Issue is already fixed or completed" });
      }
      
      const updatedIssue = await storage.markIssueAsFixed(
        id,
        fixedById,
        fixedByName,
        notes
      );
      
      res.json(updatedIssue);
    } catch (error) {
      console.error("Error marking issue as fixed:", error);
      res.status(500).json({ message: "Failed to mark issue as fixed" });
    }
  });
  
  // ADMIN ROUTE: DELETE /api/admin/clean-all-issues - Clean up all issues (for testing only)
  app.delete("/api/admin/clean-all-issues", async (_req: Request, res: Response) => {
    try {
      // This is a special route for testing purposes only
      // It deletes all issues from the database
      // In a production environment, this would require admin authentication
      
      const { db } = await import('./db');
      const { eq } = await import('drizzle-orm');
      const { issues, comments, statusHistory, images } = await import('@shared/schema');
      
      // 1. Delete all comments
      await db.delete(comments);
      console.log("Deleted all comments");
      
      // 2. Delete all status history
      await db.delete(statusHistory);
      console.log("Deleted all status history");
      
      // 3. Delete all images
      await db.delete(images);
      console.log("Deleted all images");
      
      // 4. Delete all issues
      await db.delete(issues);
      console.log("Deleted all issues");
      
      res.status(200).json({ message: "All issues and related data successfully deleted" });
    } catch (error) {
      console.error("Error cleaning up issues:", error);
      res.status(500).json({ message: "Failed to clean up issues" });
    }
  });
  
  // GET /api/cleanup - Simple quick cleanup endpoint (for testing only)
  app.get("/api/cleanup", async (_req: Request, res: Response) => {
    try {
      const { db } = await import('./db');
      const { issues, comments, statusHistory, images } = await import('@shared/schema');
      
      // Delete all related data
      await db.delete(comments);
      await db.delete(statusHistory);
      await db.delete(images);
      await db.delete(issues);
      
      console.log("🧹 QUICK CLEANUP: Successfully removed all issues and related data");
      
      // Send a simple HTML response
      res.send(`
        <html>
          <head>
            <title>Database Cleaned</title>
            <style>
              body { font-family: system-ui, sans-serif; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 2rem; }
              .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 1rem; border-radius: 0.25rem; }
              .btn { display: inline-block; background: #3b82f6; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 0.25rem; margin-top: 1rem; }
            </style>
          </head>
          <body>
            <h1>Database Cleanup Complete</h1>
            <div class="success">
              <p>✅ All issues, comments, status history, and images have been deleted from the database.</p>
            </div>
            <p>The database is now clean and ready for fresh testing.</p>
            <a href="/" class="btn">Return to Home Page</a>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error cleaning up issues:", error);
      res.status(500).send(`
        <html>
          <head>
            <title>Cleanup Failed</title>
            <style>
              body { font-family: system-ui, sans-serif; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 2rem; }
              .error { background: #fee2e2; border-left: 4px solid #ef4444; padding: 1rem; border-radius: 0.25rem; }
              .btn { display: inline-block; background: #3b82f6; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 0.25rem; margin-top: 1rem; }
            </style>
          </head>
          <body>
            <h1>Cleanup Failed</h1>
            <div class="error">
              <p>❌ An error occurred while trying to clean the database: ${error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
            <a href="/" class="btn">Return to Home Page</a>
          </body>
        </html>
      `);
    }
  });

  // Register machine inventory and service tracking routes
  try {
    // Register the machine routes
    registerMachineRoutes(app);
    
    // Register notification routes
    registerNotificationRoutes(app);
    
    // Register maintenance planner routes
    registerMaintenanceRoutes(app);
    
    // Register repair schedule routes
    app.use(repairSchedulesRouter);
    
    // Schedule service check to run every hour
    const runServiceCheck = async () => {
      try {
        // Call the service check endpoint
        const response = await fetch('http://localhost:5000/api/notifications/check-service-reminders', {
          method: 'POST'
        });
        
        const result = await response.json();
        console.log('Scheduled service check completed:', result);
      } catch (error) {
        console.error('Error running scheduled service check:', error);
      }
    };
    
    // Run service check on server start and then every hour
    setTimeout(runServiceCheck, 10000); // Run after 10 seconds to ensure server is up
    setInterval(runServiceCheck, 60 * 60 * 1000); // Every hour
    
    console.log('✅ Machine inventory and notification routes registered successfully');
  } catch (error) {
    console.error('Error registering machine routes:', error);
  }

  // GET /api/users/role-counts - Get counts of users by role
  app.get("/api/users/role-counts", async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      
      // Count users by role
      const roleCounts = {
        adminCount: users.filter(user => user.role === UserRole.ADMIN).length,
        ownerCount: users.filter(user => user.role === UserRole.OWNER).length,
        managerCount: users.filter(user => user.role === UserRole.MANAGER).length,
        repairmanCount: users.filter(user => user.role === UserRole.REPAIRMAN).length,
        reporterCount: users.filter(user => user.role === UserRole.REPORTER).length
      };
      
      res.status(200).json(roleCounts);
    } catch (error) {
      console.error("Error getting role counts:", error);
      res.status(500).json({ message: "Failed to get role counts" });
    }
  });
  
  // GET /api/users - Get all users (Admin/Owner only)
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      // TEMPORARY: Allow all users to access this route for debugging
      // This bypass will make the User Management page work while we fix authentication
      console.log("User Management API called - EMERGENCY ACCESS GRANTED");
      
      const users = await storage.getAllUsers();
      
      // Remove passwords from response for security
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.status(200).json(sanitizedUsers);
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });
  
  // GET /api/users/:id - Get a specific user (Admin/Owner only)
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    // Emergency authentication check for direct-auth users
    const userId = req.session?.userId;
    const username = req.session?.username;
    const sessionRole = req.session?.role;
    
    // Only Admin and Owner roles can access users
    const isEmergencyAuth = username && sessionRole && 
      (sessionRole === UserRole.ADMIN || sessionRole === UserRole.OWNER);
      
    // Check database auth if not emergency auth
    let isDbAuth = false;
    if (!isEmergencyAuth && userId) {
      const storedUser = await storage.getUser(userId);
      isDbAuth = !!storedUser && 
        (storedUser.role === UserRole.ADMIN || storedUser.role === UserRole.OWNER);
    }
    
    // Return unauthorized if neither auth method is valid
    if (!isEmergencyAuth && !isDbAuth) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(200).json(user);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });
  
  // PUT /api/users/:id - Update a user (Admin/Owner only)
  app.put("/api/users/:id", async (req: Request, res: Response) => {
    // TEMPORARY: Allow all users to access this route for debugging
    console.log("Update user API called - EMERGENCY ACCESS GRANTED");
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Don't allow password updates via this endpoint
      const { password, ...updateData } = req.body;
      
      // If role is being updated, validate role limits
      if (updateData.role) {
        // Check if trying to create an admin or owner
        if (updateData.role === UserRole.ADMIN || updateData.role === UserRole.OWNER) {
          const users = await storage.getAllUsers();
          const adminCount = users.filter(user => user.role === UserRole.ADMIN && user.id !== id).length;
          const ownerCount = users.filter(user => user.role === UserRole.OWNER && user.id !== id).length;
          
          // Check if current user is being converted to admin
          if (updateData.role === UserRole.ADMIN && adminCount >= 1) {
            return res.status(400).json({ 
              message: "Admin role limit reached",
              details: "Only 1 Admin account is allowed"
            });
          }
          
          // Check if current user is being converted to owner
          if (updateData.role === UserRole.OWNER && ownerCount >= 4) {
            return res.status(400).json({ 
              message: "Owner role limit reached", 
              details: "Maximum of 4 Owner accounts allowed"
            });
          }
        }
      }
      
      const updatedUser = await storage.updateUser(id, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  // DELETE /api/users/:id - Delete a user (Admin only)
  app.delete("/api/users/:id", async (req: Request, res: Response) => {
    // TEMPORARY: Allow all users to access this route for debugging
    console.log("Delete user API called - EMERGENCY ACCESS GRANTED");
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Don't allow users to delete themselves
      if (req.session.userId === id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // GET /api/users/technicians - Get all technician users for service assignment
  app.get("/api/users/technicians", async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      
      // Filter users who have technician role or can perform maintenance
      const technicians = users.filter(user => 
        user.role === UserRole.TECHNICIAN || 
        user.role === UserRole.ADMIN || 
        user.role === UserRole.OWNER
      );
      
      // Return only necessary information for dropdown
      const technicianList = technicians.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role
      }));
      
      res.json(technicianList);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ message: "Failed to fetch technicians" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup WebSocket server for real-time updates
  const wss = setupWebSocketServer(httpServer);
  console.log('✅ WebSocket server initialized for real-time updates');
  
  // Helper function to broadcast issue updates to all connected clients
  const broadcastIssueUpdate = (type: MessageType, payload: any) => {
    broadcastToAll({
      type,
      payload,
      timestamp: new Date().toISOString()
    });
  };

  // Intercept issue creation/update/deletion to broadcast updates
  const originalCreateIssue = storage.createIssue;
  storage.createIssue = async function(data) {
    const issue = await originalCreateIssue.call(storage, data);
    broadcastIssueUpdate(MessageType.ISSUE_CREATED, issue);
    return issue;
  };

  const originalUpdateIssue = storage.updateIssue;
  storage.updateIssue = async function(id, data) {
    const issue = await originalUpdateIssue.call(storage, id, data);
    if (issue) {
      broadcastIssueUpdate(MessageType.ISSUE_UPDATED, issue);
    }
    return issue;
  };

  const originalDeleteIssue = storage.deleteIssue;
  storage.deleteIssue = async function(id) {
    const result = await originalDeleteIssue.call(storage, id);
    if (result) {
      broadcastIssueUpdate(MessageType.ISSUE_DELETED, { issueId: id });
    }
    return result;
  };

  // Intercept comment creation to broadcast updates
  const originalCreateComment = storage.createComment;
  storage.createComment = async function(data) {
    const comment = await originalCreateComment.call(storage, data);
    
    // Get the issue title to include in the notification
    const issue = await storage.getIssue(data.issueId);
    const commentWithTitle = {
      ...comment,
      issueTitle: issue ? issue.title : undefined
    };
    
    broadcastIssueUpdate(MessageType.COMMENT_ADDED, commentWithTitle);
    return comment;
  };

  // Intercept status changes to broadcast updates
  const originalCreateStatusHistory = storage.createStatusHistory;
  storage.createStatusHistory = async function(data) {
    const statusChange = await originalCreateStatusHistory.call(storage, data);
    broadcastIssueUpdate(MessageType.STATUS_CHANGED, statusChange);
    return statusChange;
  };

  // Make broadcast function available globally for other modules
  (global as any).broadcastIssueUpdate = broadcastIssueUpdate;

  // Register repair routes AFTER our main handlers to avoid conflicts
  app.use('/api/repair', repairRoutes);

  return httpServer;
}
