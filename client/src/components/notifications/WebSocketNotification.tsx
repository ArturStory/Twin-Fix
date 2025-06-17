import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAppWebSocket } from '@/hooks/use-websocket';
import { MessageType } from '../../types/websocket';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notification-provider';
import { usePriorityNotifications } from './PriorityNotificationProvider';
import { NotificationPriority } from './PriorityNotificationSystem';
import { useTranslation } from 'react-i18next';

/**
 * Component that listens for WebSocket events and displays toast notifications
 * This component doesn't render anything visible, it just runs effects
 */
export function WebSocketNotification() {
  const { toast } = useToast();
  const { isConnected, subscribe } = useAppWebSocket();
  const { user } = useAuth();
  const { notify } = useNotifications();
  const { addNotification } = usePriorityNotifications();
  const { t } = useTranslation();
  
  // Subscribe to WebSocket events when connected
  useEffect(() => {
    // Always set up the effect, but only subscribe if connected and user exists
    if (!isConnected || !user) {
      return; // This is safe because no cleanup is needed when not connected
    }
    
    console.log('Setting up WebSocket notification listeners');
    
    // Handler for new issues
    const issueCreatedUnsubscribe = subscribe(MessageType.ISSUE_CREATED, (data) => {
      console.log('Received issue_created event:', data);
      
      // Don't notify the user of their own actions
      if (data.userId === user.id) return;
      
      const title = data.title || t('notifications.newIssue');
      const location = data.location || t('notifications.unknownLocation');
      const reportedBy = data.reportedBy || t('notifications.someone');
      
      // Add to priority notification system only
      addNotification(
        t('notifications.newIssueReported'),
        t('notifications.issueReportedMessage', { 
          reportedBy, 
          title, 
          location 
        }),
        NotificationPriority.MEDIUM
      );
    });
    
    // Handler for issue updates
    const issueUpdatedUnsubscribe = subscribe(MessageType.ISSUE_UPDATED, (data) => {
      console.log('Received issue_updated event:', data);
      
      // Don't notify the user of their own actions
      if (data.reporterId === user.id) return;

      // Add to priority notification system only
      addNotification(
        t('notifications.issueUpdated'),
        t('notifications.issueUpdatedMessage', { 
          id: data.id, 
          title: data.title 
        }),
        'medium',
        'issue_updated',
        'system',
        data
      );
    });
    
    // Handler for status changes
    const statusChangedUnsubscribe = subscribe(MessageType.STATUS_CHANGED, (data) => {
      console.log('Received status_changed event:', data);
      
      // Don't notify the user of their own actions
      if (data.changedById === user.id) return;
      
      // Add to priority notification system only
      addNotification(
        t('notifications.statusUpdated'),
        t('notifications.statusUpdatedMessage', { 
          issueId: data.issueId, 
          oldStatus: data.oldStatus, 
          newStatus: data.newStatus 
        }),
        NotificationPriority.MEDIUM
      );
    });
    
    // Handler for comments
    const commentAddedUnsubscribe = subscribe(MessageType.COMMENT_ADDED, (data) => {
      console.log('Received comment_added event:', data);
      console.log('Issue title from data:', data.issueTitle);
      console.log('Current user ID:', user.id, 'Comment user ID:', data.userId);
      
      // Don't notify the user of their own actions (temporarily disabled for testing)
      // if (data.userId === user.id) return;
      
      const commentBy = data.username || 'Someone';
      console.log('Issue title from data:', data.issueTitle);
      console.log('Issue ID from data:', data.issueId);
      console.log('Comment content from data:', data.content);
      
      // Clean up the issue title and create proper display text
      let issueTitle;
      if (data.issueTitle && data.issueTitle.trim()) {
        issueTitle = `"${data.issueTitle.trim()}"`;
      } else {
        issueTitle = `issue #${data.issueId}`;
      }
      
      // Get comment preview (first 50 characters)
      const commentPreview = data.content && data.content.length > 50 
        ? `${data.content.substring(0, 50)}...` 
        : data.content || '';
      
      console.log('Comment preview:', commentPreview);
      
      const fullMessage = `${commentBy} commented on ${issueTitle}: "${commentPreview}"`;
      
      console.log('Final notification message will be:', fullMessage);
      
      // Add to priority notification system only (with enhanced format)
      addNotification(
        'New Comment',
        fullMessage,
        NotificationPriority.MEDIUM
      );
    });
    
    // Handler for repairs scheduled
    const repairScheduledUnsubscribe = subscribe(MessageType.REPAIR_SCHEDULED, (data) => {
      console.log('Received repair_scheduled event:', data);
      
      // Use the notify method
      notify('Repair Scheduled', `Repair for issue #${data.issueId} scheduled for ${new Date(data.scheduledDate).toLocaleDateString()}`, 'info');
    });
    
    // Handler for locations added
    const locationAddedUnsubscribe = subscribe(MessageType.LOCATION_ADDED, (data) => {
      console.log('Received location_added event:', data);
      
      // Only notify admin and managers
      if (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'owner') return;
      
      // Use the notify method
      notify('New Location Added', `${data.name} has been added to the location inventory`, 'info');
    });
    
    // Handler for machines added
    const machineAddedUnsubscribe = subscribe(MessageType.MACHINE_ADDED, (data) => {
      console.log('Received machine_added event:', data);
      
      // Only notify admin and managers
      if (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'owner') return;
      
      // Use the notify method
      notify('New Machine Added', `${data.name} has been added to the machine inventory at ${data.location}`, 'info');
    });
    
    // Return a cleanup function to unsubscribe from all events
    return () => {
      issueCreatedUnsubscribe();
      issueUpdatedUnsubscribe();
      statusChangedUnsubscribe();
      commentAddedUnsubscribe();
      repairScheduledUnsubscribe();
      locationAddedUnsubscribe();
      machineAddedUnsubscribe();
    };
  }, [isConnected, user, notify, subscribe]);
  
  // This component doesn't render anything
  return null;
}

export default WebSocketNotification;