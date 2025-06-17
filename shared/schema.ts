import { relations, sql } from 'drizzle-orm';
import { boolean, date, decimal, integer, pgEnum, pgTable, serial, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// ============= Issue Status and Priority Enums =============
export const IssueStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SCHEDULED: 'scheduled',
  URGENT: 'urgent',
  FIXED: 'fixed',
} as const;

export const IssuePriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

// Issue Category Enum
export const IssueCategory = {
  MACHINE: 'machine',
  GENERAL: 'general',
} as const;

// Export IssueType for backward compatibility
export const IssueType = {
  DAMAGE: 'damage',
  HAZARD: 'hazard',
  MAINTENANCE: 'maintenance',
  CLEANING: 'cleaning',
  OTHER: 'other',
} as const;

// Add RepairScheduleStatus which is missing
export const RepairScheduleStatus = {
  PROPOSED: 'proposed',
  CONFIRMED: 'confirmed',
  RESCHEDULED: 'rescheduled',
  CANCELLED: 'cancelled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

// User Roles Enum
export const UserRole = {
  ADMIN: 'admin',
  OWNER: 'owner',
  MANAGER: 'manager',
  REPAIRMAN: 'repairman',
  REPORTER: 'reporter',
} as const;

// ============= User Schema =============
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull(), // Email is now required
  password: text('password').notNull(),
  phone: text('phone'), // Added phone field
  photo: text('photo'), // Added photo URL field
  role: text('role').notNull().default(UserRole.REPORTER),
  position: text('position'), // Added detailed position information
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  reportedIssues: many(issues, { relationName: 'reporter' }),
  fixedIssues: many(issues, { relationName: 'fixer' }),
  statusChanges: many(statusChanges),
  comments: many(comments),
  machineAssignments: many(machineAssignments),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

// ============= Issue Schema =============
export const issues = pgTable('issues', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  location: text('location').notNull(),
  status: text('status').notNull().default(IssueStatus.PENDING),
  priority: text('priority').notNull().default(IssuePriority.MEDIUM),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  reporterId: integer('reported_by_id').references(() => users.id).notNull(),
  reportedByName: text('reported_by_name'),
  // The model uses 'fixedById' and 'fixedByName' fields for the technician who fixed the issue
  fixedById: integer('fixed_by_id').references(() => users.id),
  fixedByName: text('fixed_by_name'),
  fixedAt: timestamp('fixed_at'),
  timeToFix: integer('time_to_fix'),
  finalCost: decimal('final_cost', { precision: 10, scale: 2 }),
  latitude: decimal('latitude', { precision: 10, scale: 6 }),
  longitude: decimal('longitude', { precision: 10, scale: 6 }),
  // We already have reportedByName and fixedByName fields above
  // machineId doesn't exist in the database, so we'll remove it from the schema
  // Machine relationship for machine-specific issues
  machineId: integer('machine_id').references(() => machines.id),
  // Issue category: 'machine' or 'general'
  category: text('category').notNull().default('general'),
  // Other related fields in the database
  issueType: text('issue_type'),
  scheduleStatus: text('schedule_status'),
  scheduledAt: timestamp('scheduled_at'),
  scheduledDate: timestamp('scheduled_date'),
  scheduledById: integer('scheduled_by_id'),
  scheduledByName: text('scheduled_by_name'),
  notes: text('notes'),
  imageUrls: text('image_urls').array(),
});

export const issuesRelations = relations(issues, ({ one, many }) => ({
  reporter: one(users, {
    fields: [issues.reporterId],
    references: [users.id],
    relationName: 'reporter'
  }),
  // Replace technician relation with fixer relation
  fixer: one(users, {
    fields: [issues.fixedById],
    references: [users.id],
    relationName: 'fixer'
  }),
  // Machine relation for machine-specific issues
  machine: one(machines, {
    fields: [issues.machineId],
    references: [machines.id]
  }),
  statusChanges: many(statusChanges),
  comments: many(comments),
  images: many(images),
  // Remove the machine relation since there's no machine_id in the database
  
}));

