import React, { useState } from 'react';
import { Bell, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePriorityNotifications } from './PriorityNotificationProvider';
import PriorityNotificationList from './PriorityNotificationList';
import { NotificationPriority } from './PriorityNotificationSystem';

export default function SmartNotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  
  const {
    notifications,
    unreadCount,
    criticalCount,
    markAsRead,
    markAllAsRead,
    clearAll
  } = usePriorityNotifications();

  // Determine the appearance based on notification priority
  const getBellAppearance = () => {
    if (criticalCount > 0) {
      return {
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
        badgeVariant: 'destructive' as const
      };
    }
    
    return {
      icon: <Bell className="h-5 w-5" />,
      badgeVariant: unreadCount > 0 ? 'default' as const : 'outline' as const
    };
  };

  const { icon, badgeVariant } = getBellAppearance();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div 
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 text-gray-600 transition-colors relative cursor-pointer"
          aria-label={t('notifications.toggleNotifications')}
        >
          {icon}
          {unreadCount > 0 && (
            <Badge 
              variant={badgeVariant} 
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px]"
            >
              {unreadCount}
            </Badge>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 md:w-96 p-0" 
        align="end"
        sideOffset={5}
      >
        <PriorityNotificationList
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClearAll={clearAll}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}