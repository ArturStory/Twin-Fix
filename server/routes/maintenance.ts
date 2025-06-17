import { db } from '../db';
import { Request, Response } from 'express';
import { machineServices, machines, users } from '@shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

// Get all maintenance events
export async function getMaintenanceEvents(req: Request, res: Response) {
  try {
    const events = await db.query.machineServices.findMany({
      with: {
        machine: true,
        technician: true
      },
      orderBy: (services) => [services.serviceDate]
    });

    // Format the events data
    const formattedEvents = events.map(event => ({
      id: event.id,
      description: event.description,
      scheduledDate: event.serviceDate,
      estimatedDuration: 60, // Default duration in minutes
      machineId: event.machineId,
      machineName: event.machine?.name || 'Unknown Machine',
      technicianId: event.technicianId,
      technicianName: event.technicianName || event.technician?.username || 'Unassigned',
      status: event.isCompleted ? 'completed' : 'scheduled',
      notes: event.notes,
      cost: event.cost,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    }));

    return res.status(200).json(formattedEvents);
  } catch (error) {
    console.error('Error fetching maintenance events:', error);
    return res.status(500).json({ error: 'Failed to fetch maintenance events' });
  }
}

// Get upcoming maintenance events
export async function getUpcomingMaintenanceEvents(req: Request, res: Response) {
  try {
    const today = new Date();
    
    const events = await db.query.machineServices.findMany({
      where: and(
        gte(machineServices.serviceDate, today),
        eq(machineServices.isCompleted, false)
      ),
      with: {
        machine: true,
        technician: true
      },
      orderBy: (services) => [services.serviceDate]
    });

    // Format the events data
    const formattedEvents = events.map(event => ({
      id: event.id,
      description: event.description,
      scheduledDate: event.serviceDate,
      estimatedDuration: 60, // Default duration in minutes
      machineId: event.machineId,
      machineName: event.machine?.name || 'Unknown Machine',
      technicianId: event.technicianId,
      technicianName: event.technicianName || event.technician?.username || 'Unassigned',
      status: 'scheduled',
      notes: event.notes,
      cost: event.cost,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    }));

    return res.status(200).json(formattedEvents);
  } catch (error) {
    console.error('Error fetching upcoming maintenance events:', error);
    return res.status(500).json({ error: 'Failed to fetch upcoming maintenance events' });
  }
}

// Create a new maintenance event
export async function createMaintenanceEvent(req: Request, res: Response) {
  try {
    const { 
      machineId, 
      description, 
      scheduledDate, 
      estimatedDuration, 
      technicianIds, 
      notes 
    } = req.body;

    // Validate the request
    if (!machineId || !description || !scheduledDate || !technicianIds || technicianIds.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get the technician data
    const technician = await db.query.users.findFirst({
      where: eq(users.id, parseInt(technicianIds[0]))
    });

    if (!technician) {
      return res.status(400).json({ error: 'Invalid technician ID' });
    }

    // Check if machine exists
    const machine = await db.query.machines.findFirst({
      where: eq(machines.id, parseInt(machineId))
    });

    if (!machine) {
      return res.status(400).json({ error: 'Invalid machine ID' });
    }

    // Create the maintenance event
    const [newEvent] = await db.insert(machineServices).values({
      machineId: parseInt(machineId),
      serviceDate: new Date(scheduledDate),
      technicianId: technician.id,
      technicianName: technician.username,
      description: description,
      notes: notes || null,
      isCompleted: false,
    }).returning();

    // For additional technicians, we would typically use a many-to-many relationship
    // but for now, we're just using the primary technician

    // Get the created event with machine and technician details
    const createdEvent = await db.query.machineServices.findFirst({
      where: eq(machineServices.id, newEvent.id),
      with: {
        machine: true,
        technician: true
      }
    });

    // Format the response
    const formattedEvent = {
      id: createdEvent?.id,
      description: createdEvent?.description,
      scheduledDate: createdEvent?.serviceDate,
      estimatedDuration: estimatedDuration || 60,
      machineId: createdEvent?.machineId,
      machineName: createdEvent?.machine?.name || 'Unknown Machine',
      technicianId: createdEvent?.technicianId,
      technicianName: createdEvent?.technicianName || createdEvent?.technician?.username || 'Unassigned',
      status: 'scheduled',
      notes: createdEvent?.notes,
      cost: createdEvent?.cost,
      createdAt: createdEvent?.createdAt,
      updatedAt: createdEvent?.updatedAt
    };

    // Return the formatted event
    return res.status(201).json(formattedEvent);
  } catch (error) {
    console.error('Error creating maintenance event:', error);
    return res.status(500).json({ error: 'Failed to create maintenance event' });
  }
}

// Update a maintenance event
export async function updateMaintenanceEvent(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { 
      machineId, 
      description, 
      scheduledDate, 
      estimatedDuration, 
      technicianIds, 
      notes,
      isCompleted 
    } = req.body;

    // Validate the request
    if (!id) {
      return res.status(400).json({ error: 'Missing event ID' });
    }

    // Check if the event exists
    const existingEvent = await db.query.machineServices.findFirst({
      where: eq(machineServices.id, parseInt(id))
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Maintenance event not found' });
    }

    // Prepare update data
    const updateData: any = {};

    if (machineId) {
      // Check if machine exists
      const machine = await db.query.machines.findFirst({
        where: eq(machines.id, parseInt(machineId))
      });

      if (!machine) {
        return res.status(400).json({ error: 'Invalid machine ID' });
      }

      updateData.machineId = parseInt(machineId);
    }

    if (description) {
      updateData.description = description;
    }

    if (scheduledDate) {
      updateData.serviceDate = new Date(scheduledDate);
    }

    if (technicianIds && technicianIds.length > 0) {
      // Get the technician data
      const technician = await db.query.users.findFirst({
        where: eq(users.id, parseInt(technicianIds[0]))
      });

      if (!technician) {
        return res.status(400).json({ error: 'Invalid technician ID' });
      }

      updateData.technicianId = technician.id;
      updateData.technicianName = technician.username;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted;
    }

    // Update the event
    const [updatedEvent] = await db.update(machineServices)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(machineServices.id, parseInt(id)))
      .returning();

    // Get the updated event with machine and technician details
    const eventWithDetails = await db.query.machineServices.findFirst({
      where: eq(machineServices.id, updatedEvent.id),
      with: {
        machine: true,
        technician: true
      }
    });

    // Format the response
    const formattedEvent = {
      id: eventWithDetails?.id,
      description: eventWithDetails?.description,
      scheduledDate: eventWithDetails?.serviceDate,
      estimatedDuration: estimatedDuration || 60,
      machineId: eventWithDetails?.machineId,
      machineName: eventWithDetails?.machine?.name || 'Unknown Machine',
      technicianId: eventWithDetails?.technicianId,
      technicianName: eventWithDetails?.technicianName || eventWithDetails?.technician?.username || 'Unassigned',
      status: eventWithDetails?.isCompleted ? 'completed' : 'scheduled',
      notes: eventWithDetails?.notes,
      cost: eventWithDetails?.cost,
      createdAt: eventWithDetails?.createdAt,
      updatedAt: eventWithDetails?.updatedAt
    };

    // Return the formatted event
    return res.status(200).json(formattedEvent);
  } catch (error) {
    console.error('Error updating maintenance event:', error);
    return res.status(500).json({ error: 'Failed to update maintenance event' });
  }
}

