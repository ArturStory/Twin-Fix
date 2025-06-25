import { 
  users, User, InsertUser, 
  issues, Issue, InsertIssue, 
  comments, Comment, InsertComment, 
  images, Image, InsertImage,
  statusChanges, StatusChange, InsertStatusChange,
  conversations, Conversation, InsertConversation,
  messages, Message, InsertMessage,
  IssueStatus,
  IssueType,
  RepairScheduleStatus,
  UserRole
} from "@shared/schema";
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and, or, sql } from 'drizzle-orm';
import { neon, neonConfig } from '@neondatabase/serverless';
import { Pool } from 'pg';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import createMemoryStore from 'memorystore';

// Interface for storage operations
export interface IStorage {
  // Session store for authentication
  sessionStore: session.Store;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Messaging operations
  getConversationsForUser(userId: number): Promise<any[]>;
  getMessagesByConversationId(conversationId: number): Promise<any[]>;
  createOrGetConversation(userId1: number, userId2: number): Promise<any>;
  isUserInConversation(userId: number, conversationId: number): Promise<boolean>;
  sendMessage(senderId: number, recipientId: number, content: string): Promise<any>;
  markConversationAsRead(userId: number, conversationId: number): Promise<boolean>;
  getUnreadMessageCount(userId: number): Promise<number>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Messaging operations
  getConversationsForUser(userId: number): Promise<any[]>;
  getMessagesByConversationId(conversationId: number): Promise<any[]>;
  getConversationById(conversationId: number): Promise<any>;
  isUserInConversation(userId: number, conversationId: number): Promise<boolean>;
  createOrGetConversation(userId1: number, userId2: number): Promise<any>;
  createMessage(message: any): Promise<any>;
  markConversationAsRead(conversationId: number, userId: number): Promise<boolean>;
  getUnreadMessageCount(userId: number): Promise<number>;
  
  // Issue operations
  getIssues(): Promise<Issue[]>;
  getIssue(id: number): Promise<Issue | undefined>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  updateIssue(id: number, issue: Partial<InsertIssue>): Promise<Issue | undefined>;
  deleteIssue(id: number): Promise<boolean>;
  deleteAllIssues(): Promise<boolean>;
  deleteAllStatusChanges(): Promise<boolean>;
  deleteAllComments(): Promise<boolean>;
  deleteAllImages(): Promise<boolean>;
  getNearbyIssues(lat: number, lng: number, radius: number): Promise<Issue[]>;
  getIssuesByType(issueType: IssueType): Promise<Issue[]>;
  getIssuesByStatus(status: IssueStatus): Promise<Issue[]>;
  updateIssueStatus(
    id: number, 
    newStatus: IssueStatus, 
    changedById?: number, 
    changedByName?: string, 
    notes?: string
  ): Promise<Issue | undefined>;
  markIssueAsFixed(
    id: number, 
    fixedById: number, 
    fixedByName: string,
    notes?: string
  ): Promise<Issue | undefined>;
  
  // Repair scheduling operations
  scheduleRepair(
    id: number,
    scheduledDate: Date,
    scheduledById: number,
    scheduledByName: string,
    notes?: string
  ): Promise<Issue | undefined>;
  
  updateRepairSchedule(
    id: number,
    scheduledDate: Date,
    scheduleStatus: RepairScheduleStatus,
    changedById: number,
    changedByName: string,
    notes?: string
  ): Promise<Issue | undefined>;
  
  getRepairScheduleHistory(issueId: number): Promise<RepairScheduleHistory[]>;
  
  markRepairCompleted(
    id: number,
    completedById: number,
    completedByName: string,
    finalCost?: number,
    notes?: string
  ): Promise<Issue | undefined>;
  
  // Comment operations
  getComments(issueId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // Image operations
  getImage(id: number): Promise<Image | undefined>;
  getImagesByIssueId(issueId: number): Promise<Image[]>;
  createImage(image: InsertImage): Promise<Image>;
  
  // Messaging operations
  getConversationsForUser(userId: number): Promise<any[]>;
  createOrGetConversation(userId1: number, userId2: number): Promise<any>;
  getMessagesByConversationId(conversationId: number): Promise<any[]>;
  createMessage(message: any): Promise<any>;
  markConversationAsRead(conversationId: number, userId: number): Promise<boolean>;
  isUserInConversation(userId: number, conversationId: number): Promise<boolean>;
  updateConversationLastMessageTime(conversationId: number): Promise<boolean>;
  getUnreadMessageCount(userId: number): Promise<number>;
  
  // Status history operations
  getStatusHistory(issueId: number): Promise<StatusChange[]>;
  createStatusHistory(history: InsertStatusChange): Promise<StatusChange>;
  deleteAllStatusChanges(): Promise<boolean>;
  
  // Repair schedule history operations
  createRepairScheduleHistory(history: InsertRepairScheduleHistory): Promise<RepairScheduleHistory>;
  
  // Bulk operations
  deleteAllComments(): Promise<boolean>;
  deleteAllImages(): Promise<boolean>;
  deleteAllIssues(): Promise<boolean>;
  
  // Statistics and analytics
  getIssueStatistics(issueType?: IssueType): Promise<{
    totalIssues: number;
    openIssues: number;
    fixedIssues: number;
    averageFixTime?: number; // in minutes
    mostReportedLocation?: string;
    lastFixDate?: Date;
  }>;
}

// Memory storage implementation - useful for testing and fallback
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private issues: Map<number, Issue>;
  private comments: Map<number, Comment>;
  private images: Map<number, Image>;
  private statusChanges: Map<number, StatusChange>;
  private repairScheduleHistory: Map<number, any>; // Temporary type
  private conversations: Map<number, any>; // Conversations for messaging
  private messages: Map<number, any[]>; // Messages for each conversation
  private userId: number;
  private issueId: number;
  private commentId: number;
  private imageId: number;
  private historyId: number;
  private repairHistoryId: number;
  private conversationId: number;
  private messageId: number;
  
  public sessionStore: session.Store;