export type Issue = typeof issues.$inferSelect;
export type InsertIssue = typeof issues.$inferInsert;
export const insertIssueSchema = createInsertSchema(issues);
export const selectIssueSchema = createSelectSchema(issues);

// ============= Status Change Schema =============
export const statusChanges = pgTable('status_changes', {
  id: serial('id').primaryKey(),
  issueId: integer('issue_id').references(() => issues.id).notNull(),
  oldStatus: text('old_status').notNull(),
  newStatus: text('new_status').notNull(),
  changedAt: timestamp('changed_at').defaultNow(),
  changedById: integer('changed_by_id').references(() => users.id),
  changedByName: text('changed_by_name'),
  notes: text('notes'),
});

export const statusChangesRelations = relations(statusChanges, ({ one }) => ({
  issue: one(issues, {
    fields: [statusChanges.issueId],
    references: [issues.id]
  }),
  changedBy: one(users, {
    fields: [statusChanges.changedById],
    references: [users.id]
  }),
}));

export type StatusChange = typeof statusChanges.$inferSelect;
export type InsertStatusChange = typeof statusChanges.$inferInsert;
export const insertStatusChangeSchema = createInsertSchema(statusChanges);
export const selectStatusChangeSchema = createSelectSchema(statusChanges);

// ============= Comment Schema =============
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  userId: integer('user_id').references(() => users.id),
  username: text('username').notNull(),
  issueId: integer('issue_id').references(() => issues.id).notNull(),
});

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id]
  }),
  issue: one(issues, {
    fields: [comments.issueId],
    references: [issues.id]
  }),
}));

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;
export const insertCommentSchema = createInsertSchema(comments);
export const selectCommentSchema = createSelectSchema(comments);

// ============= Image Schema =============
export const images = pgTable('images', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  issueId: integer('issue_id').references(() => issues.id),
  mimeType: text('mime_type'),
  data: text('data'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const imagesRelations = relations(images, ({ one }) => ({
  issue: one(issues, {
    fields: [images.issueId],
    references: [issues.id]
  }),
}));

export type Image = typeof images.$inferSelect;
export type InsertImage = typeof images.$inferInsert;
export const insertImageSchema = createInsertSchema(images);
export const selectImageSchema = createSelectSchema(images);

// ============= Machine Category Schema =============
export const machineCategories = pgTable('machine_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  serviceIntervalDays: integer('service_interval_days').default(90),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const machineCategoriesRelations = relations(machineCategories, ({ many }) => ({
  machines: many(machines)
}));

export type MachineCategory = typeof machineCategories.$inferSelect;
export type InsertMachineCategory = typeof machineCategories.$inferInsert;
export const insertMachineCategorySchema = createInsertSchema(machineCategories);
export const selectMachineCategorySchema = createSelectSchema(machineCategories);

