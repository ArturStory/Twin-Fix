import { Request, Response } from 'express';
import { db } from '../db';
import { 
  machines, 
  machineCategories, 
  machineServices, 
  machineAssignments,
  notifications,
  users,
  insertMachineSchema,
  insertMachineServiceSchema,
  insertMachineCategorySchema,
  insertMachineAssignmentSchema
} from '@shared/schema';
import { eq, and, lte, gte, desc, asc, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { addDays, differenceInDays } from 'date-fns';
import { broadcastUpdate } from '../ws-broadcast';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for machine image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'static', 'images', 'machines');
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueName = `machine-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export const registerMachineRoutes = (app: any) => {
  // Get all machines with their categories
  app.get('/api/machines', async (_req: Request, res: Response) => {
    try {
      const result = await db.query.machines.findMany({
        with: {
          category: true,
        },
        orderBy: [desc(machines.createdAt)]
      });
      
      // For each machine, calculate days until next service
      const machinesWithServiceData = result.map(machine => {
        let daysUntilService = null;
        let serviceStatus = 'unknown';
        
        if (machine.nextServiceDate) {
          const nextServiceDate = new Date(machine.nextServiceDate);
          const today = new Date();
          daysUntilService = differenceInDays(nextServiceDate, today);
          
          // Determine service status based on days remaining
          if (daysUntilService < 0) {
            serviceStatus = 'overdue';
          } else if (daysUntilService <= 7) {
            serviceStatus = 'due-soon';
          } else if (daysUntilService <= 30) {
            serviceStatus = 'upcoming';
          } else {
            serviceStatus = 'scheduled';
          }
        }
        
        return {
          ...machine,
          daysUntilService,
          serviceStatus
        };
      });

      return res.json(machinesWithServiceData);
    } catch (err) {
      console.error('Error fetching machines:', err);
      return res.status(500).json({ error: 'Failed to fetch machines' });
    }
  });

  // Get a single machine by ID with related information
  app.get('/api/machines/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      const machine = await db.query.machines.findFirst({
        where: eq(machines.id, id),
        with: {
          category: true,
          serviceHistory: {
            orderBy: [desc(machineServices.serviceDate)]
          },
          assignments: {
            with: {
              user: true
            }
          },
          issues: true
        }
      });
      
      if (!machine) {
        return res.status(404).json({ error: 'Machine not found' });
      }

      // Calculate days until next service
      let daysUntilService = null;
      let serviceStatus = 'unknown';
      
      if (machine.nextServiceDate) {
        const nextServiceDate = new Date(machine.nextServiceDate);
        const today = new Date();
        daysUntilService = differenceInDays(nextServiceDate, today);
        
        // Determine service status based on days remaining
        if (daysUntilService < 0) {
          serviceStatus = 'overdue';
        } else if (daysUntilService <= 7) {
          serviceStatus = 'due-soon';
        } else if (daysUntilService <= 30) {
          serviceStatus = 'upcoming';
        } else {
          serviceStatus = 'scheduled';
        }
      }
      
      return res.json({
        ...machine,
        daysUntilService,
        serviceStatus
      });
    } catch (err) {
      console.error('Error fetching machine:', err);
      return res.status(500).json({ error: 'Failed to fetch machine' });
    }
  });

  // Create a new machine
  app.post('/api/machines', async (req: Request, res: Response) => {
    try {
      // Validate request body against schema
      const validatedData = insertMachineSchema.parse(req.body);
      
      // Parse dates correctly
      const installDate = typeof validatedData.installationDate === 'string' 
        ? new Date(validatedData.installationDate)
        : validatedData.installationDate;
      
      // Calculate next service date based on category service interval if not provided
      if (!validatedData.nextServiceDate && validatedData.categoryId) {
        const category = await db.query.machineCategories.findFirst({
          where: eq(machineCategories.id, validatedData.categoryId)
        });
        
        if (category?.serviceIntervalDays) {
          // Calculate from installation date or today if not available
          const baseDate = installDate || new Date();
          const nextServiceDate = addDays(baseDate, category.serviceIntervalDays);
          validatedData.nextServiceDate = nextServiceDate.toISOString().split('T')[0];
        }
      }
      
      // Insert the new machine
      const [newMachine] = await db.insert(machines).values(validatedData).returning();
      
      // Broadcast real-time update
      broadcastUpdate('machine_created', newMachine);
      
      // Return the created machine
      return res.status(201).json(newMachine);
    } catch (err) {
      console.error('Error creating machine:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: err.errors });
      }
      return res.status(500).json({ error: 'Failed to create machine' });
    }
  });

  // Update a machine
  app.patch('/api/machines/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // First check if machine exists
      const existingMachine = await db.query.machines.findFirst({
        where: eq(machines.id, id)
      });
      
      if (!existingMachine) {
        return res.status(404).json({ error: 'Machine not found' });
      }
      
      // Validate and update the machine
      const updatedData = req.body;
      
      // Format dates correctly for PostgreSQL
      if (updatedData.installationDate) {
        if (updatedData.installationDate instanceof Date) {
          updatedData.installationDate = updatedData.installationDate.toISOString().split('T')[0];
        }
      }
      if (updatedData.lastServiceDate) {
        if (updatedData.lastServiceDate instanceof Date) {
          updatedData.lastServiceDate = updatedData.lastServiceDate.toISOString().split('T')[0];
        }
      }
      if (updatedData.nextServiceDate) {
        if (updatedData.nextServiceDate instanceof Date) {
          updatedData.nextServiceDate = updatedData.nextServiceDate.toISOString().split('T')[0];
        }
      }
      
      // Update the machine
      const [updated] = await db.update(machines)
        .set({
          ...updatedData,
          updatedAt: new Date()
        })
        .where(eq(machines.id, id))
        .returning();
      
      return res.json(updated);
    } catch (err) {
      console.error('Error updating machine:', err);
      return res.status(500).json({ error: 'Failed to update machine' });
    }
  });

  // Delete a machine
  app.delete('/api/machines/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if the machine exists
      const existingMachine = await db.query.machines.findFirst({
        where: eq(machines.id, id)
      });
      
      if (!existingMachine) {
        return res.status(404).json({ error: 'Machine not found' });
      }
      
      // Delete the machine (cascade delete should handle related records)
      await db.delete(machines).where(eq(machines.id, id));
      
      return res.status(204).send();
    } catch (err) {
      console.error('Error deleting machine:', err);
      return res.status(500).json({ error: 'Failed to delete machine' });
    }
  });

  // Get all machine categories
  app.get('/api/machine-categories', async (_req: Request, res: Response) => {
    try {
      const categories = await db.select().from(machineCategories).orderBy(asc(machineCategories.name));
      return res.json(categories);
    } catch (err) {
      console.error('Error fetching machine categories:', err);
      return res.status(500).json({ error: 'Failed to fetch machine categories' });
    }
  });

  // Create a new machine category
  app.post('/api/machine-categories', async (req: Request, res: Response) => {
    try {
      const validatedData = insertMachineCategorySchema.parse(req.body);
      const [newCategory] = await db.insert(machineCategories).values(validatedData).returning();
      return res.status(201).json(newCategory);
    } catch (err) {
      console.error('Error creating machine category:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: err.errors });
      }
      return res.status(500).json({ error: 'Failed to create machine category' });
    }
  });

  // Update a machine category
  app.put('/api/machine-categories/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertMachineCategorySchema.parse(req.body);
      
      // Check if category exists
      const existingCategory = await db.query.machineCategories.findFirst({
        where: eq(machineCategories.id, id)
      });
      
      if (!existingCategory) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      const [updatedCategory] = await db.update(machineCategories)
        .set(validatedData)
        .where(eq(machineCategories.id, id))
        .returning();
        
      return res.json(updatedCategory);
    } catch (err) {
      console.error('Error updating machine category:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: err.errors });
      }
      return res.status(500).json({ error: 'Failed to update machine category' });
    }
  });

  // Delete a machine category
  app.delete('/api/machine-categories/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if category exists
      const existingCategory = await db.query.machineCategories.findFirst({
        where: eq(machineCategories.id, id)
      });
      
      if (!existingCategory) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      // Check if any machines are using this category
      const machinesUsingCategory = await db.query.machines.findMany({
        where: eq(machines.categoryId, id)
      });
      
      if (machinesUsingCategory.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete category', 
          message: `${machinesUsingCategory.length} machine(s) are still assigned to this category. Please reassign them first.`,
          machinesCount: machinesUsingCategory.length
        });
      }
      
      // Delete the category
      await db.delete(machineCategories).where(eq(machineCategories.id, id));
      
      return res.status(204).send();
    } catch (err) {
      console.error('Error deleting machine category:', err);
      return res.status(500).json({ error: 'Failed to delete machine category' });
    }
  });

  // Record a new service for a machine
  app.post('/api/machines/:id/services', async (req: Request, res: Response) => {
    try {
      const machineId = parseInt(req.params.id);
      
      // Check if the machine exists
      const existingMachine = await db.query.machines.findFirst({
        where: eq(machines.id, machineId)
      });
      
      if (!existingMachine) {
        return res.status(404).json({ error: 'Machine not found' });
      }
      
      // Validate service data
      const serviceData = insertMachineServiceSchema.parse({
        ...req.body,
        machineId
      });
      
      // Parse service date correctly
      const serviceDate = typeof serviceData.serviceDate === 'string'
        ? new Date(serviceData.serviceDate)
        : serviceData.serviceDate;
      
      // Format for database insertion
      const serviceDateForDB = serviceDate instanceof Date
        ? serviceDate.toISOString().split('T')[0]
        : serviceDate;
      
      // Insert the service record
      const [newService] = await db.insert(machineServices).values({
        ...serviceData,
        serviceDate: serviceDateForDB
      }).returning();
      
      // Update the machine's last service date and calculate next service date
      const category = await db.query.machineCategories.findFirst({
        where: eq(machineCategories.id, existingMachine.categoryId)
      });
      
      // Calculate next service date based on category interval
      let nextServiceDate = null;
      if (category?.serviceIntervalDays) {
        const nextDate = addDays(serviceDate, category.serviceIntervalDays);
        nextServiceDate = nextDate.toISOString().split('T')[0];
      }
      
      // Update the machine
      await db.update(machines)
        .set({
          lastServiceDate: serviceData.serviceDate,
          nextServiceDate: nextServiceDate,
          updatedAt: new Date()
        })
        .where(eq(machines.id, machineId));
      
      // Create notifications for all users assigned to this machine
      const assignedUsers = await db.query.machineAssignments.findMany({
        where: and(
          eq(machineAssignments.machineId, machineId),
          eq(machineAssignments.notificationEnabled, true)
        ),
        with: { user: true }
      });
      
      // Create notification for each assigned user
      for (const assignment of assignedUsers) {
        if (assignment.user) {
          await db.insert(notifications).values({
            userId: assignment.user.id,
            title: 'Machine Service Completed',
            message: `Service has been completed for ${existingMachine.name} (${existingMachine.serialNumber}). Next service is scheduled for ${nextServiceDate?.toLocaleDateString()}.`,
            type: 'service',
            relatedMachineId: machineId,
            link: `/machines/${machineId}`
          });
        }
      }
      
      return res.status(201).json(newService);
    } catch (err) {
      console.error('Error recording machine service:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: err.errors });
      }
      return res.status(500).json({ error: 'Failed to record machine service' });
    }
  });

  // Get service history for a machine
  app.get('/api/machines/:id/services', async (req: Request, res: Response) => {
    try {
      const machineId = parseInt(req.params.id);
      
      const services = await db.query.machineServices.findMany({
        where: eq(machineServices.machineId, machineId),
        orderBy: [desc(machineServices.serviceDate)]
      });
      
      return res.json(services);
    } catch (err) {
      console.error('Error fetching machine services:', err);
      return res.status(500).json({ error: 'Failed to fetch machine services' });
    }
  });

  // Assign users to machines
  app.post('/api/machines/:id/assignments', async (req: Request, res: Response) => {
    try {
      const machineId = parseInt(req.params.id);
      
      // Check if the machine exists
      const existingMachine = await db.query.machines.findFirst({
        where: eq(machines.id, machineId)
      });
      
      if (!existingMachine) {
        return res.status(404).json({ error: 'Machine not found' });
      }
      
      // Validate assignment data
      const assignmentData = insertMachineAssignmentSchema.parse({
        ...req.body,
        machineId
      });
      
      // Check if the user exists
      const user = await db.query.users.findFirst({
        where: eq(users.id, assignmentData.userId)
      });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Check if assignment already exists
      const existingAssignment = await db.query.machineAssignments.findFirst({
        where: and(
          eq(machineAssignments.machineId, machineId),
          eq(machineAssignments.userId, assignmentData.userId)
        )
      });
      
      if (existingAssignment) {
        return res.status(409).json({ error: 'User is already assigned to this machine' });
      }
      
      // Create the assignment
      const [newAssignment] = await db.insert(machineAssignments).values(assignmentData).returning();
      
      return res.status(201).json(newAssignment);
    } catch (err) {
      console.error('Error creating machine assignment:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: err.errors });
      }
      return res.status(500).json({ error: 'Failed to create machine assignment' });
    }
  });

  // Remove user assignment from a machine
  app.delete('/api/machines/:machineId/assignments/:userId', async (req: Request, res: Response) => {
    try {
      const machineId = parseInt(req.params.machineId);
      const userId = parseInt(req.params.userId);
      
      // Check if the assignment exists
      const existingAssignment = await db.query.machineAssignments.findFirst({
        where: and(
          eq(machineAssignments.machineId, machineId),
          eq(machineAssignments.userId, userId)
        )
      });
      
      if (!existingAssignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }
      
      // Delete the assignment
      await db.delete(machineAssignments).where(
        and(
          eq(machineAssignments.machineId, machineId),
          eq(machineAssignments.userId, userId)
        )
      );
      
      return res.status(204).send();
    } catch (err) {
      console.error('Error deleting machine assignment:', err);
      return res.status(500).json({ error: 'Failed to delete machine assignment' });
    }
  });

  // Get upcoming service reminders
  app.get('/api/machines/service-reminders', async (req: Request, res: Response) => {
    try {
      const daysThreshold = parseInt(req.query.days as string) || 30;
      const today = new Date();
      const futureDate = addDays(today, daysThreshold);
      
      // Get machines with service due within the threshold
      const upcomingServices = await db.select().from(machines)
        .where(
          and(
            // Next service date is not null
            sql`${machines.nextServiceDate} IS NOT NULL`,
            // Next service date is between today and future threshold
            sql`${machines.nextServiceDate} >= ${today.toISOString().split('T')[0]}`,
            sql`${machines.nextServiceDate} <= ${futureDate.toISOString().split('T')[0]}`
          )
        )
        .orderBy(asc(machines.nextServiceDate));
      
      // Add days until service for each machine
      const servicesWithDays = upcomingServices.map(machine => {
        const nextServiceDate = new Date(machine.nextServiceDate!);
        const daysUntilService = differenceInDays(nextServiceDate, today);
        
        return {
          ...machine,
          daysUntilService
        };
      });
      
      return res.json(servicesWithDays);
    } catch (err) {
      console.error('Error fetching service reminders:', err);
      return res.status(500).json({ error: 'Failed to fetch service reminders' });
    }
  });

  // Get overdue services
  app.get('/api/machines/overdue-services', async (_req: Request, res: Response) => {
    try {
      const today = new Date();
      
      // Get machines with overdue service
      const overdueServices = await db.select().from(machines)
        .where(
          and(
            // Next service date is not null
            sql`${machines.nextServiceDate} IS NOT NULL`,
            // Next service date is before today
            sql`${machines.nextServiceDate} <= ${today.toISOString().split('T')[0]}`
          )
        )
        .orderBy(asc(machines.nextServiceDate));
      
      // Add days overdue for each machine
      const servicesWithDays = overdueServices.map(machine => {
        const nextServiceDate = new Date(machine.nextServiceDate!);
        const daysOverdue = differenceInDays(today, nextServiceDate);
        
        return {
          ...machine,
          daysOverdue
        };
      });
      
      return res.json(servicesWithDays);
    } catch (err) {
      console.error('Error fetching overdue services:', err);
      return res.status(500).json({ error: 'Failed to fetch overdue services' });
    }
  });

  // Upload machine photo
  app.post('/api/machines/:id/photo', upload.single('photo'), async (req: Request, res: Response) => {
    try {
      const machineId = parseInt(req.params.id);
      
      if (!req.file) {
        return res.status(400).json({ error: 'No photo file provided' });
      }
      
      // Check if machine exists
      const existingMachine = await db.query.machines.findFirst({
        where: eq(machines.id, machineId)
      });
      
      if (!existingMachine) {
        return res.status(404).json({ error: 'Machine not found' });
      }
      
      // Generate URL for the uploaded image
      const imageUrl = `/images/machines/${req.file.filename}`;
      
      // Update machine with the new image URL
      const [updatedMachine] = await db.update(machines)
        .set({ imageUrl })
        .where(eq(machines.id, machineId))
        .returning();
      
      // Broadcast update
      broadcastUpdate('machine_updated', updatedMachine);
      
      return res.json({ 
        success: true, 
        imageUrl,
        machine: updatedMachine 
      });
    } catch (err) {
      console.error('Error uploading machine photo:', err);
      return res.status(500).json({ error: 'Failed to upload photo' });
    }
  });

  // Upload machine photo during creation
  app.post('/api/machines/upload-photo', upload.single('photo'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No photo file provided' });
      }
      
      // Generate URL for the uploaded image
      const imageUrl = `/images/machines/${req.file.filename}`;
      
      return res.json({ 
        success: true, 
        imageUrl
      });
    } catch (err) {
      console.error('Error uploading machine photo:', err);
      return res.status(500).json({ error: 'Failed to upload photo' });
    }
  });
};