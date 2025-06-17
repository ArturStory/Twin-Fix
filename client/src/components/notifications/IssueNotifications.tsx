import React, { useEffect } from 'react';
import { useAppWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Component that listens for issue-related events over WebSocket
 * and displays notifications to all users.
 * 
 * This ensures all users are notified when issues are reported, regardless of language.
 */
export function IssueNotifications() {
  const { addListener, removeListener } = useAppWebSocket();
  const { toast } = useToast();
  const { t } = useTranslation('issues');
  const queryClient = useQueryClient();

  useEffect(() => {
    // Play notification sound if available
    const playNotificationSound = () => {
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play();
      } catch (error) {
        console.error('Error playing notification sound:', error);
      }
    };

    // Handle issue notifications of various types
    const handleIssueNotification = (data: any) => {
      if (!data) return;
      
      // Different notification based on the notification type
      switch (data.type) {
        case 'issue_created':
          // Notify all users about new issue
          toast({
            title: t('newIssueReported'),
            description: t('newIssueDescription', { 
              title: data.title,
              location: data.location,
              reporter: data.reportedBy || 'Anonymous user'
            }),
            variant: 'default',
            duration: 5000,
          });
          playNotificationSound();
          
          // Update UI data
          queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
          queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
          break;
          
        case 'issue_updated':
          toast({
            title: t('issueUpdated'),
            description: t('issueUpdateDescription', { 
              title: data.title,
              status: data.status || 'unknown',
            }),
            variant: 'default',
            duration: 3000,
          });
          
          // Update UI data
          queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
          if (data.issueId) {
            queryClient.invalidateQueries({ queryKey: [`/api/issues/${data.issueId}`] });
          }
          break;
          
        case 'issue_deleted':
          toast({
            title: t('issueDeleted'),
            description: t('issueDeletedDescription', { 
              title: data.title || 'An issue',
            }),
            variant: 'default',
            duration: 3000,
          });
          
          // Update UI data
          queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
          break;
      }
    };
    
    // Handle complete issue data updates to refresh UI
    const handleIssueDataUpdate = (data: any) => {
      if (data && data.id) {
        // Update any related queries in the UI
        queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
        queryClient.invalidateQueries({ queryKey: [`/api/issues/${data.id}`] });
      }
    };

    // Register WebSocket listeners for our new notification types
    addListener('issue_notification', handleIssueNotification);
    addListener('issue_data_update', handleIssueDataUpdate);

    // Clean up listeners on unmount
    return () => {
      removeListener('issue_notification', handleIssueNotification);
      removeListener('issue_data_update', handleIssueDataUpdate);
    };
  }, [addListener, removeListener, toast, t, queryClient]);

  // This component doesn't render anything
  return null;
}

export default IssueNotifications;