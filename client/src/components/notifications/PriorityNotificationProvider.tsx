import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';

import { 
  PrioritizedNotification, 
  NotificationPriority,
  PriorityNotificationSystem
} from './PriorityNotificationSystem';

import { NotificationType, NotificationSettings } from '@/types/notification';
import NotificationService from './NotificationService';
import { useLocalStorage } from '@/hooks/use-local-storage';

// Default settings for prioritized notifications
const DEFAULT_PRIORITY_SETTINGS = {
  minimumPriority: NotificationPriority.INFO,
  priorityFiltering: true
};

// Interface for the context
interface PriorityNotificationContextType {
  notifications: PrioritizedNotification[];
  settings: {
    prioritySettings: {
      minimumPriority: NotificationPriority;
      priorityFiltering: boolean;
    };
    notificationSound: boolean;
  };
  updateSettings: (settings: any) => void;
  addNotification: (
    title: string,
    message: string,
    type?: NotificationType,
    category?: string,
    source?: string,
    metadata?: Record<string, any>
  ) => string;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
  unreadCount: number;
  criticalCount: number;
}

// Create context
const PriorityNotificationContext = createContext<PriorityNotificationContextType | null>(null);

// Provider component
export function PriorityNotificationProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useLocalStorage<PrioritizedNotification[]>('priority-notifications', []);
  const [prioritySettings, setPrioritySettings] = useLocalStorage(
    'priority-notification-settings',
    DEFAULT_PRIORITY_SETTINGS
  );
  const [notificationSound, setNotificationSound] = useLocalStorage('notification-sound', true);

  // Fix date objects after loading from localStorage
  useEffect(() => {
    setNotifications(prev => prev.map(notification => ({
      ...notification,
      timestamp: new Date(notification.timestamp)
    })));
  }, []);

  // Calculate unread counts
  const unreadCount = notifications.filter(n => !n.read).length;
  const criticalCount = notifications.filter(
    n => !n.read && (n.priority === NotificationPriority.CRITICAL || n.priority === NotificationPriority.HIGH)
  ).length;

  // Add a new notification
  const addNotification = useCallback((
    title: string,
    message: string,
    type: NotificationType = 'info',
    category: string = 'general',
    source: string = 'system',
    metadata?: Record<string, any>
  ): string => {
    const id = uuidv4();
    
    const prioritizedNotification = PriorityNotificationSystem.createPrioritizedNotification(
      id,
      title,
      message,
      type,
      category,
      source,
      metadata
    );
    
    // Only add notification if it meets the minimum priority filter
    if (
      !prioritySettings.priorityFiltering || 
      shouldShowBasedOnPriority(prioritizedNotification.priority)
    ) {
      setNotifications(prev => [prioritizedNotification, ...prev]);
      
      // Also trigger the legacy notification service (for backwards compatibility)
      if (category === 'maintenance' || category === 'repair_scheduled') {
        const scheduledDate = metadata?.scheduledDate || new Date().toISOString().split('T')[0];
        const scheduledTime = metadata?.scheduledTime || '12:00';
        
        NotificationService.addRepairNotification(
          title,
          metadata?.location || 'Unknown location',
          scheduledDate,
          scheduledTime
        );
      }
    }
    
    return id;
  }, [prioritySettings]);

  // Helper to check if notification should be shown based on priority settings
  const shouldShowBasedOnPriority = useCallback((priority: NotificationPriority): boolean => {
    if (!prioritySettings.priorityFiltering) return true;
    
    const priorityOrder = {
      [NotificationPriority.CRITICAL]: 0,
      [NotificationPriority.HIGH]: 1,
      [NotificationPriority.MEDIUM]: 2,
      [NotificationPriority.LOW]: 3,
      [NotificationPriority.INFO]: 4
    };
    
    return priorityOrder[priority] <= priorityOrder[prioritySettings.minimumPriority];
  }, [prioritySettings]);

  // Mark a notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    // Also clear any stored notifications from localStorage
    localStorage.removeItem('priority-notifications');
  }, []);

  // Remove a specific notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Update priority settings
  const updateSettings = useCallback((newSettings: any) => {
    if (newSettings.prioritySettings) {
      setPrioritySettings(prev => ({
        ...prev,
        ...newSettings.prioritySettings
      }));
    }
    
    if (newSettings.hasOwnProperty('notificationSound')) {
      setNotificationSound(newSettings.notificationSound);
    }
  }, [setPrioritySettings, setNotificationSound]);

  // Connect to WebSocket or other notification sources
  useEffect(() => {
    // Add event listeners to NotificationService
    const handleIssueCreated = (data: any) => {
      addNotification(
        t('notifications.newIssue'),
        t('notifications.issueCreated', { title: data.title }),
        'info',
        'issue_created',
        'system',
        data
      );
    };
    
    const handleIssueUpdated = (data: any) => {
      addNotification(
        t('notifications.issueUpdated'),
        t('notifications.issueStatusChanged', { 
          title: data.title, 
          status: data.status 
        }),
        'info',
        'issue_updated',
        'system',
        data
      );
    };
    
    const handleCommentAdded = (data: any) => {
      addNotification(
        t('notifications.newComment'),
        t('notifications.commentAdded', { 
          username: data.username, 
          title: data.issueTitle 
        }),
        'info',
        'comment_added',
        'system',
        data
      );
    };
    
    const handleRepairScheduled = (data: any) => {
      addNotification(
        t('notifications.maintenanceScheduled'),
        t('notifications.repairScheduled', {
          title: data.title,
          date: data.scheduledDate,
          time: data.scheduledTime
        }),
        'info',
        'repair_scheduled',
        'system',
        data
      );
    };
    
    // Register event listeners
    NotificationService.addListener('issue_created', handleIssueCreated);
    NotificationService.addListener('issue_updated', handleIssueUpdated);
    NotificationService.addListener('comment_added', handleCommentAdded);
    NotificationService.addListener('repair_scheduled', handleRepairScheduled);
    
    // Cleanup on unmount
    return () => {
      NotificationService.removeListener('issue_created', handleIssueCreated);
      NotificationService.removeListener('issue_updated', handleIssueUpdated);
      NotificationService.removeListener('comment_added', handleCommentAdded);
      NotificationService.removeListener('repair_scheduled', handleRepairScheduled);
    };
  }, [t, addNotification]);

  // Create the context value
  const value: PriorityNotificationContextType = {
    notifications,
    settings: {
      prioritySettings,
      notificationSound
    },
    updateSettings,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    unreadCount,
    criticalCount
  };

  return (
    <PriorityNotificationContext.Provider value={value}>
      {children}
    </PriorityNotificationContext.Provider>
  );
}

// Hook to use the priority notification context
export function usePriorityNotifications() {
  const context = useContext(PriorityNotificationContext);
  
  if (context === null) {
    throw new Error('usePriorityNotifications must be used within a PriorityNotificationProvider');
  }
  
  return context;
}