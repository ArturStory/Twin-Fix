import React, { useEffect, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { Bell, Info, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import NotificationService from './NotificationService';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'repair';
  timestamp: Date;
  read: boolean;
}

export const NotificationCenter: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Setup event listener for storage changes
  useEffect(() => {
    const handleNotificationsUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };
    
    window.addEventListener('notifications-updated', handleNotificationsUpdate);
    
    return () => {
      window.removeEventListener('notifications-updated', handleNotificationsUpdate);
    };
  }, [queryClient]);
  
  // Load notifications with React Query
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => NotificationService.getNotifications(),
    staleTime: 0  // Always refetch to get latest
  });
  
  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Handler for clicking a notification
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      NotificationService.markAsRead(notification.id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  };
  
  // Handler for mark all as read
  const handleMarkAllAsRead = () => {
    NotificationService.markAllAsRead();
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    toast({
      title: "All notifications marked as read",
      duration: 2000,
    });
  };
  
  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'repair':
        return <Calendar className="h-4 w-4 text-indigo-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };
  
  // Format timestamp
  const formatTime = (date: Date) => {
    const now = new Date();
    const timestamp = new Date(date);
    
    // Check if it's the same day
    if (now.toDateString() === timestamp.toDateString()) {
      return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Check if it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.toDateString() === timestamp.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise show the date
    return timestamp.toLocaleDateString();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">{t('notifications.title')}</h3>
          {notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs"
              onClick={handleMarkAllAsRead}
            >
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-4 transition-colors hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50/50' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <span className="text-xs text-gray-500">
                          {formatTime(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{notification.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{t('notifications.noNotifications')}</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};