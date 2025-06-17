import { toast } from "@/hooks/use-toast";

// Check if browser supports notifications
export const notificationsSupported = () => 
  'Notification' in window && 'serviceWorker' in navigator;

// Request permissions for notifications
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!notificationsSupported()) {
    console.warn('Notifications not supported in this browser');
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Show a notification
export const showNotification = (title: string, options: NotificationOptions = {}) => {
  if (!notificationsSupported()) {
    console.warn('Notifications not supported');
    
    // Fallback to toast
    toast({
      title,
      description: options.body,
      duration: 5000,
    });
    
    return;
  }
  
  // Check if we have permission
  if (Notification.permission !== 'granted') {
    // If not granted, request permission and try again
    requestNotificationPermission().then(granted => {
      if (granted) {
        new Notification(title, options);
      } else {
        // Fallback to toast
        toast({
          title,
          description: options.body,
          duration: 5000,
        });
      }
    });
    return;
  }
  
  // We have permission, show notification
  const notification = new Notification(title, options);
  
  // Add click event to focus the app
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  
  return notification;
};