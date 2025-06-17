import { NotificationType } from '@/types/notification';

/**
 * Priority levels for the smart notification system
 */
export enum NotificationPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

/**
 * Interface for a prioritized notification
 */
export interface PrioritizedNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  timestamp: Date;
  read: boolean;
  category: string;
  source: string;
  metadata?: Record<string, any>;
}

/**
 * Rules for determining notification priority based on content and metadata
 */
export const priorityRules = {
  // Equipment-related priority rules
  equipment: {
    criticalSystems: ['refrigeration', 'freezer', 'fire safety', 'security'],
    highPriorityAreas: ['kitchen', 'drive-thru', 'order system'],
    serviceDue: {
      overdue: NotificationPriority.HIGH,
      today: NotificationPriority.HIGH,
      thisWeek: NotificationPriority.MEDIUM,
      nextWeek: NotificationPriority.LOW,
      future: NotificationPriority.INFO
    }
  },
  
  // Maintenance priority rules
  maintenance: {
    breakdownType: {
      complete: NotificationPriority.CRITICAL,
      partial: NotificationPriority.HIGH,
      intermittent: NotificationPriority.MEDIUM,
      cosmetic: NotificationPriority.LOW
    },
    scheduleConflict: NotificationPriority.HIGH,
    scheduledMaintenance: NotificationPriority.MEDIUM
  },
  
  // Issue-related priority rules
  issues: {
    statusChange: {
      created: NotificationPriority.HIGH,
      inProgress: NotificationPriority.MEDIUM,
      resolved: NotificationPriority.LOW
    },
    mentions: NotificationPriority.HIGH,
    assignedToMe: NotificationPriority.HIGH
  },
  
  // User activity priority rules
  userActivity: {
    roleChange: NotificationPriority.MEDIUM,
    login: NotificationPriority.LOW,
    logout: NotificationPriority.LOW,
    register: NotificationPriority.MEDIUM
  }
};

/**
 * Smart Notification Priority System
 * Determines the appropriate priority for notifications based on content and context
 */
export class PriorityNotificationSystem {
  /**
   * Determine priority for a maintenance notification
   */
  public static determineMaintenancePriority(
    data: {
      type: string;
      equipmentType?: string;
      area?: string;
      severity?: string;
      dueDate?: Date;
    }
  ): NotificationPriority {
    // Check if equipment is a critical system
    if (data.equipmentType && priorityRules.equipment.criticalSystems.includes(data.equipmentType.toLowerCase())) {
      return NotificationPriority.CRITICAL;
    }
    
    // Check if equipment is in a high priority area
    if (data.area && priorityRules.equipment.highPriorityAreas.includes(data.area.toLowerCase())) {
      return NotificationPriority.HIGH;
    }
    
    // Handle breakdown types
    if (data.severity) {
      const severityLower = data.severity.toLowerCase();
      if (severityLower === 'complete') return NotificationPriority.CRITICAL;
      if (severityLower === 'partial') return NotificationPriority.HIGH;
      if (severityLower === 'intermittent') return NotificationPriority.MEDIUM;
      if (severityLower === 'cosmetic') return NotificationPriority.LOW;
    }
    
    // Calculate priority based on due date
    if (data.dueDate) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dueDate = new Date(data.dueDate);
      const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue < 0) return NotificationPriority.HIGH; // Overdue
      if (daysUntilDue === 0) return NotificationPriority.HIGH; // Due today
      if (daysUntilDue <= 7) return NotificationPriority.MEDIUM; // Due this week
      if (daysUntilDue <= 14) return NotificationPriority.LOW; // Due next week
      return NotificationPriority.INFO; // Due in the future
    }
    
    // Default for maintenance notifications
    return NotificationPriority.MEDIUM;
  }
  
  /**
   * Determine priority for an issue notification
   */
  public static determineIssuePriority(
    data: {
      status?: string;
      priority?: string;
      assignedToCurrentUser?: boolean;
      mentionsCurrentUser?: boolean;
    }
  ): NotificationPriority {
    // If assigned to current user or mentions them, it's high priority
    if (data.assignedToCurrentUser || data.mentionsCurrentUser) {
      return NotificationPriority.HIGH;
    }
    
    // Handle based on issue priority if available
    if (data.priority) {
      const priorityLower = data.priority.toLowerCase();
      if (priorityLower === 'urgent' || priorityLower === 'high') return NotificationPriority.HIGH;
      if (priorityLower === 'medium') return NotificationPriority.MEDIUM;
      if (priorityLower === 'low') return NotificationPriority.LOW;
    }
    
    // Handle based on issue status
    if (data.status) {
      const statusLower = data.status.toLowerCase();
      if (statusLower === 'created' || statusLower === 'new') return NotificationPriority.HIGH;
      if (statusLower === 'in_progress' || statusLower === 'in progress') return NotificationPriority.MEDIUM;
      if (statusLower === 'resolved' || statusLower === 'completed') return NotificationPriority.LOW;
    }
    
    // Default for issue notifications
    return NotificationPriority.MEDIUM;
  }
  
  /**
   * Determine priority for a user activity notification
   */
  public static determineUserActivityPriority(
    data: {
      action: string;
    }
  ): NotificationPriority {
    const actionLower = data.action.toLowerCase();
    
    // Role changes are medium priority
    if (actionLower.includes('role') || actionLower.includes('permission')) {
      return NotificationPriority.MEDIUM;
    }
    
    // Registrations are medium priority
    if (actionLower.includes('register')) {
      return NotificationPriority.MEDIUM;
    }
    
    // Logins and logouts are low priority
    if (actionLower.includes('login') || actionLower.includes('logout')) {
      return NotificationPriority.LOW;
    }
    
    // Default for user activity
    return NotificationPriority.INFO;
  }
  
  /**
   * Main function to determine notification priority based on type and data
   */
  public static determinePriority(
    notificationType: string,
    data: Record<string, any>
  ): NotificationPriority {
    // Handle different notification types
    if (notificationType.includes('maintenance') || 
        notificationType.includes('repair') || 
        notificationType.includes('equipment') ||
        notificationType === 'repair_scheduled') {
      return this.determineMaintenancePriority(data);
    }
    
    if (notificationType.includes('issue') || 
        notificationType === 'issue_created' || 
        notificationType === 'issue_updated' ||
        notificationType === 'status_changed' ||
        notificationType === 'comment_added') {
      return this.determineIssuePriority(data);
    }
    
    if (notificationType.includes('user') || 
        notificationType === 'user_login' || 
        notificationType === 'user_logout' ||
        notificationType === 'user_register' ||
        notificationType === 'role_changed') {
      return this.determineUserActivityPriority(data);
    }
    
    // Default priority
    return NotificationPriority.MEDIUM;
  }
  
  /**
   * Create a prioritized notification from notification data
   */
  public static createPrioritizedNotification(
    id: string,
    title: string,
    message: string,
    type: NotificationType,
    category: string,
    source: string,
    metadata?: Record<string, any>
  ): PrioritizedNotification {
    // Determine the priority based on the notification data
    const priority = this.determinePriority(category, metadata || {});
    
    // Create and return the prioritized notification
    return {
      id,
      title,
      message,
      type,
      priority,
      timestamp: new Date(),
      read: false,
      category,
      source,
      metadata
    };
  }
}