// ============= Machine Schema =============
export const machines = pgTable('machines', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  serialNumber: text('serial_number').notNull().unique(),
  manufacturer: text('manufacturer').notNull(),
  model: text('model').notNull(),
  installationDate: date('installation_date').notNull(),
  lastServiceDate: date('last_service_date'),
  nextServiceDate: date('next_service_date'),
  location: text('location').notNull(),
  categoryId: integer('category_id').references(() => machineCategories.id).notNull(),
  description: text('description'),
  status: text('status').notNull().default('operational'),
  serviceIntervalDays: integer('service_interval_days').default(90),
  imageUrl: text('image_url'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const machinesRelations = relations(machines, ({ one, many }) => ({
  category: one(machineCategories, {
    fields: [machines.categoryId],
    references: [machineCategories.id]
  }),
  // Issues related to this machine
  issues: many(issues),
  serviceHistory: many(machineServices),
  assignments: many(machineAssignments),
}));

export type Machine = typeof machines.$inferSelect;
export type InsertMachine = typeof machines.$inferInsert;
export const insertMachineSchema = createInsertSchema(machines);
export const selectMachineSchema = createSelectSchema(machines);

// ============= Machine Service Schema =============
export const machineServices = pgTable('machine_services', {
  id: serial('id').primaryKey(),
  machineId: integer('machine_id').references(() => machines.id).notNull(),
  serviceDate: timestamp('service_date').notNull(),
  technicianId: integer('technician_id').references(() => users.id),
  technicianName: text('technician_name'),
  nextServiceDate: timestamp('next_service_date'),
  description: text('description').notNull(),
  cost: decimal('cost', { precision: 10, scale: 2 }),
  isCompleted: boolean('is_completed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const machineServicesRelations = relations(machineServices, ({ one }) => ({
  machine: one(machines, {
    fields: [machineServices.machineId],
    references: [machines.id]
  }),
  technician: one(users, {
    fields: [machineServices.technicianId],
    references: [users.id]
  }),
}));

export type MachineService = typeof machineServices.$inferSelect;
export type InsertMachineService = typeof machineServices.$inferInsert;
export const insertMachineServiceSchema = createInsertSchema(machineServices);
export const selectMachineServiceSchema = createSelectSchema(machineServices);

// ============= Machine Assignments Schema =============
export const machineAssignments = pgTable('machine_assignments', {
  id: serial('id').primaryKey(),
  machineId: integer('machine_id').references(() => machines.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  role: text('role').notNull().default('technician'),
  assignedAt: timestamp('assigned_at').defaultNow(),
  notificationEnabled: boolean('notification_enabled').default(true),
});

export const machineAssignmentsRelations = relations(machineAssignments, ({ one }) => ({
  machine: one(machines, {
    fields: [machineAssignments.machineId],
    references: [machines.id]
  }),
  user: one(users, {
    fields: [machineAssignments.userId],
    references: [users.id]
  }),
}));

export type MachineAssignment = typeof machineAssignments.$inferSelect;
export type InsertMachineAssignment = typeof machineAssignments.$inferInsert;
export const insertMachineAssignmentSchema = createInsertSchema(machineAssignments);
export const selectMachineAssignmentSchema = createSelectSchema(machineAssignments);

// ============= Notification Schema =============
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('info'),
  isRead: boolean('is_read').default(false),
  relatedMachineId: integer('related_machine_id').references(() => machines.id),
  relatedIssueId: integer('related_issue_id').references(() => issues.id),
  link: text('link'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  }),
  relatedMachine: one(machines, {
    fields: [notifications.relatedMachineId],
    references: [machines.id]
  }),
  relatedIssue: one(issues, {
    fields: [notifications.relatedIssueId],
    references: [issues.id]
  }),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export const insertNotificationSchema = createInsertSchema(notifications);
export const selectNotificationSchema = createSelectSchema(notifications);

// ============= Repair Schedule History Schema =============
export const repairScheduleHistory = pgTable('repair_schedule_history', {
  id: serial('id').primaryKey(),
  issueId: integer('issue_id').references(() => issues.id).notNull(),
  oldScheduleDate: timestamp('old_schedule_date'),
  newScheduleDate: timestamp('new_schedule_date'),
  oldStatus: text('old_status'),
  newStatus: text('new_status'),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const repairScheduleHistoryRelations = relations(repairScheduleHistory, ({ one }) => ({
  issue: one(issues, {
    fields: [repairScheduleHistory.issueId],
    references: [issues.id]
  }),
  user: one(users, {
    fields: [repairScheduleHistory.createdBy],
    references: [users.id]
  }),
}));

export type RepairScheduleHistory = typeof repairScheduleHistory.$inferSelect;
export type InsertRepairScheduleHistory = typeof repairScheduleHistory.$inferInsert;
export const insertRepairScheduleHistorySchema = createInsertSchema(repairScheduleHistory);
export const selectRepairScheduleHistorySchema = createSelectSchema(repairScheduleHistory);

// ============= Messaging System Schema =============
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: integer('sender_id').references(() => users.id).notNull(),
  recipientId: integer('recipient_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: 'sentMessages'
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: 'receivedMessages'
  }),
}));

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export const insertMessageSchema = createInsertSchema(messages, {
  content: z.string().min(1, { message: "Message content is required" }),
}).omit({ id: true, createdAt: true, updatedAt: true, read: true });
export const selectMessageSchema = createSelectSchema(messages);

