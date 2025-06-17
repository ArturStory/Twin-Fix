import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { UserRole, sharedLocations, insertSharedLocationSchema } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/shared-locations - Get all shared locations (accessible to all authenticated users)
router.get('/shared-locations', async (req: Request, res: Response) => {
  try {
    const locations = await db.select().from(sharedLocations);
    res.json(locations);
  } catch (error) {
    console.error('Error fetching shared locations:', error);
    res.status(500).json({ message: 'Failed to fetch locations' });
  }
});

// POST /api/shared-locations - Add a new shared location (admin/owner only)
router.post('/shared-locations', async (req: Request, res: Response) => {
  try {
    // Debug authentication
    console.log('🔍 Location add request - Session data:', {
      sessionExists: !!req.session,
      userId: req.session?.userId,
      username: req.session?.username,
      role: req.session?.role,
      sessionId: req.sessionID,
      cookies: req.headers.cookie
    });
    
    // Check authentication - look for userId in session
    const userId = req.session?.userId;
    
    console.log('🔍 Full session data:', JSON.stringify(req.session, null, 2));
    console.log('🔍 All headers:', JSON.stringify(req.headers, null, 2));
    
    if (!userId) {
      console.log('❌ Authentication failed - no userId found in session');
      
      // Try to recover session if we have localStorage data
      const authHeader = req.headers['x-user-auth'];
      if (authHeader) {
        try {
          const authData = JSON.parse(authHeader as string);
          console.log('🔄 Attempting session recovery with:', authData);
          
          req.session.userId = authData.id;
          req.session.username = authData.username;
          req.session.role = authData.role;
          
          console.log('✅ Session recovered for user:', authData.username);
        } catch (e) {
          console.log('❌ Failed to recover session:', e);
          return res.status(401).json({ message: 'Authentication required' });
        }
      } else {
        return res.status(401).json({ message: 'Authentication required' });
      }
    }
    
    console.log('✅ User authenticated with ID:', userId || req.session?.userId);

    const finalUserId = userId || req.session?.userId!;
    const user = await storage.getUser(finalUserId);
    const isAdminOrOwner = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER;
    
    if (!isAdminOrOwner) {
      return res.status(403).json({ message: 'Only admin and owner users can add locations' });
    }

    // Validate input using the schema
    const locationData = insertSharedLocationSchema.parse({
      name: req.body.name,
      type: req.body.type || 'restaurant',
      address: req.body.address,
      createdBy: user?.username || 'unknown'
    });

    // Insert into database
    const [newLocation] = await db.insert(sharedLocations)
      .values({
        ...locationData,
        createdById: userId
      })
      .returning();

    console.log(`New shared location added by ${user?.username}:`, newLocation);

    res.status(201).json(newLocation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid location data', errors: error.errors });
    }
    console.error('Error adding shared location:', error);
    res.status(500).json({ message: 'Failed to add location' });
  }
});

// DELETE /api/shared-locations/:id - Delete a shared location (admin/owner only)
router.delete('/shared-locations/:id', async (req: Request, res: Response) => {
  try {
    const locationId = req.params.id;
    
    console.log('🗑️ Delete location request received for ID:', locationId);
    console.log('🔍 Session check:', {
      hasSession: !!req.session,
      userId: req.session?.userId,
      sessionId: req.sessionID,
      cookies: req.headers.cookie
    });
    
    // Check authentication - look for userId in session
    const userId = req.session?.userId;
    
    console.log('🔍 Full session data:', JSON.stringify(req.session, null, 2));
    console.log('🔍 All headers:', JSON.stringify(req.headers, null, 2));
    
    if (!userId) {
      console.log('❌ Authentication failed - no userId found in session');
      
      // Try to recover session if we have localStorage data
      const authHeader = req.headers['x-user-auth'];
      if (authHeader) {
        try {
          const authData = JSON.parse(authHeader as string);
          console.log('🔄 Attempting session recovery with:', authData);
          
          req.session.userId = authData.id;
          req.session.username = authData.username;
          req.session.role = authData.role;
          
          console.log('✅ Session recovered for user:', authData.username);
        } catch (e) {
          console.log('❌ Failed to recover session:', e);
          return res.status(401).json({ message: 'Authentication required' });
        }
      } else {
        return res.status(401).json({ message: 'Authentication required' });
      }
    }
    
    console.log('✅ User authenticated with ID:', userId || req.session?.userId);

    const finalUserId = userId || req.session?.userId!;
    const user = await storage.getUser(finalUserId);
    const isAdminOrOwner = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER;
    
    if (!isAdminOrOwner) {
      return res.status(403).json({ message: 'Only admin and owner users can delete locations' });
    }

    // Check if location exists and delete from database
    const [deletedLocation] = await db.delete(sharedLocations)
      .where(eq(sharedLocations.id, parseInt(locationId)))
      .returning();
    
    if (!deletedLocation) {
      return res.status(404).json({ message: 'Location not found' });
    }

    console.log(`Shared location deleted by ${user?.username}:`, deletedLocation);

    res.json({ message: 'Location deleted successfully', location: deletedLocation });
  } catch (error) {
    console.error('Error deleting shared location:', error);
    res.status(500).json({ message: 'Failed to delete location' });
  }
});

export default router;