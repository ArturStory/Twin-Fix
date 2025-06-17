// A simplified notification service without WebSocket

/**
 * This service provides notification functionality for the application.
 * WebSocket functionality has been temporarily disabled to prevent connection errors.
 */
export class NotificationService {
  private static instance: NotificationService;
  private localListeners: Map<string, Array<(data: any) => void>> = new Map();

  /**
   * Get the singleton instance of NotificationService
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
  
  /**
   * Add a listener for a specific notification type
   * @param type The type of notification to listen for
   * @param callback Function to call when notification is received
   */
  public addListener(type: string, callback: (data: any) => void): void {
    if (!this.localListeners.has(type)) {
      this.localListeners.set(type, []);
    }
    this.localListeners.get(type)!.push(callback);
  }
  
  /**
   * Remove a listener for a specific notification type
   * @param type The type of notification to remove listener from
   * @param callback The callback function to remove
   */
  public removeListener(type: string, callback: (data: any) => void): void {
    if (this.localListeners.has(type)) {
      const listeners = this.localListeners.get(type)!;
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  /**
   * Manually trigger a local notification
   * @param type Type of notification
   * @param data Data to send with notification
   */
  public triggerNotification(type: string, data: any): void {
    console.log(`[Local Notification] ${type}:`, data);
    if (this.localListeners.has(type)) {
      const listeners = this.localListeners.get(type)!;
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in notification listener for type ${type}:`, error);
        }
      });
    }
  }

  /**
   * Add a repair notification (for backward compatibility)
   * This method now triggers a 'repair_scheduled' notification.
   * @param title The title of the issue
   * @param location The location of the issue
   * @param scheduledDate The date when repair is scheduled
   * @param scheduledTime The time when repair is scheduled
   */
  public addRepairNotification(title: string, location: string, scheduledDate: string, scheduledTime: string): void {
    // Trigger a repair_scheduled notification
    this.triggerNotification('repair_scheduled', {
      title,
      location,
      scheduledDate,
      scheduledTime,
      timestamp: new Date().toISOString()
    });
    console.log(`Repair scheduled for "${title}" at ${location} on ${scheduledDate} at ${scheduledTime}`);
  }

  /**
   * Get all notifications (stub implementation)
   * In a real implementation, this would fetch notifications from storage
   */
  public getNotifications(): any[] {
    return [];
  }

  /**
   * Mark notification as read (stub implementation)
   * @param id The notification ID
   */
  public markAsRead(id: string | number): void {
    console.log(`Marking notification ${id} as read`);
  }

  /**
   * Mark all notifications as read (stub implementation)
   */
  public markAllAsRead(): void {
    console.log('Marking all notifications as read');
  }
}

// Add repair notification as a static method for backward compatibility
NotificationService.addRepairNotification = function(title: string, location: string, scheduledDate: string, scheduledTime: string): void {
  // Get the instance and call the instance method
  const instance = NotificationService.getInstance();
  instance.triggerNotification('repair_scheduled', {
    title,
    location,
    scheduledDate,
    scheduledTime,
    timestamp: new Date().toISOString()
  });
  console.log(`[Static] Repair scheduled for "${title}" at ${location} on ${scheduledDate} at ${scheduledTime}`);
};

export default NotificationService.getInstance();