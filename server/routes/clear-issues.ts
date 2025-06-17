import { Request, Response } from 'express';
import { eventEmitter, MessageType } from '../ws-server';
import { Pool } from '@neondatabase/serverless';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Create a dedicated route handler for clearing all issues
export async function clearAllIssues(req: Request, res: Response) {
  try {
    console.log('Clearing all issues from the database');
    
    // Configure neon for WebSocket support
    neonConfig.webSocketConstructor = ws;
    
    // Create a fresh connection pool for this operation
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL
    });
    
    // Use a transaction to ensure data integrity
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete each table in the correct order to respect foreign key constraints
      console.log('Attempting to delete all issues and related data in the correct order');
      
      // First delete from dependent tables (images, comments, status changes)
      try {
        await client.query('DELETE FROM images');
        console.log('Successfully deleted all images');
      } catch (error) {
        console.error('Error deleting images:', error);
        // Continue even if this fails
      }
      
      try {
        await client.query('DELETE FROM comments');
        console.log('Successfully deleted all comments');
      } catch (error) {
        console.error('Error deleting comments:', error);
        // Continue even if this fails
      }
      
      try {
        await client.query('DELETE FROM status_changes');
        console.log('Successfully deleted all status changes');
      } catch (error) {
        console.error('Error deleting status changes:', error);
        try {
          await client.query('DELETE FROM status_change');
          console.log('Successfully deleted all status changes (alternative table name)');
        } catch (e) {
          console.error('Error deleting status_change:', e);
          // Continue even if this fails
        }
      }
      
      // Then delete the issues themselves
      try {
        await client.query('DELETE FROM issues');
        console.log('Successfully deleted all issues');
      } catch (error) {
        console.error('Error deleting issues:', error);
        throw error;
      }
      
      await client.query('COMMIT');
      
      // Broadcast using the event emitter to notify all clients
      eventEmitter.emit(MessageType.DATA_REFRESH, {
        message: "All issues have been cleared",
        timestamp: new Date().toISOString(),
      });
      
      console.log('WebSocket notification sent about cleared issues');
      
      return res.status(200).json({ 
        success: true, 
        message: "All issues have been cleared successfully" 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('Error clearing issues:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to clear issues",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}