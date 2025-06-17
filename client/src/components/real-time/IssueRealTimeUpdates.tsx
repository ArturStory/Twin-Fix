import React, { useEffect } from 'react';
import { useAppWebSocket } from '@/hooks/use-websocket';
import { useNotifications } from '@/hooks/use-notification-provider';
import { useTranslation } from 'react-i18next';

interface IssueCreatedPayload {
  issueId: number;
  title: string;
  createdBy: string;
  userId: number;
  location: string;
  timestamp: string;
}

interface IssueUpdatedPayload {
  issueId: number;
  title: string;
  updatedBy: string;
  userId: number;
  updatedFields: string[];
  timestamp: string;
}

interface IssueStatusChangedPayload {
  issueId: number;
  title: string;
  changedBy: string;
  userId: number;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
}

/**
 * Component that listens for issue-related events over WebSocket
 * and displays them as notifications
 */
export function IssueRealTimeUpdates() {
  const { addListener, removeListener } = useAppWebSocket();
  const { notify, settings } = useNotifications();
  const { t } = useTranslation(['common', 'issues']);

  useEffect(() => {
    // Only proceed if issue updates notifications are enabled
    if (!settings.showIssueUpdates) {
      return;
    }

    // Handle issue created events
    const handleIssueCreated = (payload: IssueCreatedPayload) => {
      notify(
        t('issues:issueCreatedTitle'),
        t('issues:issueCreatedMessage', { 
          user: payload.createdBy,
          title: payload.title,
          location: payload.location
        }),
        'info'
      );
    };

    // Handle issue updated events
    const handleIssueUpdated = (payload: IssueUpdatedPayload) => {
      notify(
        t('issues:issueUpdatedTitle'),
        t('issues:issueUpdatedMessage', {
          user: payload.updatedBy,
          title: payload.title,
          fields: payload.updatedFields.join(', ')
        }),
        'info'
      );
    };

    // Handle issue status changed events
    const handleIssueStatusChanged = (payload: IssueStatusChangedPayload) => {
      notify(
        t('issues:statusChangedTitle'),
        t('issues:statusChangedMessage', {
          user: payload.changedBy,
          title: payload.title,
          oldStatus: t(`issues:status.${payload.oldStatus}`),
          newStatus: t(`issues:status.${payload.newStatus}`)
        }),
        'info'
      );
    };

    // Register WebSocket listeners
    addListener('issue_created', handleIssueCreated);
    addListener('issue_updated', handleIssueUpdated);
    addListener('issue_status_changed', handleIssueStatusChanged);

    // Clean up listeners on unmount
    return () => {
      removeListener('issue_created', handleIssueCreated);
      removeListener('issue_updated', handleIssueUpdated);
      removeListener('issue_status_changed', handleIssueStatusChanged);
    };
  }, [addListener, removeListener, notify, settings, t]);

  // This component doesn't render anything
  return null;
}