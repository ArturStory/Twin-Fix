/**
 * Types for the notification system
 */

// Notification types based on styling/semantics
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// Settings for notifications
export interface NotificationSettings {
  showUserLogins: boolean;
  showUserLogouts: boolean;
  showUserRegistrations: boolean;
  showIssueUpdates: boolean;
  showInventoryUpdates: boolean;
  showAllNotifications: boolean;
  notificationSound: boolean;
  notificationDuration: number;
  priorityFiltering?: boolean; // Whether to use priority filtering
  minimumPriority?: string; // Minimum priority to show
}