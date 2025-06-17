import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

// Define notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'user-activity';

// Define notification settings
export interface NotificationSettings {
  showUserLogins: boolean;
  showUserLogouts: boolean;
  showUserRegistrations: boolean;
  showIssueUpdates: boolean;
  showInventoryUpdates: boolean;
  showAllNotifications: boolean; // Override other settings to show everything
  notificationSound: boolean;
  notificationDuration: number; // in milliseconds
}

interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  notify: (title: string, message: string, type?: NotificationType) => void;
  notifyUserActivity: (username: string, action: string, details?: string) => void;
}

// Default notification settings
const DEFAULT_SETTINGS: NotificationSettings = {
  showUserLogins: true,
  showUserLogouts: true,
  showUserRegistrations: true,
  showIssueUpdates: true,
  showInventoryUpdates: true,
  showAllNotifications: true, // Initially show all notifications
  notificationSound: true,
  notificationDuration: 6000, // 6 seconds
};

// Create context
const NotificationContext = createContext<NotificationContextType | null>(null);

// Create notification sound
const createNotificationSound = () => {
  const audio = new Audio();
  audio.src = '/notification-sound.mp3';
  audio.volume = 0.5;
  return audio;
};

interface NotificationProviderProps {
  children: ReactNode;
}

// Provider component
export function NotificationProvider({ children }: NotificationProviderProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    // Try to load saved settings from localStorage
    const savedSettings = localStorage.getItem('notification-settings');
    return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
  });

  // Notification sound
  const notificationSound = React.useMemo(createNotificationSound, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings };
      // Save to localStorage
      localStorage.setItem('notification-settings', JSON.stringify(updatedSettings));
      return updatedSettings;
    });
  }, []);

  // General notification function
  const notify = useCallback((title: string, message: string, type: NotificationType = 'info') => {
    // Play sound if enabled
    if (settings.notificationSound) {
      try {
        // Only try to play sound if the browser is likely to allow it
        if (document.hasFocus() && document.visibilityState === 'visible') {
          // Create a new audio instance each time to avoid issues with replaying the same audio element
          const audio = new Audio('/notification-sound.mp3');
          audio.volume = 0.5;
          
          // Add event listeners for error handling
          audio.addEventListener('error', () => {
            console.log('Audio playback not supported or allowed by browser');
          });
          
          // Use the play method with proper error handling
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              // Silently fail - this is expected in many browsers
              // due to autoplay restrictions or missing audio file
            });
          }
        }
      } catch (err) {
        // Silently handle any errors with audio playback
      }
    }

    // Use different styles based on notification type
    // Note: Our toast component may only support 'default' and 'destructive'
    const variant = type === 'user-activity' 
      ? 'default' 
      : type === 'error' 
        ? 'destructive' 
        : type === 'success' 
          ? 'default' 
          : type === 'warning' 
            ? 'default' 
            : 'default';

    // Show toast notification
    toast({
      title,
      description: message,
      variant,
      duration: settings.notificationDuration,
    });
  }, [toast, settings, notificationSound]);

  // Special function for user activity notifications
  const notifyUserActivity = useCallback((username: string, action: string, details?: string) => {
    // Skip if user activity notifications are disabled
    if (!settings.showUserLogins && action === 'login') return;
    if (!settings.showUserLogouts && action === 'logout') return;
    if (!settings.showUserRegistrations && action === 'register') return;

    // Get translated action
    const actionKey = `userActivity.${action}`;
    const translatedAction = t(actionKey);
    
    // Create notification
    const title = t('userActivity.title');
    const message = details 
      ? `${username} ${translatedAction} - ${details}`
      : `${username} ${translatedAction}`;
    
    notify(title, message, 'user-activity');
  }, [notify, settings, t]);

  const value = {
    settings,
    updateSettings,
    notify,
    notifyUserActivity,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook to use the notification context
export function useNotifications() {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  
  return context;
}