  constructor() {
    // Initialize memory session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    this.users = new Map();
    this.issues = new Map();
    this.comments = new Map();
    this.images = new Map();
    this.statusChanges = new Map();
    this.repairScheduleHistory = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.userId = 1;
    this.issueId = 1;
    this.commentId = 1;
    this.imageId = 1;
    this.historyId = 1;
    this.repairHistoryId = 1;
    this.conversationId = 1;
    this.messageId = 1;
    
    // Create an initial user for testing
    this.createUser({
      username: "demo",
      password: "password",
      displayName: "Demo User",
      avatarUrl: "https://randomuser.me/api/portraits/men/1.jpg",
    });
    
    // Create some initial issues for testing
    this.createIssue({
      title: "Broken Elevator Control Panel",
      description: "Control panel buttons are unresponsive on the 3rd floor elevator. Unable to select floors 5-8.",
      status: IssueStatus.IN_PROGRESS,
      priority: "medium",
      location: "Building C, Floor 3",
      latitude: 40.712776,
      longitude: -74.005974,
      reportedById: 1,
      reportedByName: "Sarah J.",
      estimatedCost: 350,
      imageUrls: [],
    });
    
    this.createIssue({
      title: "Damaged Water Fountain",
      description: "Water fountain leaking and button mechanism stuck. Water continuously flowing and causing path flooding.",
      status: IssueStatus.COMPLETED,
      priority: "medium",
      location: "Community Park, West Entrance",
      latitude: 40.713776,
      longitude: -74.006974,
      reportedById: 1,
      reportedByName: "Miguel L.",
      estimatedCost: 180,
      finalCost: 180,
      imageUrls: [],
    });
    
    this.createIssue({
      title: "Playground Equipment Damage",
      description: "Swing set chains broken and slide has significant crack posing safety hazard for children.",
      status: IssueStatus.URGENT,
      priority: "high",
      location: "Riverside Elementary School",
      latitude: 40.714776,
      longitude: -74.007974,
      reportedById: 1,
      reportedByName: "Aisha K.",
      estimatedCost: 650,
      imageUrls: [],
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt,
      updatedAt,
      phone: insertUser.phone || null,
      photo: insertUser.photo || null,
      role: insertUser.role || UserRole.REPORTER,
      position: insertUser.position || null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser: User = {
      ...existingUser,
      ...userData,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Issue methods
  async getIssues(): Promise<Issue[]> {
    return Array.from(this.issues.values()).sort((a, b) => {
      // Sort by created date, most recent first
      return new Date(b.createdAt || Date.now()).getTime() - 
             new Date(a.createdAt || Date.now()).getTime();
    });
  }

  async getIssue(id: number): Promise<Issue | undefined> {
    return this.issues.get(id);
  }

  async createIssue(insertIssue: InsertIssue): Promise<Issue> {
    const id = this.issueId++;
    const now = new Date();
    const issue: Issue = { 
      ...insertIssue, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.issues.set(id, issue);
    return issue;
  }

  async updateIssue(id: number, updateData: Partial<InsertIssue>): Promise<Issue | undefined> {
    const issue = this.issues.get(id);
    if (!issue) {
      return undefined;
    }
    
    const updatedIssue = { 
      ...issue, 
      ...updateData, 
      updatedAt: new Date() 
    };
    
    this.issues.set(id, updatedIssue);
    return updatedIssue;
  }

  async deleteIssue(id: number): Promise<boolean> {
    return this.issues.delete(id);
  }

  // Delete all issues at once
  async deleteAllIssues(): Promise<boolean> {
    try {
      this.issues.clear();
      return true;
    } catch (error) {
      console.error('Error clearing all issues:', error);
      return false;
    }
  }
  
  // Delete all status changes at once
  async deleteAllStatusChanges(): Promise<boolean> {
    try {
      this.statusChanges.clear();
      return true;
    } catch (error) {
      console.error('Error clearing all status changes:', error);
      return false;
    }
  }
  
  // Delete all comments at once
  async deleteAllComments(): Promise<boolean> {
    try {
      this.comments.clear();
      return true;
    } catch (error) {
      console.error('Error clearing all comments:', error);
      return false;
    }
  }
  
  // Delete all images at once
  async deleteAllImages(): Promise<boolean> {
    try {
      this.images.clear();
      return true;
    } catch (error) {
      console.error('Error clearing all images:', error);
      return false;
    }
  }

  async getNearbyIssues(lat: number, lng: number, radius: number): Promise<Issue[]> {
    // A simple implementation to simulate nearby issues
    // In a real app, you'd use proper geospatial calculations
    return Array.from(this.issues.values()).filter(issue => {
      if (!issue.latitude || !issue.longitude) return false;
      
      // Calculate rough distance (this is not accurate, just for demo)
      const distance = Math.sqrt(
        Math.pow((issue.latitude - lat), 2) + 
        Math.pow((issue.longitude - lng), 2)
      );
      
      // Convert radius to a rough degree equivalent (very approximate)
      const degreeRadius = radius / 111000; // ~111km per degree
      return distance < degreeRadius;
    });
  }

  // Comment methods
  async getComments(issueId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.issueId === issueId)
      .sort((a, b) => {
        // Sort by created date, most recent first
        return new Date(b.createdAt || Date.now()).getTime() - 
               new Date(a.createdAt || Date.now()).getTime();
      });
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.commentId++;
    const now = new Date();
    const comment: Comment = { 
      ...insertComment, 
      id, 
      createdAt: now 
    };
    this.comments.set(id, comment);
    return comment;
  }

  // Image methods
  async getImage(id: number): Promise<Image | undefined> {
    return this.images.get(id);
  }

  async getImagesByIssueId(issueId: number): Promise<Image[]> {
    return Array.from(this.images.values())
      .filter(image => image.issueId === issueId);
  }

  async createImage(insertImage: InsertImage): Promise<Image> {
    const id = this.imageId++;
    const now = new Date();
    const image: Image = { 
      ...insertImage, 
      id, 
      createdAt: now 
    };
    this.images.set(id, image);
    
    // Update the issue's imageUrls array if this image is associated with an issue
    if (insertImage.issueId) {
      const issue = this.issues.get(insertImage.issueId);
      if (issue) {
        // Create a proper URL that will display the image via the /api/images/:id route
        const imageUrl = `/api/images/${id}`;
        // If issue already has imageUrls, add to them; otherwise create a new array
        const updatedImageUrls = [...(issue.imageUrls || []), imageUrl];
        // Update the issue with the new URLs
        this.updateIssue(insertImage.issueId, { imageUrls: updatedImageUrls });
      }
    }
    
    return image;
  }
  
  // Status history related methods
  async getStatusHistory(issueId: number): Promise<StatusChange[]> {
    return Array.from(this.statusChanges.values())
      .filter(history => history.issueId === issueId)
      .sort((a, b) => {
        // Sort by created date, most recent first
        return new Date(b.changedAt || Date.now()).getTime() - 
               new Date(a.changedAt || Date.now()).getTime();
      });
  }
  
  async createStatusHistory(insertHistory: InsertStatusChange): Promise<StatusChange> {
    const id = this.historyId++;
    const now = new Date();
    const history: StatusChange = { 
      ...insertHistory, 
      id, 
      changedAt: now 
    };
    this.statusChanges.set(id, history);
    return history;
  }
  
  // Issue type and status filtering
  async getIssuesByType(issueType: IssueType): Promise<Issue[]> {
    return Array.from(this.issues.values())
      .filter(issue => issue.issueType === issueType)
      .sort((a, b) => {
        // Sort by created date, most recent first
        return new Date(b.createdAt || Date.now()).getTime() - 
               new Date(a.createdAt || Date.now()).getTime();
      });
  }
  
  async getIssuesByStatus(status: IssueStatus): Promise<Issue[]> {
    return Array.from(this.issues.values())
      .filter(issue => issue.status === status)
      .sort((a, b) => {
        // Sort by created date, most recent first
        return new Date(b.createdAt || Date.now()).getTime() - 
               new Date(a.createdAt || Date.now()).getTime();
      });
  }
  
  // Status transition methods
  async updateIssueStatus(
    id: number, 
    newStatus: IssueStatus, 
    changedById?: number, 
    changedByName?: string,
    notes?: string
  ): Promise<Issue | undefined> {
    const issue = this.issues.get(id);
    if (!issue) return undefined;
    
    const oldStatus = issue.status as IssueStatus;
    
    // Skip if no actual change
    if (oldStatus === newStatus) return issue;
    
    // Create status history record
    await this.createStatusHistory({
      issueId: id,
      oldStatus,
      newStatus,
      changedById,
      changedByName,
      notes
    });
    
    // Prepare update data
    const updateData: Partial<Issue> = { 
      status: newStatus,
      updatedAt: new Date()
    };
    
    // If marking as completed or fixed, capture the user who fixed it
    if (newStatus === IssueStatus.COMPLETED || newStatus === IssueStatus.FIXED) {
      updateData.fixedById = changedById;
      updateData.fixedByName = changedByName;
      updateData.fixedAt = new Date();
      
      // Calculate time to fix if we have creation date
      if (issue.createdAt) {
        const timeToFixMs = updateData.fixedAt.getTime() - new Date(issue.createdAt).getTime();
        updateData.timeToFix = Math.round(timeToFixMs / (1000 * 60)); // Convert to minutes
      }
    }
    
    // Update issue
    const updatedIssue = await this.updateIssue(id, updateData);
    
    return updatedIssue;
  }
  
  async markIssueAsFixed(
    id: number, 
    fixedById: number, 
    fixedByName: string,
    notes?: string
  ): Promise<Issue | undefined> {
    const issue = this.issues.get(id);
    if (!issue) return undefined;
    
    const oldStatus = issue.status as IssueStatus;
    const now = new Date();
    
    // Create a status history record
    await this.createStatusHistory({
      issueId: id,
      oldStatus,
      newStatus: IssueStatus.FIXED,
      changedById: fixedById,
      changedByName: fixedByName,
      notes: notes || 'Issue fixed'
    });
    
    // Calculate time to fix in minutes
    const createdAt = issue.createdAt ? new Date(issue.createdAt) : undefined;
    const timeToFix = createdAt ? Math.round((now.getTime() - createdAt.getTime()) / (1000 * 60)) : undefined;
    
    // Update issue
    const updatedIssue = await this.updateIssue(id, { 
      status: IssueStatus.FIXED,
      fixedById,
      fixedByName,
      fixedAt: now,
      timeToFix,
      updatedAt: now
    });
    
    return updatedIssue;
  }
  
  // Repair schedule history methods
  async getRepairScheduleHistory(issueId: number): Promise<RepairScheduleHistory[]> {
    return Array.from(this.repairScheduleHistory.values())
      .filter(history => history.issueId === issueId)
      .sort((a, b) => {
        // Sort by created date, most recent first
        return new Date(b.createdAt || Date.now()).getTime() - 
               new Date(a.createdAt || Date.now()).getTime();
      });
  }
  
  async createRepairScheduleHistory(insertHistory: InsertRepairScheduleHistory): Promise<RepairScheduleHistory> {
    const id = this.repairHistoryId++;
    const now = new Date();
    const history: RepairScheduleHistory = { 
      ...insertHistory, 
      id, 
      createdAt: now 
    };
    this.repairScheduleHistory.set(id, history);
    return history;
  }

  // Repair scheduling methods
  async scheduleRepair(
    id: number,
    scheduledDate: Date,
    scheduledById: number,
    scheduledByName: string,
    notes?: string
  ): Promise<Issue | undefined> {
    const issue = this.issues.get(id);
    if (!issue) return undefined;
    
    const now = new Date();
    
    // Create a repair schedule history entry
    await this.createRepairScheduleHistory({
      issueId: id,
      oldScheduleDate: issue.scheduledDate || null,
      newScheduleDate: scheduledDate,
      oldStatus: issue.scheduleStatus || null,
      newStatus: RepairScheduleStatus.PROPOSED,
      changedById: scheduledById,
      changedByName: scheduledByName,
      notes: notes || 'Repair scheduled'
    });
    
    // Also update the issue status if it's in PENDING state
    if (issue.status === IssueStatus.PENDING) {
      await this.updateIssueStatus(
        id, 
        IssueStatus.SCHEDULED,
        scheduledById,
        scheduledByName,
        'Repair scheduled'
      );
    }
    
    // Update issue with scheduling info
    const updatedIssue = await this.updateIssue(id, {
      scheduledDate,
      scheduleStatus: RepairScheduleStatus.PROPOSED,
      scheduledById,
      scheduledByName,
      scheduledAt: now
    });
    
    return updatedIssue;
  }
  
  async updateRepairSchedule(
    id: number,
    scheduledDate: Date,
    scheduleStatus: RepairScheduleStatus,
    changedById: number,
    changedByName: string,
    notes?: string
  ): Promise<Issue | undefined> {
    const issue = this.issues.get(id);
    if (!issue) return undefined;
    
    // Skip if nothing changed
    if (issue.scheduledDate?.getTime() === scheduledDate.getTime() && 
        issue.scheduleStatus === scheduleStatus) {
      return issue;
    }
    
    // Create a repair schedule history entry
    await this.createRepairScheduleHistory({
      issueId: id,
      oldScheduleDate: issue.scheduledDate || null,
      newScheduleDate: scheduledDate,
      oldStatus: issue.scheduleStatus || null,
      newStatus: scheduleStatus,
      changedById,
      changedByName,
      notes
    });
    
    // Update issue status if repair is confirmed and not already in progress
    if (scheduleStatus === RepairScheduleStatus.CONFIRMED && 
        issue.status !== IssueStatus.IN_PROGRESS) {
      await this.updateIssueStatus(
        id,
        IssueStatus.SCHEDULED,
        changedById,
        changedByName,
        'Repair date confirmed'
      );
    }
    
    // Update issue with new schedule info
    const updatedIssue = await this.updateIssue(id, {
      scheduledDate,
      scheduleStatus,
      updatedAt: new Date()
    });
    
    return updatedIssue;
  }
  
  async markRepairCompleted(
    id: number,
    completedById: number,
    completedByName: string,
    finalCost?: number,
    notes?: string
  ): Promise<Issue | undefined> {
    const issue = this.issues.get(id);
    if (!issue) return undefined;
    
    const now = new Date();
    
    // Create a repair schedule history entry
    await this.createRepairScheduleHistory({
      issueId: id,
      oldScheduleDate: issue.scheduledDate || null,
      newScheduleDate: issue.scheduledDate || null,
      oldStatus: issue.scheduleStatus || null,
      newStatus: RepairScheduleStatus.COMPLETED,
      changedById: completedById,
      changedByName: completedByName,
      notes: notes || 'Repair completed'
    });
    
    // Mark issue as fixed
    const updatedIssue = await this.markIssueAsFixed(
      id,
      completedById,
      completedByName,
      notes
    );
    
    // Update the final cost if provided
    if (finalCost !== undefined && updatedIssue) {
      await this.updateIssue(id, {
        finalCost,
        scheduleStatus: RepairScheduleStatus.COMPLETED
      });
    }
    
    return updatedIssue;
  }
  
  // Statistics
  async getIssueStatistics(issueType?: IssueType): Promise<{
    totalIssues: number;
    openIssues: number;
    fixedIssues: number;
    averageFixTime?: number;
    mostReportedLocation?: string;
    lastFixDate?: Date;
  }> {
    // Filter issues by type if provided
    let filteredIssues = Array.from(this.issues.values());
    
    if (issueType) {
      filteredIssues = filteredIssues.filter(issue => issue.issueType === issueType);
    }
    
    // Get open issues (not fixed)
    const openIssues = filteredIssues.filter(
      issue => issue.status !== IssueStatus.FIXED && issue.status !== IssueStatus.COMPLETED
    ).length;
    
    // Get fixed issues
    const fixedIssues = filteredIssues.filter(
      issue => issue.status === IssueStatus.FIXED || issue.status === IssueStatus.COMPLETED
    );
    
    // Calculate average fix time from issues that have timeToFix field
    const issuesWithFixTime = fixedIssues.filter(issue => issue.timeToFix);
    const totalFixTime = issuesWithFixTime.reduce((sum, issue) => sum + (issue.timeToFix || 0), 0);
    const averageFixTime = issuesWithFixTime.length > 0 ? totalFixTime / issuesWithFixTime.length : undefined;
    
    // Find the most reported location
    const locationCounts = filteredIssues.reduce((counts, issue) => {
      const location = issue.location;
      counts[location] = (counts[location] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    let mostReportedLocation: string | undefined;
    let maxCount = 0;
    
    for (const [location, count] of Object.entries(locationCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostReportedLocation = location;
      }
    }
    
    // Find the last fix date
    let lastFixDate: Date | undefined;
    
    for (const issue of fixedIssues) {
      const fixedAt = issue.fixedAt ? new Date(issue.fixedAt) : undefined;
      
      if (fixedAt && (!lastFixDate || fixedAt > lastFixDate)) {
        lastFixDate = fixedAt;
      }
    }
    
    return {
      totalIssues: filteredIssues.length,
      openIssues,
      fixedIssues: fixedIssues.length,
      averageFixTime,
      mostReportedLocation,
      lastFixDate
    };
  }
  
  // Messaging operations
  async getConversationsForUser(userId: number): Promise<any[]> {
    // Get all conversations where the user is a participant
    const userConversations: any[] = [];
    
    for (const [id, conversation] of this.conversations.entries()) {
      if (conversation.participant1Id === userId || conversation.participant2Id === userId) {
        // Determine the other user in the conversation
        const otherUserId = conversation.participant1Id === userId 
          ? conversation.participant2Id 
          : conversation.participant1Id;
        
        // Get the other user's details
        const otherUser = await this.getUser(otherUserId);
        if (!otherUser) continue;
        
        // Count unread messages for this conversation
        const conversationMessages = this.messages.get(id) || [];
        const unreadCount = conversationMessages.filter(
          message => message.recipientId === userId && !message.read
        ).length;
        
        userConversations.push({
          id,
          otherUser: {
            id: otherUser.id,
            username: otherUser.username,
            email: otherUser.email,
            role: otherUser.role,
            photo: otherUser.photo
          },
          lastMessageAt: conversation.lastMessageAt,
          unreadCount
        });
      }
    }
    
    // Sort by most recent message
    return userConversations.sort((a, b) => {
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
  }

  async createOrGetConversation(userId1: number, userId2: number): Promise<any> {
    try {
      // First check if conversation exists in database
      const existingConversation = await this.db
        .select()
        .from(conversations)
        .where(
          or(
            and(eq(conversations.participant1Id, userId1), eq(conversations.participant2Id, userId2)),
            and(eq(conversations.participant1Id, userId2), eq(conversations.participant2Id, userId1))
          )
        )
        .limit(1);

      if (existingConversation.length > 0) {
        return existingConversation[0];
      }

      // Create new conversation in database
      const [newConversation] = await this.db
        .insert(conversations)
        .values({
          participant1Id: userId1,
          participant2Id: userId2,
        })
        .returning();

      return newConversation;
    } catch (error) {
      console.error('Error creating/getting conversation:', error);
      throw error;
    }
  }

  async getMessagesByConversationId(conversationId: number): Promise<any[]> {
    try {
      // Get messages from database
      const conversationMessages = await this.db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);

      // Add sender details to each message
      const messagesWithSenders = await Promise.all(
        conversationMessages.map(async (message) => {
          const sender = await this.getUser(message.senderId);
          
          return {
            ...message,
            senderName: sender?.username || 'Unknown User',
            senderPhoto: sender?.photo || null
          };
        })
      );

      return messagesWithSenders;
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  async getConversationById(conversationId: number): Promise<any> {
    try {
      const [conversation] = await this.db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId));

      return conversation || null;
    } catch (error) {
      console.error('Error getting conversation by ID:', error);
      return null;
    }
  }

  async createMessage(messageData: any): Promise<any> {
    try {
      // Insert message into database
      const [newMessage] = await this.db
        .insert(messages)
        .values({
          conversationId: messageData.conversationId,
          senderId: messageData.senderId,
          content: messageData.content,
        })
        .returning();

      // Update conversation's last message time
      await this.db
        .update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, messageData.conversationId));

      return newMessage;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  async markConversationAsRead(conversationId: number, userId: number): Promise<boolean> {
    try {
      // Mark all unread messages in this conversation as read for this user
      await this.db
        .update(messages)
        .set({ read: true })
        .where(
          and(
            eq(messages.conversationId, conversationId),
            ne(messages.senderId, userId) // Don't mark own messages as read
          )
        );

      return true;
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      return false;
    }
  }

  async isUserInConversation(userId: number, conversationId: number): Promise<boolean> {
    try {
      const conversation = await this.db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (conversation.length === 0) return false;

      const conv = conversation[0];
      return conv.userId1 === userId || conv.userId2 === userId;
    } catch (error) {
      console.error('Error checking user in conversation:', error);
      return false;
    }
  }

  async updateConversationLastMessageTime(conversationId: number): Promise<boolean> {
    try {
      await this.db
        .update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, conversationId));

      return true;
    } catch (error) {
      console.error('Error updating conversation last message time:', error);
      return false;
    }
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    try {
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(
          and(
            or(
              eq(conversations.userId1, userId),
              eq(conversations.userId2, userId)
            ),
            ne(messages.senderId, userId), // Don't count own messages
            eq(messages.read, false)
          )
        );

      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }
}

// PostgreSQL storage implementation
export class PostgresStorage implements IStorage {
  private db: any;
  private pool: Pool;
  public sessionStore: session.Store;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    // Create a connection to PostgreSQL using the Pool from pg
    this.pool = new Pool({
      connectionString: databaseUrl,
    });
    
    // Initialize PostgreSQL session store
    const PostgresSessionStore = connectPgSimple(session);
    this.sessionStore = new PostgresSessionStore({
      pool: this.pool,
      tableName: 'session', // You can customize the table name
      createTableIfMissing: true
    });
    
    this.db = drizzle(this.pool);
  }
  
  // Messaging operations
  async getConversationsForUser(userId: number): Promise<any[]> {
    try {
      // Get conversations where the user is either participant1 or participant2
      const conversationsData = await this.db
        .select({
          id: conversations.id,
          participant1Id: conversations.participant1Id,
          participant2Id: conversations.participant2Id,
          lastMessageAt: conversations.lastMessageAt,
          unreadCount: conversations.unreadCount
        })
        .from(conversations)
        .where(
          sql`${conversations.participant1Id} = ${userId} OR ${conversations.participant2Id} = ${userId}`
        );
      
      // Now for each conversation, get the other user's details
      const result = [];
      for (const conversation of conversationsData) {
        // Determine the other participant's ID
        const otherUserId = conversation.participant1Id === userId 
          ? conversation.participant2Id 
          : conversation.participant1Id;
        
        // Get the other user's details
        const [otherUser] = await this.db
          .select({
            id: users.id,
            username: users.username,
            email: users.email,
            role: users.role,
            photo: users.photo
          })
          .from(users)
          .where(eq(users.id, otherUserId));
        
        if (otherUser) {
          result.push({
            id: conversation.id,
            otherUser,
            lastMessageAt: conversation.lastMessageAt,
            unreadCount: conversation.unreadCount
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error getting conversations for user:', error);
      return [];
    }
  }
  
  async getMessagesByConversationId(conversationId: number): Promise<any[]> {
    try {
      // Check if conversation exists
      const [conversation] = await this.db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId));
      
      if (!conversation) {
        return [];
      }
      
      // Get all messages for this conversation
      const messagesResult = await this.db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          recipientId: messages.recipientId,
          content: messages.content,
          read: messages.read,
          createdAt: messages.createdAt
        })
        .from(messages)
        .where(
          sql`(${messages.senderId} = ${conversation.participant1Id} AND ${messages.recipientId} = ${conversation.participant2Id}) 
              OR 
              (${messages.senderId} = ${conversation.participant2Id} AND ${messages.recipientId} = ${conversation.participant1Id})`
        )
        .orderBy(messages.createdAt);
      
      return messagesResult;
    } catch (error) {
      console.error('Error getting messages by conversation ID:', error);
      return [];
    }
  }
  
  async createOrGetConversation(userId1: number, userId2: number): Promise<any> {
    try {
      // First check if a conversation already exists between these users
      const existingConversation = await this.db
        .select()
        .from(conversations)
        .where(
          sql`(${conversations.participant1Id} = ${userId1} AND ${conversations.participant2Id} = ${userId2})
              OR
              (${conversations.participant1Id} = ${userId2} AND ${conversations.participant2Id} = ${userId1})`
        );
      
      if (existingConversation.length > 0) {
        // Conversation exists, return it with other user details
        const otherUserId = existingConversation[0].participant1Id === userId1
          ? existingConversation[0].participant2Id
          : existingConversation[0].participant1Id;
        
        const [otherUser] = await this.db
          .select({
            id: users.id,
            username: users.username,
            email: users.email,
            role: users.role,
            photo: users.photo
          })
          .from(users)
          .where(eq(users.id, otherUserId));
        
        return {
          id: existingConversation[0].id,
          otherUser,
          lastMessageAt: existingConversation[0].lastMessageAt,
          unreadCount: existingConversation[0].unreadCount
        };
      }
      
      // No existing conversation, create a new one
      const [newConversation] = await this.db
        .insert(conversations)
        .values({
          participant1Id: userId1,
          participant2Id: userId2,
          lastMessageAt: new Date(),
          unreadCount: 0
        })
        .returning();
      
      // Get other user details
      const [otherUser] = await this.db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
          photo: users.photo
        })
        .from(users)
        .where(eq(users.id, userId2));
      
      return {
        id: newConversation.id,
        otherUser,
        lastMessageAt: newConversation.lastMessageAt,
        unreadCount: 0
      };
    } catch (error) {
      console.error('Error creating or getting conversation:', error);
      throw error;
    }
  }
  
  async isUserInConversation(userId: number, conversationId: number): Promise<boolean> {
    try {
      const [conversation] = await this.db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId));
      
      if (!conversation) {
        return false;
      }
      
      return conversation.participant1Id === userId || conversation.participant2Id === userId;
    } catch (error) {
      console.error('Error checking if user is in conversation:', error);
      return false;
    }
  }

  async createMessage(message: any): Promise<any> {
    try {
      // Get conversation to determine recipient
      const [conversation] = await this.db
        .select()
        .from(conversations)
        .where(eq(conversations.id, message.conversationId));
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      // Determine recipient (the other participant in the conversation)
      const recipientId = conversation.participant1Id === message.senderId 
        ? conversation.participant2Id 
        : conversation.participant1Id;
      
      const [newMessage] = await this.db
        .insert(messages)
        .values({
          senderId: message.senderId,
          recipientId: recipientId,
          content: message.content,
          createdAt: new Date()
        })
        .returning();
      
      // Update conversation last message time
      await this.updateConversationLastMessageTime(message.conversationId);
      
      return newMessage;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }
  
  async sendMessage(senderId: number, recipientId: number, content: string): Promise<any> {
    try {
      // First, get or create a conversation between these users
      const conversation = await this.createOrGetConversation(senderId, recipientId);
      
      // Create the message
      const [message] = await this.db
        .insert(messages)
        .values({
          senderId,
          recipientId,
          content,
          read: false
        })
        .returning();
      
      // Update the conversation's last message time and increment unread count
      await this.db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          unreadCount: sql`${conversations.unreadCount} + 1`
        })
        .where(eq(conversations.id, conversation.id));
      
      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
  
  async markConversationAsRead(userId: number, conversationId: number): Promise<boolean> {
    try {
      // Check if the user is part of this conversation
      const isUserInConversation = await this.isUserInConversation(userId, conversationId);
      
      if (!isUserInConversation) {
        return false;
      }
      
      // Get the conversation
      const [conversation] = await this.db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId));
      
      if (!conversation) {
        return false;
      }
      
      // Mark all messages as read where this user is the recipient
      await this.db
        .update(messages)
        .set({ read: true })
        .where(
          and(
            eq(messages.recipientId, userId),
            sql`(${messages.senderId} = ${conversation.participant1Id} OR ${messages.senderId} = ${conversation.participant2Id})`
          )
        );
      
      // Reset the unread count for this conversation
      await this.db
        .update(conversations)
        .set({ unreadCount: 0 })
        .where(eq(conversations.id, conversationId));
      
      return true;
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      return false;
    }
  }
  
  async getUnreadMessageCount(userId: number): Promise<number> {
    try {
      // Count all unread messages where this user is the recipient
      const result = await this.db
        .select({ count: sql`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.recipientId, userId),
            eq(messages.read, false)
          )
        );
      
      return parseInt(result[0].count) || 0;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }

  async getConversationById(conversationId: number): Promise<any> {
    try {
      const result = await this.db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error getting conversation by ID:', error);
      return null;
    }
  }

  // Initialize the database with some sample data if it's empty
  async init() {
    try {
      // Check if there are any users
      const userCount = await this.db.select({ count: sql`count(*)` }).from(users);
      
      if (parseInt(userCount[0].count) === 0) {
        // Create a demo user
        await this.createUser({
          username: "demo",
          password: "password",
          displayName: "Demo User",
          avatarUrl: "https://randomuser.me/api/portraits/men/1.jpg",
        });
        
        // Create some sample issues
        const user = await this.getUserByUsername("demo");
        if (user) {
          await this.createIssue({
            title: "Broken Elevator Control Panel",
            description: "Control panel buttons are unresponsive on the 3rd floor elevator. Unable to select floors 5-8.",
            status: IssueStatus.IN_PROGRESS,
            priority: "medium",
            location: "Building C, Floor 3",
            latitude: 40.712776,
            longitude: -74.005974,
            reportedById: user.id,
            reportedByName: "Sarah J.",
            estimatedCost: 350,
            imageUrls: [],
          });
          
          await this.createIssue({
            title: "Damaged Water Fountain",
            description: "Water fountain leaking and button mechanism stuck. Water continuously flowing and causing path flooding.",
            status: IssueStatus.COMPLETED,
            priority: "medium",
            location: "Community Park, West Entrance",
            latitude: 40.713776,
            longitude: -74.006974,
            reportedById: user.id,
            reportedByName: "Miguel L.",
            estimatedCost: 180,
            finalCost: 180,
            imageUrls: [],
          });
          
          await this.createIssue({
            title: "Playground Equipment Damage",
            description: "Swing set chains broken and slide has significant crack posing safety hazard for children.",
            status: IssueStatus.URGENT,
            priority: "high",
            location: "Riverside Elementary School",
            latitude: 40.714776,
            longitude: -74.007974,
            reportedById: user.id,
            reportedByName: "Aisha K.",
            estimatedCost: 650,
            imageUrls: [],
          });
        }
      }
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      console.log('PostgresStorage: Creating user with data:', {
        ...user,
        password: user.password ? '[REDACTED]' : undefined
      });
      
      // Ensure timestamps are properly set
      const now = new Date();
      const userData = {
        ...user,
        createdAt: now,
        updatedAt: now
      };
      
      console.log('Final user data being inserted:', {
        ...userData,
        password: '[REDACTED]'
      });
      
      const result = await this.db.insert(users).values(userData).returning();
      console.log('User created successfully:', { id: result[0]?.id, username: result[0]?.username });
      return result[0];
    } catch (error) {
      console.error('PostgresStorage: Error creating user:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users).orderBy(users.username);
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // Delete all records that reference this user (in correct order)
      
      // 1. Delete messages first (they may reference conversations)
      await this.db.execute(sql`
        DELETE FROM messages WHERE sender_id = ${id} OR recipient_id = ${id}
      `);

      // 2. Delete conversations
      await this.db.execute(sql`
        DELETE FROM conversations WHERE participant1_id = ${id} OR participant2_id = ${id}
      `);

      // 3. Delete/update all other tables that reference this user
      await this.db.execute(sql`
        UPDATE comments SET user_id = NULL WHERE user_id = ${id}
      `);

      await this.db.execute(sql`
        UPDATE issues SET reported_by_id = NULL WHERE reported_by_id = ${id}
      `);

      await this.db.execute(sql`
        UPDATE issues SET fixed_by_id = NULL WHERE fixed_by_id = ${id}
      `);

      await this.db.execute(sql`
        UPDATE issues SET scheduled_by_id = NULL WHERE scheduled_by_id = ${id}
      `);

      await this.db.execute(sql`
        UPDATE status_history SET changed_by_id = NULL WHERE changed_by_id = ${id}
      `);

      await this.db.execute(sql`
        UPDATE status_changes SET changed_by_id = NULL WHERE changed_by_id = ${id}
      `);

      await this.db.execute(sql`
        UPDATE repair_schedule_history SET changed_by_id = NULL WHERE changed_by_id = ${id}
      `);

      await this.db.execute(sql`
        DELETE FROM machine_services WHERE performed_by_id = ${id}
      `);

      await this.db.execute(sql`
        DELETE FROM machine_assignments WHERE user_id = ${id}
      `);

      await this.db.execute(sql`
        DELETE FROM notifications WHERE user_id = ${id}
      `);

      // 4. Now delete the user
      const result = await this.db
        .delete(users)
        .where(eq(users.id, id))
        .returning({ id: users.id });
      
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  // Issue methods
  async getIssues(): Promise<Issue[]> {
    return await this.db.select().from(issues).orderBy(sql`${issues.createdAt} DESC`);
  }

  async getIssue(id: number): Promise<Issue | undefined> {
    const result = await this.db.select().from(issues).where(eq(issues.id, id)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  }

  async createIssue(issue: InsertIssue): Promise<Issue> {
    const now = new Date();
    const newIssue = {
      ...issue,
      createdAt: now,
      updatedAt: now
    };
    const result = await this.db.insert(issues).values(newIssue).returning();
    return result[0];
  }

  async updateIssue(id: number, updateData: Partial<InsertIssue>): Promise<Issue | undefined> {
    try {
      const now = new Date();
      
      // Create a safe copy of update data for logging (to avoid huge image data in logs)
      const safeUpdate = { ...updateData };
      if (safeUpdate.imageUrls) {
        safeUpdate.imageUrls = Array.isArray(safeUpdate.imageUrls) 
          ? `[${safeUpdate.imageUrls.length} URLs]` 
          : String(safeUpdate.imageUrls);
      }
      console.log(`Updating issue ${id} with data:`, safeUpdate);
      
      // Handle the case where imageUrls is being updated
      // Use direct SQL for array updates to ensure proper formatting
      if (updateData.imageUrls !== undefined) {
        // First update everything except imageUrls
        const dataWithoutImages = { ...updateData };
        delete dataWithoutImages.imageUrls;
        
        if (Object.keys(dataWithoutImages).length > 0) {
          await this.db
            .update(issues)
            .set({
              ...dataWithoutImages,
              updatedAt: now
            })
            .where(eq(issues.id, id));
        }
        
        // Then update imageUrls separately using SQL to ensure proper array format
        return await this.updateIssueImages(id, updateData.imageUrls);
      }
      
      // If we're not updating imageUrls, proceed normally
      const result = await this.db
        .update(issues)
        .set({
          ...updateData,
          updatedAt: now
        })
        .where(eq(issues.id, id))
        .returning();
        
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error(`Error updating issue ${id}:`, error);
      throw error;
    }
  }
  
  // Special method to handle updating image URLs properly
  async updateIssueImages(id: number, imageUrls: string[]): Promise<Issue | undefined> {
    try {
      // Ensure we have a valid array of strings
      const validUrls = Array.isArray(imageUrls) 
        ? imageUrls.filter(url => typeof url === 'string') 
        : [];
        
      console.log(`Updating issue ${id} with ${validUrls.length} image URLs using SQL`);
      
      // Format the array properly for PostgreSQL
      const formattedArray = JSON.stringify(validUrls);
      console.log(`Formatted array for PostgreSQL: ${formattedArray}`);
      
      // Use the properly formatted JSON array with parameterized query
      const result = await this.db.execute(
        sql`UPDATE issues SET image_urls = ${formattedArray}::jsonb, updated_at = NOW() WHERE id = ${id} RETURNING *`
      );
      
      if (result.length > 0) {
        console.log(`Successfully updated issue ${id} with ${validUrls.length} images`);
        return result[0] as Issue;
      }
      
      return undefined;
    } catch (error) {
      console.error(`Error updating issue ${id} images:`, error);
      
      // Try an alternative approach if the first method fails
      try {
        console.log(`Attempting alternative update method for issue ${id}`);
        // Get the current issue first
        const currentIssue = await this.getIssue(id);
        if (!currentIssue) return undefined;
        
        // Use the update method without modifying imageUrls
        const updateResult = await this.db
          .update(issues)
          .set({
            updatedAt: new Date(),
            // Use JSON.stringify to format the array properly
            // This gets cast to the proper type by PostgreSQL
            imageUrls: JSON.parse(JSON.stringify(imageUrls))
          })
          .where(eq(issues.id, id))
          .returning();
          
        if (updateResult.length > 0) {
          console.log(`Successfully updated issue ${id} with images using alternative method`);
          return updateResult[0];
        }
      } catch (altError) {
        console.error(`Alternative update method also failed:`, altError);
      }
      
      // Just return the issue without the updated images as a fallback
      return this.getIssue(id);
    }
  }

  async deleteIssue(id: number): Promise<boolean> {
    try {
      // First handle any repair schedule history entries for this issue
      // We need to do this safely, as the repairScheduleHistory table might not exist in all environments
      try {
        // Try to clear repair schedule history associated with the issue
        await this.db.execute(sql`DELETE FROM "repair_schedule_history" WHERE "issue_id" = ${id}`);
      } catch (historyError) {
        // If table doesn't exist or some other error occurs, just log it and continue
        console.log("Note: Could not delete repair schedule history (table may not exist):", historyError);
      }
      
      // Handle additional history tables (status_history, comment) that might exist but aren't in our schema
      try {
        await this.db.execute(sql`DELETE FROM "status_history" WHERE "issue_id" = ${id}`);
      } catch (err) {
        console.log("Note: Could not delete status_history (table may not exist)");
      }
      
      try {
        await this.db.execute(sql`DELETE FROM "status_change" WHERE "issue_id" = ${id}`);
      } catch (err) {
        console.log("Note: Could not delete status_change (table may not exist)");
      }
      
      try {
        await this.db.execute(sql`DELETE FROM "image" WHERE "issue_id" = ${id}`);
      } catch (err) {
        console.log("Note: Could not delete image table (may not exist)");
      }
      
      try {
        await this.db.execute(sql`DELETE FROM "comment" WHERE "issue_id" = ${id}`);
      } catch (err) {
        console.log("Note: Could not delete comment table (may not exist)");
      }
      
      // Start a transaction to ensure all related records are removed
      await this.db.transaction(async (tx) => {
        // First delete all related comments from modern schema
        await tx.delete(comments).where(eq(comments.issueId, id));
        
        // Delete status changes from modern schema
        await tx.delete(statusChanges).where(eq(statusChanges.issueId, id));
        
        // Delete images from modern schema
        await tx.delete(images).where(eq(images.issueId, id));
        
        // Finally delete the issue itself
        await tx.delete(issues).where(eq(issues.id, id));
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting issue:", error);
      return false;
    }
  }

  async getNearbyIssues(lat: number, lng: number, radius: number): Promise<Issue[]> {
    // Distance calculation using PostgreSQL's Earth distance functions
    // The radius is in meters
    return await this.db.execute(sql`
      SELECT * FROM "issues"
      WHERE earth_distance(
        ll_to_earth(${lat}, ${lng}),
        ll_to_earth("latitude", "longitude")
      ) <= ${radius}
      ORDER BY earth_distance(
        ll_to_earth(${lat}, ${lng}),
        ll_to_earth("latitude", "longitude")
      ) ASC
    `);
  }

  // Comment methods
  async getComments(issueId: number): Promise<Comment[]> {
    return await this.db
      .select()
      .from(comments)
      .where(eq(comments.issueId, issueId))
      .orderBy(sql`${comments.createdAt} DESC`);
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const now = new Date();
    const newComment = {
      ...comment,
      createdAt: now
    };
    const result = await this.db.insert(comments).values(newComment).returning();
    return result[0];
  }

  // Image methods
  async getImage(id: number): Promise<Image | undefined> {
    const result = await this.db.select().from(images).where(eq(images.id, id)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  }

  async getImagesByIssueId(issueId: number): Promise<Image[]> {
    return await this.db.select().from(images).where(eq(images.issueId, issueId));
  }

  async createImage(image: InsertImage): Promise<Image> {
    try {
      const now = new Date();
      
      // Create a safe version of the image object without including the full base64 data in logs
      const safeImageLog = { 
        ...image, 
        data: image.data ? `${image.data.substring(0, 20)}... (${image.data.length} chars)` : null 
      };
      console.log('Creating image with data:', safeImageLog);
      
      // Prepare a clean image object for database insertion
      const newImage = {
        ...image,
        createdAt: now
      };
      
      const result = await this.db.insert(images).values(newImage).returning();
      console.log('Image successfully saved with ID:', result[0].id);
      
      // Update the issue's imageUrls array if this image is associated with an issue
      if (image.issueId) {
        try {
          const issue = await this.getIssue(image.issueId);
          if (issue) {
            // Create a properly formatted URL reference instead of embedding base64 data
            const imageUrl = `/api/images/${result[0].id}`;
            
            // Handle the case where imageUrls might be null/undefined
            const currentUrls = Array.isArray(issue.imageUrls) ? issue.imageUrls : [];
            const updatedImageUrls = [...currentUrls, imageUrl];
            
            console.log(`Updating issue ${image.issueId} with new image URL:`, imageUrl);
            
            // Update using a standard update that doesn't rely on complex JSON operations
            await this.db
              .update(issues)
              .set({ imageUrls: updatedImageUrls })
              .where(eq(issues.id, image.issueId));
              
            console.log(`Successfully updated issue ${image.issueId} with new image URL`);
          }
        } catch (error) {
          console.error('Error updating issue with image URL:', error);
          // Don't fail the entire image upload if just the URL update fails
        }
      }
      
      return result[0];
    } catch (error) {
      console.error('Error in createImage:', error);
      throw error;
    }
  }
  
  // Status history operations
  async getStatusHistory(issueId: number): Promise<StatusHistory[]> {
    return await this.db
      .select()
      .from(statusHistory)
      .where(eq(statusHistory.issueId, issueId))
      .orderBy(sql`${statusHistory.createdAt} DESC`);
  }
  
  async createStatusHistory(history: InsertStatusHistory): Promise<StatusHistory> {
    const now = new Date();
    const newHistory = {
      ...history,
      createdAt: now
    };
    const result = await this.db.insert(statusChanges).values(newHistory).returning();
    return result[0];
  }
  
  // Issue filtering by type and status
  async getIssuesByType(issueType: IssueType): Promise<Issue[]> {
    return await this.db
      .select()
      .from(issues)
      .where(eq(issues.issueType, issueType))
      .orderBy(sql`${issues.createdAt} DESC`);
  }
  
  async getIssuesByStatus(status: IssueStatus): Promise<Issue[]> {
    return await this.db
      .select()
      .from(issues)
      .where(eq(issues.status, status))
      .orderBy(sql`${issues.createdAt} DESC`);
  }
  
  // Status transition methods
  async updateIssueStatus(
    id: number, 
    newStatus: IssueStatus, 
    changedById?: number, 
    changedByName?: string,
    notes?: string
  ): Promise<Issue | undefined> {
    // Get the current issue status
    const issue = await this.getIssue(id);
    if (!issue) return undefined;
    
    const oldStatus = issue.status as IssueStatus;
    
    // Skip if no actual change
    if (oldStatus === newStatus) return issue;
    
    try {
      // Add history record
      await this.createStatusHistory({
        issueId: id,
        oldStatus,
        newStatus,
        changedById,
        changedByName,
        notes
      });
      
      // Update the issue
      const updatedIssue = await this.updateIssue(id, { 
        status: newStatus,
        updatedAt: new Date()
      });
      
      return updatedIssue;
    } catch (error) {
      console.error('Error updating issue status:', error);
      return undefined;
    }
  }
  
  async markIssueAsFixed(
    id: number, 
    fixedById: number, 
    fixedByName: string,
    notes?: string
  ): Promise<Issue | undefined> {
    // Get the current issue
    const issue = await this.getIssue(id);
    if (!issue) return undefined;
    
    const oldStatus = issue.status as IssueStatus;
    const now = new Date();
    
    try {
      // Add history record
      await this.createStatusHistory({
        issueId: id,
        oldStatus,
        newStatus: IssueStatus.FIXED,
        changedById: fixedById,
        changedByName: fixedByName,
        notes: notes || 'Issue fixed'
      });
      
      // Calculate time to fix in minutes
      const createdAt = issue.createdAt ? new Date(issue.createdAt) : undefined;
      const timeToFix = createdAt ? Math.round((now.getTime() - createdAt.getTime()) / (1000 * 60)) : undefined;
      
      // Update the issue
      const updatedIssue = await this.updateIssue(id, { 
        status: IssueStatus.FIXED,
        fixedById,
        fixedByName,
        fixedAt: now,
        timeToFix,
        updatedAt: now
      });
      
      return updatedIssue;
    } catch (error) {
      console.error('Error marking issue as fixed:', error);
      return undefined;
    }
  }
  
  // Statistics
  async getIssueStatistics(issueType?: IssueType): Promise<{
    totalIssues: number;
    openIssues: number;
    fixedIssues: number;
    averageFixTime?: number;
    mostReportedLocation?: string;
    lastFixDate?: Date;
  }> {
    try {
      // Base query filter
      let baseQuery = this.db.select().from(issues);
      
      if (issueType) {
        baseQuery = baseQuery.where(eq(issues.issueType, issueType));
      }
      
      // Get all issues with the filter
      const allIssues = await baseQuery;
      
      // Count open issues
      const openIssues = allIssues.filter(
        issue => issue.status !== IssueStatus.FIXED && issue.status !== IssueStatus.COMPLETED
      ).length;
      
      // Get fixed issues
      const fixedIssues = allIssues.filter(
        issue => issue.status === IssueStatus.FIXED || issue.status === IssueStatus.COMPLETED
      );
      
      // Calculate average fix time
      const issuesWithFixTime = fixedIssues.filter(issue => issue.timeToFix);
      const totalFixTime = issuesWithFixTime.reduce((sum, issue) => sum + (issue.timeToFix || 0), 0);
      const averageFixTime = issuesWithFixTime.length > 0 ? totalFixTime / issuesWithFixTime.length : undefined;
      
      // Find the most reported location
      const locationCounts: Record<string, number> = {};
      for (const issue of allIssues) {
        const location = issue.location;
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      }
      
      let mostReportedLocation: string | undefined;
      let maxCount = 0;
      
      for (const [location, count] of Object.entries(locationCounts)) {
        if (count > maxCount) {
          maxCount = count;
          mostReportedLocation = location;
        }
      }
      
      // Find the last fix date
      let lastFixDate: Date | undefined;
      
      for (const issue of fixedIssues) {
        const fixedAt = issue.fixedAt ? new Date(issue.fixedAt) : undefined;
        
        if (fixedAt && (!lastFixDate || fixedAt > lastFixDate)) {
          lastFixDate = fixedAt;
        }
      }
      
      return {
        totalIssues: allIssues.length,
        openIssues,
        fixedIssues: fixedIssues.length,
        averageFixTime,
        mostReportedLocation,
        lastFixDate
      };
    } catch (error) {
      console.error('Error getting issue statistics:', error);
      return {
        totalIssues: 0,
        openIssues: 0,
        fixedIssues: 0
      };
    }
  }
}

// Export the appropriate storage implementation based on environment
// Import SQLite storage implementation
// Import SQLiteStorage from JS file (to avoid TypeScript issues with better-sqlite3)
// @ts-ignore - Ignore TypeScript errors for this import
import { SQLiteStorage } from "./sqlite-storage";
let storage: IStorage;

// Check for USE_SQLITE environment variable to enable SQLite storage
console.log('Environment variable USE_SQLITE:', process.env.USE_SQLITE);
if (process.env.USE_SQLITE === 'true') {
  console.log('Using SQLite storage');
  storage = new SQLiteStorage();
}
// Use PostgreSQL in production and development environments if DATABASE_URL is available
else if (process.env.DATABASE_URL) {
  console.log('Using PostgreSQL storage');
  storage = new PostgresStorage();
  
  // Initialize the database with sample data if needed
  (async () => {
    try {
      const pgStorage = storage as PostgresStorage;
      await pgStorage.init();
    } catch (error) {
      console.error('Error initializing PostgreSQL storage:', error);
      
      // Try to fallback to SQLite if PostgreSQL initialization fails
      try {
        console.log('Attempting to fallback to SQLite storage');
        storage = new SQLiteStorage();
      } catch (sqliteError) {
        console.error('Error initializing SQLite storage:', sqliteError);
        
        // Final fallback to in-memory storage if both PostgreSQL and SQLite fail
        console.log('Falling back to in-memory storage');
        storage = new MemStorage();
      }
    }
  })();
} else {
  console.log('Using in-memory storage');
  storage = new MemStorage();
}

export { storage };
