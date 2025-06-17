import { Request, Response } from 'express';
import { db } from '../db';
import { 
  notifications,
  users,
  machines,
  machineAssignments
} from '@shared/schema';
import { eq, and, or, desc, sql, lt, gt, inArray } from 'drizzle-orm';
import { addDays, differenceInDays } from 'date-fns';

export const registerNotificationRoutes = (app: any) => {
  // Get notifications for a user
  app.get('/api/notifications', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
      
      if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      // Check if user exists
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get notifications for this user
      const userNotifications = await db.select().from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));
      
      return res.json(userNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  // Mark notification as read
  app.patch('/api/notifications/:id/read', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if notification exists
      const notification = await db.query.notifications.findFirst({
        where: eq(notifications.id, id)
      });
      
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      // Update the notification
      const [updated] = await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id))
        .returning();
      
      return res.json(updated);
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  // Mark all notifications as read for a user
  app.patch('/api/notifications/read-all', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
      
      if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      // Update all unread notifications for this user
      await db.update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );
      
      return res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  });

  // Delete a notification
  app.delete('/api/notifications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if notification exists
      const notification = await db.query.notifications.findFirst({
        where: eq(notifications.id, id)
      });
      
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      // Delete the notification
      await db.delete(notifications).where(eq(notifications.id, id));
      
      return res.status(204).send();
    } catch (err) {
      console.error('Error deleting notification:', err);
      return res.status(500).json({ error: 'Failed to delete notification' });
    }
  });

  // Check for machines needing service and create notifications
  app.post('/api/notifications/check-service-reminders', async (_req: Request, res: Response) => {
    try {
      const today = new Date();
      const threeDaysFromNow = addDays(today, 3);
      const sevenDaysFromNow = addDays(today, 7);
      const fourteenDaysFromNow = addDays(today, 14);
      const thirtyDaysFromNow = addDays(today, 30);
      
      // Find machines with service coming up in the next 30 days
      const upcomingServices = await db.select().from(machines)
        .where(
          and(
            sql`${machines.nextServiceDate} IS NOT NULL`,
            sql`${machines.nextServiceDate} > ${today.toISOString().split('T')[0]}`,
            sql`${machines.nextServiceDate} < ${thirtyDaysFromNow.toISOString().split('T')[0]}`
          )
        );
      
      let notificationsCreated = 0;
      
      // Process each machine with upcoming service
      for (const machine of upcomingServices) {
        if (!machine.nextServiceDate) continue;
        
        const nextServiceDate = new Date(machine.nextServiceDate);
        const daysUntilService = differenceInDays(nextServiceDate, today);
        
        // Determine notification type based on days until service
        let notificationType = '';
        let shouldSendNotification = false;
        
        if (daysUntilService <= 3) {
          notificationType = 'service-urgent';
          shouldSendNotification = true;
        } else if (daysUntilService <= 7) {
          notificationType = 'service-soon';
          shouldSendNotification = true;
        } else if (daysUntilService <= 14) {
          notificationType = 'service-upcoming';
          shouldSendNotification = true;
        } else if (daysUntilService <= 30) {
          notificationType = 'service-scheduled';
          shouldSendNotification = true;
        }
        
        if (shouldSendNotification) {
          // Find users assigned to this machine with notifications enabled
          // Use a more specific SQL query to avoid column issues
          const assignments = await db.select({
            id: machineAssignments.id,
            machineId: machineAssignments.machineId,
            userId: machineAssignments.userId,
            assignedAt: machineAssignments.assignedAt,
            notificationEnabled: machineAssignments.notificationEnabled,
            user: {
              id: users.id,
              username: users.username
            }
          })
          .from(machineAssignments)
          .leftJoin(users, eq(machineAssignments.userId, users.id))
          .where(and(
            eq(machineAssignments.machineId, machine.id),
            eq(machineAssignments.notificationEnabled, true)
          ));
          
          // Format a human-readable service date
          const formattedDate = nextServiceDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          
          // Send notification to each assigned user
          for (const assignment of assignments) {
            if (!assignment.user) continue;
            
            // Check if a similar notification already exists for this user and machine
            const existingNotification = await db.query.notifications.findFirst({
              where: and(
                eq(notifications.userId, assignment.user.id),
                eq(notifications.relatedMachineId, machine.id),
                eq(notifications.type, notificationType),
                eq(notifications.isRead, false)
              )
            });
            
            // Only create notification if one doesn't already exist
            if (!existingNotification) {
              let title = '';
              let message = '';
              
              // Create appropriate message based on urgency
              if (notificationType === 'service-urgent') {
                title = `URGENT: Service Required in ${daysUntilService} Days`;
                message = `Machine ${machine.name} (SN: ${machine.serialNumber}) requires service in ${daysUntilService} days on ${formattedDate}. Please schedule service immediately.`;
              } else if (notificationType === 'service-soon') {
                title = `Service Required Soon: ${daysUntilService} Days Remaining`;
                message = `Machine ${machine.name} (SN: ${machine.serialNumber}) is due for service in ${daysUntilService} days on ${formattedDate}. Please plan accordingly.`;
              } else if (notificationType === 'service-upcoming') {
                title = `Upcoming Service: ${daysUntilService} Days Remaining`;
                message = `Machine ${machine.name} (SN: ${machine.serialNumber}) has scheduled service in ${daysUntilService} days on ${formattedDate}.`;
              } else {
                title = `Service Scheduled: ${daysUntilService} Days Remaining`;
                message = `Machine ${machine.name} (SN: ${machine.serialNumber}) has scheduled service in ${daysUntilService} days on ${formattedDate}.`;
              }
              
              // Create the notification
              await db.insert(notifications).values({
                userId: assignment.user.id,
                title,
                message,
                type: notificationType,
                relatedMachineId: machine.id,
                link: `/machines/${machine.id}`
              });
              
              notificationsCreated++;
            }
          }
        }
      }
      
      // Check for overdue services as well
      const overdueServices = await db.select().from(machines)
        .where(
          and(
            sql`${machines.nextServiceDate} IS NOT NULL`,
            sql`${machines.nextServiceDate} < ${today.toISOString().split('T')[0]}`
          )
        );
      
      // Process each overdue machine
      for (const machine of overdueServices) {
        if (!machine.nextServiceDate) continue;
        
        const nextServiceDate = new Date(machine.nextServiceDate);
        const daysOverdue = differenceInDays(today, nextServiceDate);
        
        // Find users assigned to this machine with notifications enabled
        // Use a more specific SQL query to avoid column issues
        const assignments = await db.select({
          id: machineAssignments.id,
          machineId: machineAssignments.machineId,
          userId: machineAssignments.userId,
          assignedAt: machineAssignments.assignedAt,
          notificationEnabled: machineAssignments.notificationEnabled,
          user: {
            id: users.id,
            username: users.username
          }
        })
        .from(machineAssignments)
        .leftJoin(users, eq(machineAssignments.userId, users.id))
        .where(and(
          eq(machineAssignments.machineId, machine.id),
          eq(machineAssignments.notificationEnabled, true)
        ));
        
        // Format a human-readable service date
        const formattedDate = nextServiceDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        // Send notification to each assigned user
        for (const assignment of assignments) {
          if (!assignment.user) continue;
          
          // Check if a similar notification already exists for this user and machine
          const existingNotification = await db.query.notifications.findFirst({
            where: and(
              eq(notifications.userId, assignment.user.id),
              eq(notifications.relatedMachineId, machine.id),
              eq(notifications.type, 'service-overdue'),
              eq(notifications.isRead, false)
            )
          });
          
          // Only create notification if one doesn't already exist
          if (!existingNotification) {
            const title = `CRITICAL: Service Overdue by ${daysOverdue} Days`;
            const message = `Machine ${machine.name} (SN: ${machine.serialNumber}) service is OVERDUE by ${daysOverdue} days! Original service date was ${formattedDate}. Immediate action required!`;
            
            // Create the notification
            await db.insert(notifications).values({
              userId: assignment.user.id,
              title,
              message,
              type: 'service-overdue',
              relatedMachineId: machine.id,
              link: `/machines/${machine.id}`
            });
            
            notificationsCreated++;
          }
        }
      }
      
      return res.json({
        success: true,
        notificationsCreated,
        message: `Created ${notificationsCreated} new service reminder notifications`
      });
    } catch (err) {
      console.error('Error creating service reminder notifications:', err);
      return res.status(500).json({ error: 'Failed to create service reminder notifications' });
    }
  });

  // Endpoint for service scheduled notifications
  app.post('/api/notifications/service-scheduled', async (req: Request, res: Response) => {
    try {
      const { machineName, serviceDate, technician, description, location } = req.body;
      
      if (!machineName || !serviceDate) {
        return res.status(400).json({ error: 'Machine name and service date are required' });
      }
      
      // Get all users to notify them about the scheduled service
      const allUsers = await db.select().from(users);
      
      const title = `🔧 Service Scheduled: ${machineName}`;
      const message = `Maintenance scheduled for ${machineName} on ${new Date(serviceDate).toLocaleDateString()}. Technician: ${technician}. Location: ${location || 'Not specified'}. Description: ${description}`;
      
      // Create notifications for all users
      for (const user of allUsers) {
        await db.insert(notifications).values({
          userId: user.id,
          title,
          message,
          type: 'service-scheduled',
          link: '/inventory'
        });
      }
      
      // Import WebSocket functionality to send real-time notifications
      const { broadcastToAllUsers } = require('../ws-server');
      
      // Send real-time notification to all connected users
      broadcastToAllUsers({
        type: 'service_scheduled',
        payload: {
          machineName,
          serviceDate,
          technician,
          description,
          location,
          title,
          message
        }
      });
      
      return res.json({
        success: true,
        message: 'Service scheduled notifications sent to all users',
        notifiedUsers: allUsers.length
      });
    } catch (err) {
      console.error('Error sending service scheduled notifications:', err);
      return res.status(500).json({ error: 'Failed to send service scheduled notifications' });
    }
  });

  // POST /api/notifications/service-completed - Send notifications when service is completed
  app.post('/api/notifications/service-completed', async (req: Request, res: Response) => {
    try {
      const { machineName, serviceDate, technician, description, location, cost } = req.body;
      
      // Get all users to notify
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        role: users.role
      }).from(users);
      
      const title = `Service Completed: ${machineName}`;
      const message = `Maintenance service for ${machineName} at ${location} has been completed by ${technician}${cost ? ` (Cost: $${cost})` : ''}. ${description ? `Details: ${description}` : ''}`;
      
      // Create notifications for all users
      for (const user of allUsers) {
        await db.insert(notifications).values({
          userId: user.id,
          title,
          message,
          type: 'service-completed',
          link: '/inventory'
        });
      }
      
      // Import WebSocket functionality to send real-time notifications
      const { broadcastToAllUsers } = require('../ws-server');
      
      // Send real-time notification to all connected users
      broadcastToAllUsers({
        type: 'service_completed',
        payload: {
          machineName,
          serviceDate,
          technician,
          description,
          location,
          cost,
          title,
          message
        }
      });
      
      return res.json({
        success: true,
        message: 'Service completion notifications sent to all users',
        notifiedUsers: allUsers.length
      });
    } catch (err) {
      console.error('Error sending service completion notifications:', err);
      return res.status(500).json({ error: 'Failed to send notifications' });
    }
  });
};