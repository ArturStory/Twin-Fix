import { relations, sql } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './schema';

// Maintenance events table for scheduled maintenance
export const maintenanceEvents = pgTable('maintenance_events', {
  id: serial('id').primaryKey(),
  machineId: integer('machine_id').notNull(),
  machineName: text('machine_name').notNull(),
  location: text('location').notNull(),
  scheduledDate: text('scheduled_date').notNull(),
  scheduledTime: text('scheduled_time'),
  description: text('description').notNull(),
  assignedTechnicians: text('assigned_technicians').array().notNull().default(sql`'{}'`),
  status: text('status').notNull().default('scheduled'),
  estimatedDuration: integer('estimated_duration').notNull().default(60), // in minutes
  notes: text('notes'),
  reminderSent: boolean('reminder_sent').notNull().default(false),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Service history for tracking all service performed on machines
export const serviceHistory = pgTable('service_history', {
  id: serial('id').primaryKey(),
  machineId: integer('machine_id').notNull(),
  serviceDate: timestamp('service_date').notNull(),
  serviceType: text('service_type').notNull(),
  description: text('description').notNull(),
  technician: text('technician').notNull(),
  cost: integer('cost'),
  partsUsed: text('parts_used').array(),
  notes: text('notes'),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Parts inventory for tracking spare parts
export const partsInventory = pgTable('parts_inventory', {
  id: serial('id').primaryKey(),
  partNumber: text('part_number').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  quantityAvailable: integer('quantity_available').notNull().default(0),
  minimumStock: integer('minimum_stock').default(1),
  location: text('storage_location'),
  cost: integer('cost'),
  supplierInfo: text('supplier_info'),
  lastRestockDate: timestamp('last_restock_date'),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Machine parts relationship to track which parts are used for which machines
export const machineParts = pgTable('machine_parts', {
  id: serial('id').primaryKey(),
  machineId: integer('machine_id').notNull(),
  partId: integer('part_id').notNull().references(() => partsInventory.id),
  quantity: integer('quantity').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Relations
export const maintenanceEventsRelations = relations(maintenanceEvents, ({ one }) => ({
  creator: one(users, {
    fields: [maintenanceEvents.createdBy],
    references: [users.id]
  })
}));

export const serviceHistoryRelations = relations(serviceHistory, ({ one }) => ({
  creator: one(users, {
    fields: [serviceHistory.createdBy],
    references: [users.id]
  })
}));

export const partsInventoryRelations = relations(partsInventory, ({ one, many }) => ({
  creator: one(users, {
    fields: [partsInventory.createdBy],
    references: [users.id]
  }),
  machineParts: many(machineParts)
}));

export const machinePartsRelations = relations(machineParts, ({ one }) => ({
  part: one(partsInventory, {
    fields: [machineParts.partId],
    references: [partsInventory.id]
  })
}));

// Zod schemas for validation
export const insertMaintenanceEventSchema = createInsertSchema(maintenanceEvents, {
  assignedTechnicians: z.array(z.string()),
  estimatedDuration: z.number().min(15).max(480),
  machineId: z.number().positive(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  description: z.string().min(5).max(500),
  notes: z.string().max(1000).optional()
}).omit({ id: true, createdAt: true, updatedAt: true, reminderSent: true });

export const insertServiceHistorySchema = createInsertSchema(serviceHistory, {
  machineId: z.number().positive(),
  serviceDate: z.date(),
  serviceType: z.string().min(2).max(100),
  description: z.string().min(5).max(500),
  technician: z.string().min(2).max(100),
  cost: z.number().nonnegative().optional(),
  partsUsed: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertPartInventorySchema = createInsertSchema(partsInventory, {
  partNumber: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  quantityAvailable: z.number().nonnegative(),
  minimumStock: z.number().nonnegative().optional(),
  location: z.string().max(100).optional(),
  cost: z.number().nonnegative().optional(),
  supplierInfo: z.string().max(200).optional(),
  lastRestockDate: z.date().optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type MaintenanceEvent = typeof maintenanceEvents.$inferSelect;
export type InsertMaintenanceEvent = z.infer<typeof insertMaintenanceEventSchema>;

export type ServiceHistory = typeof serviceHistory.$inferSelect;
export type InsertServiceHistory = z.infer<typeof insertServiceHistorySchema>;

export type PartInventory = typeof partsInventory.$inferSelect;
export type InsertPartInventory = z.infer<typeof insertPartInventorySchema>;

export type MachinePart = typeof machineParts.$inferSelect;