export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  participant1Id: integer('participant1_id').references(() => users.id).notNull(),
  participant2Id: integer('participant2_id').references(() => users.id).notNull(),
  lastMessageAt: timestamp('last_message_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  unreadCount: integer('unread_count').default(0).notNull(),
}, (table) => {
  return {
    participantsPair: unique().on(table.participant1Id, table.participant2Id)
  };
});

export const conversationsRelations = relations(conversations, ({ one }) => ({
  participant1: one(users, {
    fields: [conversations.participant1Id],
    references: [users.id],
    relationName: 'conversationsAsParticipant1'
  }),
  participant2: one(users, {
    fields: [conversations.participant2Id],
    references: [users.id],
    relationName: 'conversationsAsParticipant2'
  }),
}));

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export const insertConversationSchema = createInsertSchema(conversations).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  lastMessageAt: true,
  unreadCount: true
});
export const selectConversationSchema = createSelectSchema(conversations);

// ============= Notification Settings Schema =============
export const notificationSettings = pgTable('notification_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  emailNotifications: boolean('email_notifications').default(true).notNull(),
  pushNotifications: boolean('push_notifications').default(true).notNull(),
  smsNotifications: boolean('sms_notifications').default(false).notNull(),
  inAppNotifications: boolean('in_app_notifications').default(true).notNull(),
  phoneNumber: text('phone_number'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const notificationSettingsRelations = relations(notificationSettings, ({ one }) => ({
  user: one(users, {
    fields: [notificationSettings.userId],
    references: [users.id],
    relationName: 'notificationSettings'
  }),
}));

export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type InsertNotificationSetting = typeof notificationSettings.$inferInsert;
export const insertNotificationSettingSchema = createInsertSchema(notificationSettings, {
  phoneNumber: z.string().optional(),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const selectNotificationSettingSchema = createSelectSchema(notificationSettings);

// ============= Location Management Schema =============
export const buildings = pgTable('buildings', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdById: integer('created_by_id').references(() => users.id),
});

export const floors = pgTable('floors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  buildingId: integer('building_id').references(() => buildings.id).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const rooms = pgTable('rooms', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  floorId: integer('floor_id').references(() => floors.id).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations for location management
export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  floors: many(floors),
  createdBy: one(users, {
    fields: [buildings.createdById],
    references: [users.id]
  }),
}));

export const floorsRelations = relations(floors, ({ one, many }) => ({
  building: one(buildings, {
    fields: [floors.buildingId],
    references: [buildings.id]
  }),
  rooms: many(rooms),
}));

export const roomsRelations = relations(rooms, ({ one }) => ({
  floor: one(floors, {
    fields: [rooms.floorId],
    references: [floors.id]
  }),
}));

// Types and schemas for location management
export type Building = typeof buildings.$inferSelect;
export type InsertBuilding = typeof buildings.$inferInsert;
export const insertBuildingSchema = createInsertSchema(buildings).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type Floor = typeof floors.$inferSelect;
export type InsertFloor = typeof floors.$inferInsert;
export const insertFloorSchema = createInsertSchema(floors).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;
export const insertRoomSchema = createInsertSchema(rooms).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// ============= Shared Locations Schema =============
export const sharedLocations = pgTable('shared_locations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull().default('restaurant'),
  address: text('address'),
  isShared: boolean('is_shared').notNull().default(true),
  createdBy: text('created_by').notNull(),
  createdById: integer('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sharedLocationsRelations = relations(sharedLocations, ({ one }) => ({
  creator: one(users, {
    fields: [sharedLocations.createdById],
    references: [users.id]
  }),
}));

export type SharedLocation = typeof sharedLocations.$inferSelect;
export type InsertSharedLocation = typeof sharedLocations.$inferInsert;
export const insertSharedLocationSchema = createInsertSchema(sharedLocations).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  isShared: true,
  createdById: true
});