// Delete a maintenance event
export async function deleteMaintenanceEvent(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Validate the request
    if (!id) {
      return res.status(400).json({ error: 'Missing event ID' });
    }

    // Check if the event exists
    const existingEvent = await db.query.machineServices.findFirst({
      where: eq(machineServices.id, parseInt(id))
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Maintenance event not found' });
    }

    // Delete the event
    await db.delete(machineServices).where(eq(machineServices.id, parseInt(id)));

    // Return success
    return res.status(200).json({ message: 'Maintenance event deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance event:', error);
    return res.status(500).json({ error: 'Failed to delete maintenance event' });
  }
}

// Mark a maintenance event as completed
export async function completeMaintenanceEvent(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { notes, cost } = req.body;

    // Validate the request
    if (!id) {
      return res.status(400).json({ error: 'Missing event ID' });
    }

    // Check if the event exists
    const existingEvent = await db.query.machineServices.findFirst({
      where: eq(machineServices.id, parseInt(id))
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Maintenance event not found' });
    }

    // Prepare update data
    const updateData: any = {
      isCompleted: true,
      updatedAt: new Date()
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (cost !== undefined) {
      updateData.cost = cost;
    }

    // Update the event
    const [updatedEvent] = await db.update(machineServices)
      .set(updateData)
      .where(eq(machineServices.id, parseInt(id)))
      .returning();

    // Get the updated event with machine and technician details
    const eventWithDetails = await db.query.machineServices.findFirst({
      where: eq(machineServices.id, updatedEvent.id),
      with: {
        machine: true,
        technician: true
      }
    });

    // Format the response
    const formattedEvent = {
      id: eventWithDetails?.id,
      description: eventWithDetails?.description,
      scheduledDate: eventWithDetails?.serviceDate,
      machineId: eventWithDetails?.machineId,
      machineName: eventWithDetails?.machine?.name || 'Unknown Machine',
      technicianId: eventWithDetails?.technicianId,
      technicianName: eventWithDetails?.technicianName || eventWithDetails?.technician?.username || 'Unassigned',
      status: 'completed',
      notes: eventWithDetails?.notes,
      cost: eventWithDetails?.cost,
      createdAt: eventWithDetails?.createdAt,
      updatedAt: eventWithDetails?.updatedAt
    };

    // Also update the machine's last service date
    if (eventWithDetails?.machineId) {
      await db.update(machines)
        .set({
          lastServiceDate: new Date(),
          nextServiceDate: sql`(${new Date()}) + (service_interval_days * interval '1 day')`,
          updatedAt: new Date()
        })
        .where(eq(machines.id, eventWithDetails.machineId));
    }

    // Return the formatted event
    return res.status(200).json(formattedEvent);
  } catch (error) {
    console.error('Error completing maintenance event:', error);
    return res.status(500).json({ error: 'Failed to complete maintenance event' });
  }
}

// Get machines due for service
export async function getMachinesDueForService(req: Request, res: Response) {
  try {
    const today = new Date();
    // Add 30 days to today for upcoming service
    const upcomingDate = new Date();
    upcomingDate.setDate(today.getDate() + 30);

    const dueForService = await db.query.machines.findMany({
      where: gte(machines.nextServiceDate, today),
      orderBy: (machine) => [machine.nextServiceDate]
    });

    // Format the response
    const formattedMachines = dueForService.map(machine => ({
      id: machine.id,
      name: machine.name,
      serialNumber: machine.serialNumber,
      manufacturer: machine.manufacturer,
      model: machine.model,
      location: machine.location,
      lastServiceDate: machine.lastServiceDate,
      nextServiceDate: machine.nextServiceDate,
      serviceIntervalDays: machine.serviceIntervalDays,
      status: machine.status,
      notes: machine.notes,
      daysUntilService: machine.nextServiceDate ? 
        Math.ceil((machine.nextServiceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 
        null
    }));

    return res.status(200).json(formattedMachines);
  } catch (error) {
    console.error('Error fetching machines due for service:', error);
    return res.status(500).json({ error: 'Failed to fetch machines due for service' });
  }
}