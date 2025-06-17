import { Router, Request } from 'express';
import { storage } from '../storage';
import { broadcastUpdate } from '../ws-broadcast';
import { RepairScheduleStatus } from '@shared/schema';

const router = Router();

/**
 * Handle creating or updating a repair schedule
 */
router.post('/api/issues/:id/repair-schedule', async (req: Request & { user?: any }, res) => {
  try {
    const issueId = parseInt(req.params.id);
    const userId = req.user?.id;
    const username = req.user?.username || 'Unknown user';
    
    if (!userId) {
      return res.status(401).json({ error: 'You must be logged in to schedule repairs' });
    }
    
    const issue = await storage.getIssue(issueId);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    
    const { scheduledDate, scheduleStatus, additionalNotes, finalCost } = req.body;
    
    // Check if this is a new schedule or an update
    const isUpdate = Boolean(issue.scheduledDate);
    const oldScheduledDate = issue.scheduledDate;
    const oldStatus = issue.scheduleStatus;
    
    // Update issue with repair schedule information
    const updatedIssue = await storage.updateIssue(issueId, {
      scheduledDate: new Date(scheduledDate),
      scheduleStatus,
      ...(scheduleStatus === RepairScheduleStatus.COMPLETED ? { finalCost } : {})
    });
    
    // Create repair schedule history entry
    await storage.createRepairScheduleHistory({
      issueId,
      oldScheduleDate: oldScheduledDate ? new Date(oldScheduledDate) : null,
      newScheduleDate: new Date(scheduledDate),
      oldStatus,
      newStatus: scheduleStatus,
      notes: additionalNotes,
      createdBy: userId
    });
    
    // Broadcast different events based on whether this is new, an update, or completion
    if (scheduleStatus === RepairScheduleStatus.COMPLETED) {
      // Broadcast repair completion
      broadcastUpdate('repair_completed', {
        issueId,
        issueTitle: issue.title,
        completedBy: username,
        userId,
        completionDate: scheduledDate,
        finalCost,
        notes: additionalNotes,
        timestamp: new Date().toISOString()
      });
    } else if (isUpdate && (oldScheduledDate !== scheduledDate || oldStatus !== scheduleStatus)) {
      // Broadcast schedule update
      broadcastUpdate('repair_rescheduled', {
        issueId,
        issueTitle: issue.title,
        scheduledBy: username,
        userId,
        oldDate: oldScheduledDate,
        newDate: scheduledDate,
        oldStatus,
        newStatus: scheduleStatus,
        notes: additionalNotes,
        timestamp: new Date().toISOString()
      });
    } else {
      // Broadcast new schedule
      broadcastUpdate('repair_scheduled', {
        issueId,
        issueTitle: issue.title,
        scheduledBy: username,
        userId,
        scheduledDate,
        scheduleStatus,
        notes: additionalNotes,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(updatedIssue);
  } catch (error) {
    console.error('Error updating repair schedule:', error);
    res.status(500).json({ error: 'Failed to update repair schedule' });
  }
});

/**
 * Get repair schedule history for an issue
 */
router.get('/api/issues/:id/repair-schedule-history', async (req, res) => {
  try {
    const issueId = parseInt(req.params.id);
    
    const history = await storage.getRepairScheduleHistory(issueId);
    res.json(history);
  } catch (error) {
    console.error('Error getting repair schedule history:', error);
    res.status(500).json({ error: 'Failed to get repair schedule history' });
  }
});

export const repairSchedulesRouter = router;