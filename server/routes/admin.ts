import { Router } from 'express';
import { storage } from '../storage';
import { broadcastToAll } from '../ws-server';

const adminRouter = Router();

// Clear all issues and related data
adminRouter.post('/clear-all-issues', async (req, res) => {
  try {
    // First delete all related data
    await storage.deleteAllStatusChanges();
    await storage.deleteAllComments();
    await storage.deleteAllImages();
    
    // Then delete the issues
    await storage.deleteAllIssues();
    
    // Notify all connected clients to refresh their data
    broadcastToAll({
      type: 'data_refresh',
      payload: {
        message: 'All issues have been cleared',
        clearCache: true
      },
      timestamp: new Date().toISOString()
    });
    
    return res.status(200).json({ 
      success: true, 
      message: 'All issues and related data cleared successfully' 
    });
  } catch (error) {
    console.error('Error clearing issues:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to clear issues', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Clear cache on all clients
adminRouter.post('/clear-cache', (req, res) => {
  broadcastToAll({
    type: 'data_refresh',
    payload: {
      message: 'Cache cleared by admin',
      clearCache: true
    },
    timestamp: new Date().toISOString()
  });
  
  return res.status(200).json({ 
    success: true, 
    message: 'Cache clear request sent to all clients' 
  });
});

export default adminRouter;