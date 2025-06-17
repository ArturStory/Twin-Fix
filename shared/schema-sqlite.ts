/**
 * SQLite schema definition using drizzle-orm
 * This version uses SQLite-specific types and syntax
 */
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define status options for issues
export enum IssueStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  SCHEDULED = "scheduled",
  URGENT = "urgent",
  FIXED = "fixed"
}

// Define priority levels
export enum IssuePriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high"
}

// Define issue types (specifically for McDonald's equipment)
export enum IssueType {
  FRYER = "fryer",
  GRILL = "grill",
  ICE_CREAM = "ice_cream_machine",
  DRINK_DISPENSER = "drink_dispenser",
  REFRIGERATOR = "refrigerator",
  SEATING = "seating",
  COUNTER = "counter",
  BATHROOM = "bathroom",
  FLOOR = "floor",
  CEILING = "ceiling",
  LIGHTING = "lighting",
  HVAC = "hvac",
  EXTERIOR = "exterior",
  PLAYGROUND = "playground",
  DRIVE_THRU = "drive_thru",
  OTHER = "other"
}

// Users table
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
});

// Issues table for community problems
export const issues = sqliteTable("issues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default(IssueStatus.PENDING),
  priority: text("priority").notNull().default(IssuePriority.MEDIUM),
  issueType: text("issue_type").default(IssueType.OTHER),
  location: text("location").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  reportedById: integer("reported_by_id").references(() => users.id),
  reportedByName: text("reported_by_name"),
  estimatedCost: real("estimated_cost"),
  finalCost: real("final_cost"),
  // Repair tracking fields
  fixedById: integer("fixed_by_id").references(() => users.id),
  fixedByName: text("fixed_by_name"),
  fixedAt: text("fixed_at"),
  timeToFix: integer("time_to_fix"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  imageUrls: text("image_urls"), // Store JSON string of image URLs
});

// Comments on issues
export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  issueId: integer("issue_id").notNull().references(() => issues.id),
  userId: integer("user_id").references(() => users.id),
  username: text("username").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

// For image uploads (stored in memory)
export const images = sqliteTable("images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  data: text("data").notNull(), // Base64 encoded image data
  issueId: integer("issue_id").references(() => issues.id),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: text("created_at").notNull(),
});

// Status history table to track all issue status changes
export const statusHistory = sqliteTable("status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  issueId: integer("issue_id").notNull().references(() => issues.id),
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  changedById: integer("changed_by_id").references(() => users.id),
  changedByName: text("changed_by_name"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  avatarUrl: true,
});

export const insertIssueSchema = createInsertSchema(issues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertImageSchema = createInsertSchema(images).omit({
  id: true,
  createdAt: true,
});

export const insertStatusHistorySchema = createInsertSchema(statusHistory).omit({
  id: true,
  createdAt: true,
});

// Create types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Issue = typeof issues.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertImage = z.infer<typeof insertImageSchema>;
export type Image = typeof images.$inferSelect;

export type InsertStatusHistory = z.infer<typeof insertStatusHistorySchema>;
export type StatusHistory = typeof statusHistory.$inferSelect;