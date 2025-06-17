import { Express, Request, Response } from 'express';
import { db } from '../db';
import { and, eq, gte, sql } from 'drizzle-orm';

export function registerMaintenanceRoutes(app: Express) {
  // Technician endpoint is now handled in main routes.ts to avoid conflicts

  // Get machines for assignment - direct endpoint to ensure it works even when DB is down
  app.get('/api/machines', (req: Request, res: Response) => {
    // Return a set of sample data for development purposes
    const machines = [
      { id: 1, name: 'Ice Cream Machine', serialNumber: 'ICM-2023-001', manufacturer: 'CoolFreeze', model: 'ICM-5000', installationDate: '2023-01-15', location: 'Kitchen' },
      { id: 2, name: 'Grill Station', serialNumber: 'GS-2022-105', manufacturer: 'GrillMaster', model: 'Pro XL', installationDate: '2022-08-10', location: 'Kitchen' },
      { id: 3, name: 'Deep Fryer', serialNumber: 'DF-2021-089', manufacturer: 'FryTech', model: 'FT-3000', installationDate: '2021-11-20', location: 'Kitchen' },
      { id: 4, name: 'Coffee Machine', serialNumber: 'CM-2023-042', manufacturer: 'BrewPro', model: 'Elite', installationDate: '2023-03-05', location: 'Front Counter' },
      { id: 5, name: 'Shake Machine', serialNumber: 'SM-2024-019', manufacturer: 'CoolFreeze', model: 'MX2000', installationDate: '2024-01-10', location: 'Kitchen' },
      { id: 6, name: 'Soft Serve Machine', serialNumber: 'SSM-2023-033', manufacturer: 'FrostKing', model: 'FrostMaster 300', installationDate: '2023-06-22', location: 'Kitchen' },
      { id: 7, name: 'Fryer Station', serialNumber: 'FS-2022-077', manufacturer: 'FryTech', model: 'Pro Series', installationDate: '2022-11-15', location: 'Kitchen' },
      { id: 8, name: 'Refrigerator', serialNumber: 'RF-2022-155', manufacturer: 'ColdStar', model: 'Commercial X5', installationDate: '2022-09-30', location: 'Storage' }
    ];
    
    res.json(machines);
  });

  // Get all maintenance events
  app.get('/api/maintenance/events', async (req: Request, res: Response) => {
    try {
      // Note: In a production environment, we'd fetch from the database
      // For now, return an empty array since we don't have any events yet
      const events = [];
      
      res.json(events);
    } catch (error) {
      console.error('Error fetching maintenance events:', error);
      res.status(500).json({ error: 'Failed to fetch maintenance events' });
    }
  });
  
  // Get upcoming maintenance events
  app.get('/api/maintenance/events/upcoming', (req: Request, res: Response) => {
    // Return sample upcoming events for development purposes
    const upcomingEvents = [
      {
        id: 101,
        description: 'Monthly Deep Clean',
        scheduledDate: '2025-05-25',
        estimatedDuration: 120,
        machineId: 1,
        machineName: 'Ice Cream Machine',
        machineSerialNumber: 'ICM-2023-001',
        machineLocation: 'Kitchen',
        technicianId: 1,
        technicianName: 'John Smith',
        status: 'scheduled',
        createdAt: '2025-05-18T10:30:00.000Z',
        updatedAt: '2025-05-18T10:30:00.000Z'
      },
      {
        id: 102,
        description: 'Preventive Maintenance',
        scheduledDate: '2025-05-30',
        estimatedDuration: 90,
        machineId: 3,
        machineName: 'Deep Fryer',
        machineSerialNumber: 'DF-2021-089',
        machineLocation: 'Kitchen',
        technicianId: 2,
        technicianName: 'Maria Garcia',
        status: 'scheduled',
        createdAt: '2025-05-19T08:15:00.000Z',
        updatedAt: '2025-05-19T08:15:00.000Z'
      },
      {
        id: 103,
        description: 'Quarterly Servicing',
        scheduledDate: '2025-06-05',
        estimatedDuration: 180,
        machineId: 2,
        machineName: 'Grill Station',
        machineSerialNumber: 'GS-2022-105',
        machineLocation: 'Kitchen',
        technicianId: 3,
        technicianName: 'Robert Chen',
        status: 'scheduled',
        createdAt: '2025-05-20T09:45:00.000Z',
        updatedAt: '2025-05-20T09:45:00.000Z'
      }
    ];
    
    res.json(upcomingEvents);
  });
  
  // Create a new maintenance event
  app.post('/api/maintenance/events', async (req: Request, res: Response) => {
    try {
      const { machineId, description, scheduledDate, estimatedDuration, technicianIds, notes } = req.body;
      
      // Get machine data
      const machines = [
        { id: 1, name: 'Ice Cream Machine' },
        { id: 2, name: 'Grill Station' },
        { id: 3, name: 'Deep Fryer' },
        { id: 4, name: 'Coffee Machine' }
      ];
      const machine = machines.find(m => m.id.toString() === machineId.toString());
      
      // Get technician data
      const technicians = [
        { id: 1, username: 'tech1', name: 'John Smith' },
        { id: 2, username: 'tech2', name: 'Maria Garcia' },
        { id: 3, username: 'tech3', name: 'Robert Chen' }
      ];
      const technician = technicians.find(t => t.id.toString() === technicianIds[0].toString());
      
      // Create the event
      const newEvent = {
        id: Date.now(),
        description,
        scheduledDate,
        estimatedDuration: estimatedDuration || 60,
        machineId: parseInt(machineId),
        machineName: machine ? machine.name : 'Unknown Machine',
        technicianId: technician ? technician.id : null,
        technicianName: technician ? technician.name : 'Unassigned',
        technicianIds,
        status: 'scheduled',
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // In production, we would save to the database here
      
      // Broadcast the new event via WebSocket
      // This will be handled by the WebSocket server in a real implementation
      
      res.status(201).json(newEvent);
    } catch (error) {
      console.error('Error creating maintenance event:', error);
      res.status(500).json({ error: 'Failed to create maintenance event' });
    }
  });
  
  // Get machines due for service - direct endpoint to ensure it works even when DB is down
  app.get('/api/maintenance/machines/service-due', (req: Request, res: Response) => {
    // Return static sample machines due for service for development purposes
    const machinesDueForService = [
      {
        id: 1,
        name: 'Ice Cream Machine',
        serialNumber: 'ICM-2023-001',
        manufacturer: 'CoolFreeze',
        model: 'ICM-5000',
        location: 'Kitchen',
        lastServiceDate: '2023-10-15',
        nextServiceDate: '2025-05-24',
        serviceIntervalDays: 90,
        status: 'operational',
        notes: 'Needs regular cleaning',
        daysUntilService: 5
      },
      {
        id: 3,
        name: 'Deep Fryer',
        serialNumber: 'DF-2021-089',
        manufacturer: 'FryTech',
        model: 'FT-3000',
        location: 'Kitchen',
        lastServiceDate: '2023-05-20',
        nextServiceDate: '2025-05-22',
        serviceIntervalDays: 90,
        status: 'operational',
        notes: 'Oil change needed',
        daysUntilService: 3
      },
      {
        id: 5,
        name: 'Shake Machine',
        serialNumber: 'SM-2024-019',
        manufacturer: 'CoolFreeze',
        model: 'MX2000',
        location: 'Kitchen',
        lastServiceDate: '2025-02-08',
        nextServiceDate: '2025-05-28',
        serviceIntervalDays: 90,
        status: 'operational',
        notes: 'Regular maintenance required',
        daysUntilService: 9
      },
      {
        id: 6,
        name: 'Soft Serve Machine',
        serialNumber: 'SSM-2023-033',
        manufacturer: 'FrostKing',
        model: 'FrostMaster 300',
        location: 'Kitchen',
        lastServiceDate: '2025-03-15',
        nextServiceDate: '2025-05-20',
        serviceIntervalDays: 60,
        status: 'operational',
        notes: 'Cleaning required',
        daysUntilService: 1
      }
    ];
    
    res.json(machinesDueForService);
  });
  
  // Update a maintenance event
  app.patch('/api/maintenance/events/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // In production, we would update the event in the database
      // For now, just return the updated object
      
      res.json({ 
        id: parseInt(id), 
        ...req.body, 
        updated: true, 
        updatedAt: new Date().toISOString() 
      });
    } catch (error) {
      console.error('Error updating maintenance event:', error);
      res.status(500).json({ error: 'Failed to update maintenance event' });
    }
  });
  
  // Delete a maintenance event
  app.delete('/api/maintenance/events/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // In production, we would delete the event from the database
      
      res.status(200).json({ message: 'Maintenance event deleted successfully' });
    } catch (error) {
      console.error('Error deleting maintenance event:', error);
      res.status(500).json({ error: 'Failed to delete maintenance event' });
    }
  });
  
  // Mark a maintenance event as completed
  app.post('/api/maintenance/events/:id/complete', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { completionNotes } = req.body;
      
      // In production, we would update the event in the database
      // For now, just return the completed object
      
      res.json({ 
        id: parseInt(id), 
        status: 'completed', 
        completedAt: new Date().toISOString(),
        completionNotes
      });
    } catch (error) {
      console.error('Error completing maintenance event:', error);
      res.status(500).json({ error: 'Failed to complete maintenance event' });
    }
  });
}