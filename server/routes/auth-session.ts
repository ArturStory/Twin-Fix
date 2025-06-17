/**
 * Emergency authentication route handlers 
 * 
 * These routes provide a direct way to update and manage user sessions
 * when normal authentication mechanisms are not working.
 */
import { Express, Request, Response } from 'express';

export function registerAuthSessionRoutes(app: Express) {
  // Session recovery endpoint for deployment resilience
  app.post('/api/auth/session-recovery', async (req: Request, res: Response) => {
    try {
      const { userId, username } = req.body;
      
      if (!userId || !username) {
        return res.status(400).json({
          success: false,
          message: 'User ID and username are required'
        });
      }
      
      // Set session data
      req.session.userId = userId;
      req.session.username = username;
      
      // Set role and other user info as well for completeness
      // Try to get user info from database here
      try {
        // Import storage properly in TypeScript (not using require)
        const storage = (await import('../storage')).storage;
        const user = await storage.getUser(userId);
        if (user) {
          req.session.role = user.role;
        }
      } catch (error) {
        console.error("Error loading user role:", error);
        // Continue even if we can't load the role
      }
      
      // Set passport session only if available (but don't require it)
      try {
        if (!req.session.passport) {
          req.session.passport = { user: userId };
        } else {
          req.session.passport.user = userId;
        }
      } catch (error) {
        console.error("Passport session error:", error);
        // Continue without passport session
      }
      
      console.log(`Session recovered for user ${username} (${userId})`);
      
      return res.status(200).json({
        success: true,
        message: 'Session recovered successfully'
      });
    } catch (error) {
      console.error('Error recovering session:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });
  // Route to update session with custom user data
  app.post('/api/auth/update-session', (req: Request, res: Response) => {
    try {
      const userData = req.body;
      
      if (!userData || !userData.id || !userData.username || !userData.role) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user data provided'
        });
      }
      
      // Update the session with the provided user data
      req.session.userId = userData.id;
      req.session.username = userData.username;
      req.session.role = userData.role;
      
      console.log('Session updated manually for user:', userData.username);
      
      return res.status(200).json({
        success: true,
        message: 'Session updated successfully'
      });
    } catch (error) {
      console.error('Error updating session:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });
  
  // Route to manually clear session
  app.post('/api/auth/clear-session', (req: Request, res: Response) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to clear session'
          });
        }
        
        res.clearCookie('connect.sid');
        return res.status(200).json({
          success: true,
          message: 'Session cleared successfully'
        });
      });
    } catch (error) {
      console.error('Error clearing session:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });
}