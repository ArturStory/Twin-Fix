import React, { useEffect } from 'react';
import { useAppWebSocket } from '@/hooks/use-websocket';
import { useNotifications } from '@/hooks/use-notification-provider';
import { useTranslation } from 'react-i18next';

interface RepairSchedulePayload {
  issueId: number;
  issueTitle: string;
  scheduledBy: string;
  userId: number;
  scheduledDate: string;
  scheduleStatus: string;
  notes?: string;
  timestamp: string;
}

interface RepairRescheduledPayload {
  issueId: number;
  issueTitle: string;
  scheduledBy: string;
  userId: number;
  oldDate: string;
  newDate: string;
  oldStatus?: string;
  newStatus: string;
  notes?: string;
  timestamp: string;
}

interface RepairCompletedPayload {
  issueId: number;
  issueTitle: string;
  completedBy: string;
  userId: number;
  completionDate: string;
  finalCost?: number;
  notes?: string;
  timestamp: string;
}

/**
 * Component that listens for repair schedule-related events over WebSocket
 * and displays them as notifications to all users
 */
export function RepairScheduleNotifications() {
  const { addListener, removeListener } = useAppWebSocket();
  const { notify } = useNotifications();
  const { t } = useTranslation(['common', 'repair']);

  useEffect(() => {
    // Handle new repair schedule events
    const handleRepairScheduled = (payload: RepairSchedulePayload) => {
      // Format date in a consistent way across all platforms
      const date = new Date(payload.scheduledDate);
      const formattedDate = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
      
      notify(
        t('repair:scheduleCreatedTitle'),
        t('repair:scheduleCreatedMessage', { 
          user: payload.scheduledBy,
          title: payload.issueTitle,
          date: formattedDate,
          status: t(`repair:status.${payload.scheduleStatus}`)
        }),
        'info'
      );
    };

    // Handle rescheduled repair events
    const handleRepairRescheduled = (payload: RepairRescheduledPayload) => {
      // Format dates in a consistent way across all platforms
      const oldDate = new Date(payload.oldDate);
      const newDate = new Date(payload.newDate);
      
      const formatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      } as Intl.DateTimeFormatOptions;
      
      const formattedOldDate = new Intl.DateTimeFormat(undefined, formatOptions).format(oldDate);
      const formattedNewDate = new Intl.DateTimeFormat(undefined, formatOptions).format(newDate);
      
      notify(
        t('repair:scheduleChangedTitle'),
        t('repair:scheduleChangedMessage', {
          user: payload.scheduledBy,
          title: payload.issueTitle,
          oldDate: formattedOldDate,
          newDate: formattedNewDate,
          status: t(`repair:status.${payload.newStatus}`)
        }),
        'info'
      );
    };

    // Handle completed repair events
    const handleRepairCompleted = (payload: RepairCompletedPayload) => {
      // Format date in a consistent way across all platforms
      const date = new Date(payload.completionDate);
      const formattedDate = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
      
      // Format currency consistently (zloty/dollars/euros depending on locale)
      const formattedCost = payload.finalCost 
        ? new Intl.NumberFormat(undefined, { 
            style: 'currency', 
            currency: 'PLN', // Default to Polish Zloty for McDonald's in Poland
            minimumFractionDigits: 2
          }).format(payload.finalCost)
        : t('repair:noCostProvided');
      
      notify(
        t('repair:repairCompletedTitle'),
        t('repair:repairCompletedMessage', {
          user: payload.completedBy,
          title: payload.issueTitle,
          date: formattedDate,
          cost: formattedCost
        }),
        'success'
      );
    };

    // Register WebSocket listeners - always show these to all users
    addListener('repair_scheduled', handleRepairScheduled);
    addListener('repair_rescheduled', handleRepairRescheduled);
    addListener('repair_completed', handleRepairCompleted);
    
    // Store the issue_updated handler for cleanup
    const handleIssueUpdated = (data: any) => {
      if (data.status === 'scheduled' && data.notes && data.notes.includes('Scheduled for repair')) {
        // Extract information from the notes to display in the notification
        let scheduledBy = 'A team member';
        let notes = '';
        let scheduledDate = '';
        let scheduledTime = '';
        
        if (data.notes) {
          const notesMatch = data.notes.match(/Scheduled for repair on ([\d-\/]+) at ([\d:]+)\. (.*)/);
          if (notesMatch) {
            scheduledDate = notesMatch[1];
            scheduledTime = notesMatch[2];
            notes = notesMatch[3] || '';
            
            // Try to extract who scheduled it
            const schedulerMatch = notes.match(/(\w+) will fix/i);
            if (schedulerMatch) {
              scheduledBy = schedulerMatch[1];
            }
          }
        }
        
        // Format the date nicely
        let formattedDate = new Date().toLocaleString();
        try {
          if (scheduledDate && scheduledTime) {
            const dateObj = new Date(`${scheduledDate}T${scheduledTime}`);
            formattedDate = dateObj.toLocaleString();
          }
        } catch (e) {
          console.warn('Error parsing date:', e);
        }
        
        // Create a notification with the available information
        notify(
          t('repair:scheduleCreatedTitle'),
          t('repair:scheduleCreatedMessage', { 
            user: scheduledBy,
            title: data.title || 'an issue',
            date: formattedDate,
            status: 'scheduled'
          }),
          'info'
        );
      }
    };
    
    // Register this improved handler
    addListener('issue_updated', handleIssueUpdated);
    
    // Clean up listeners on unmount
    return () => {
      removeListener('repair_scheduled', handleRepairScheduled);
      removeListener('repair_rescheduled', handleRepairRescheduled);
      removeListener('repair_completed', handleRepairCompleted);
      removeListener('issue_updated', handleIssueUpdated);
    };
  }, [addListener, removeListener, notify, t]);

  // This component doesn't render anything
  return null;
}