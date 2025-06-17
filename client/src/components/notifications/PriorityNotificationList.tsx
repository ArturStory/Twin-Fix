import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  Clock,
  X,
  Filter
} from 'lucide-react';

import {
  PrioritizedNotification,
  NotificationPriority
} from './PriorityNotificationSystem';

import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

// Priority icon mapping
const PriorityIcon = {
  [NotificationPriority.CRITICAL]: (
    <AlertCircle className="h-5 w-5 text-red-500" />
  ),
  [NotificationPriority.HIGH]: (
    <AlertTriangle className="h-5 w-5 text-amber-500" />
  ),
  [NotificationPriority.MEDIUM]: (
    <Info className="h-5 w-5 text-blue-500" />
  ),
  [NotificationPriority.LOW]: (
    <CheckCircle className="h-5 w-5 text-green-500" />
  ),
  [NotificationPriority.INFO]: (
    <Bell className="h-5 w-5 text-gray-500" />
  )
};

// Priority color mapping
const PriorityColor = {
  [NotificationPriority.CRITICAL]: 'bg-red-100 border-red-300',
  [NotificationPriority.HIGH]: 'bg-amber-100 border-amber-300',
  [NotificationPriority.MEDIUM]: 'bg-blue-100 border-blue-300',
  [NotificationPriority.LOW]: 'bg-green-100 border-green-300',
  [NotificationPriority.INFO]: 'bg-gray-100 border-gray-300'
};

interface PriorityNotificationListProps {
  notifications: PrioritizedNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onClose?: () => void;
}

export default function PriorityNotificationList({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onClose
}: PriorityNotificationListProps) {
  const { t, i18n } = useTranslation();
  const [activeFilters, setActiveFilters] = useState<Record<NotificationPriority, boolean>>({
    [NotificationPriority.CRITICAL]: true,
    [NotificationPriority.HIGH]: true,
    [NotificationPriority.MEDIUM]: true,
    [NotificationPriority.LOW]: true,
    [NotificationPriority.INFO]: true
  });

  // Filter notifications based on active priority filters
  const filteredNotifications = notifications.filter(
    notification => activeFilters[notification.priority]
  );

  // Sort notifications by priority and timestamp
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    // First sort by priority
    const priorityOrder = {
      [NotificationPriority.CRITICAL]: 0,
      [NotificationPriority.HIGH]: 1,
      [NotificationPriority.MEDIUM]: 2,
      [NotificationPriority.LOW]: 3,
      [NotificationPriority.INFO]: 4
    };
    
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then sort by timestamp (newest first)
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  // Toggle a specific priority filter
  const toggleFilter = (priority: NotificationPriority) => {
    setActiveFilters(prev => ({
      ...prev,
      [priority]: !prev[priority]
    }));
  };

  return (
    <div className="w-full max-w-sm bg-background border rounded-lg shadow-lg">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-medium text-lg">
          {i18n.language === 'pl' ? 'Powiadomienia' : 
           i18n.language === 'es' ? 'Notificaciones' : 
           'Notifications'}
        </h3>
        
        <div className="flex space-x-2">
          {/* Priority filter dropdown */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Filter className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      {i18n.language === 'en' ? 'Filter by Priority' : 
                       i18n.language === 'es' ? 'Filtrar por Prioridad' : 
                       'Filtruj według Priorytetu'}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuCheckboxItem
                      checked={activeFilters[NotificationPriority.CRITICAL]}
                      onCheckedChange={() => toggleFilter(NotificationPriority.CRITICAL)}
                    >
                      <div className="flex items-center">
                        {PriorityIcon[NotificationPriority.CRITICAL]}
                        <span className="ml-2">
                          {i18n.language === 'en' ? 'Critical' : 
                           i18n.language === 'es' ? 'Crítico' : 
                           'Krytyczny'}
                        </span>
                      </div>
                    </DropdownMenuCheckboxItem>
                    
                    <DropdownMenuCheckboxItem
                      checked={activeFilters[NotificationPriority.HIGH]}
                      onCheckedChange={() => toggleFilter(NotificationPriority.HIGH)}
                    >
                      <div className="flex items-center">
                        {PriorityIcon[NotificationPriority.HIGH]}
                        <span className="ml-2">
                          {i18n.language === 'en' ? 'High' : 
                           i18n.language === 'es' ? 'Alto' : 
                           'Wysoki'}
                        </span>
                      </div>
                    </DropdownMenuCheckboxItem>
                    
                    <DropdownMenuCheckboxItem
                      checked={activeFilters[NotificationPriority.MEDIUM]}
                      onCheckedChange={() => toggleFilter(NotificationPriority.MEDIUM)}
                    >
                      <div className="flex items-center">
                        {PriorityIcon[NotificationPriority.MEDIUM]}
                        <span className="ml-2">
                          {i18n.language === 'en' ? 'Medium' : 
                           i18n.language === 'es' ? 'Medio' : 
                           'Średni'}
                        </span>
                      </div>
                    </DropdownMenuCheckboxItem>
                    
                    <DropdownMenuCheckboxItem
                      checked={activeFilters[NotificationPriority.LOW]}
                      onCheckedChange={() => toggleFilter(NotificationPriority.LOW)}
                    >
                      <div className="flex items-center">
                        {PriorityIcon[NotificationPriority.LOW]}
                        <span className="ml-2">
                          {i18n.language === 'en' ? 'Low' : 
                           i18n.language === 'es' ? 'Bajo' : 
                           'Niski'}
                        </span>
                      </div>
                    </DropdownMenuCheckboxItem>
                    
                    <DropdownMenuCheckboxItem
                      checked={activeFilters[NotificationPriority.INFO]}
                      onCheckedChange={() => toggleFilter(NotificationPriority.INFO)}
                    >
                      <div className="flex items-center">
                        {PriorityIcon[NotificationPriority.INFO]}
                        <span className="ml-2">
                          {i18n.language === 'en' ? 'Info' : 
                           i18n.language === 'es' ? 'Información' : 
                           'Informacja'}
                        </span>
                      </div>
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent>
                {i18n.language === 'en' ? 'Filter by Priority' : 
                 i18n.language === 'es' ? 'Filtrar por Prioridad' : 
                 'Filtruj według Priorytetu'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Mark all as read button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onMarkAllAsRead}
                  disabled={notifications.length === 0}
                >
                  <CheckCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {i18n.language === 'en' ? 'Mark All Read' : 
                 i18n.language === 'es' ? 'Marcar Todo Leído' : 
                 'Oznacz wszystkie jako przeczytane'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Close/Clear button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    if (notifications.length > 0) {
                      onClearAll();
                    }
                    if (onClose) {
                      onClose();
                    }
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {notifications.length > 0 
                  ? (i18n.language === 'en' ? 'Clear All & Close' : 
                     i18n.language === 'es' ? 'Limpiar Todo y Cerrar' : 
                     'Wyczyść wszystkie i zamknij')
                  : (i18n.language === 'en' ? 'Close' : 
                     i18n.language === 'es' ? 'Cerrar' : 
                     'Zamknij')
                }
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Notification list */}
      <ScrollArea className="h-[400px]">
        {sortedNotifications.length > 0 ? (
          <div className="divide-y">
            {sortedNotifications.map(notification => (
              <div 
                key={notification.id}
                className={`p-4 relative hover:bg-accent ${notification.read ? 'opacity-70' : 'opacity-100'} bg-white dark:bg-gray-800 border-l-4 ${notification.priority === 'critical' ? 'border-red-500' : notification.priority === 'high' ? 'border-amber-500' : notification.priority === 'medium' ? 'border-blue-500' : 'border-gray-400'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {PriorityIcon[notification.priority]}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm truncate pr-6 text-black dark:text-white">{notification.title}</h4>
                      <Badge variant="outline" className="text-xs whitespace-nowrap ml-1 flex-shrink-0">
                        {(() => {
                          switch (notification.priority) {
                            case NotificationPriority.CRITICAL:
                              return i18n.language === 'en' ? 'Critical' : 
                                     i18n.language === 'es' ? 'Crítico' : 
                                     'Krytyczny';
                            case NotificationPriority.HIGH:
                              return i18n.language === 'en' ? 'High' : 
                                     i18n.language === 'es' ? 'Alto' : 
                                     'Wysoki';
                            case NotificationPriority.MEDIUM:
                              return i18n.language === 'en' ? 'Medium' : 
                                     i18n.language === 'es' ? 'Medio' : 
                                     'Średni';
                            case NotificationPriority.LOW:
                              return i18n.language === 'en' ? 'Low' : 
                                     i18n.language === 'es' ? 'Bajo' : 
                                     'Niski';
                            case NotificationPriority.INFO:
                              return i18n.language === 'en' ? 'Info' : 
                                     i18n.language === 'es' ? 'Información' : 
                                     'Informacja';
                            default:
                              return notification.priority;
                          }
                        })()}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-black dark:text-white mt-1 leading-relaxed font-semibold">{notification.message}</p>
                    
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs flex items-center text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                      </span>
                      
                      {!notification.read && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs h-6 px-2"
                          onClick={() => onMarkAsRead(notification.id)}
                        >
                          {i18n.language === 'en' ? 'Mark Read' : 
                           i18n.language === 'es' ? 'Marcar Leído' : 
                           'Oznacz jako przeczytane'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <p>
              {i18n.language === 'en' ? 'No notifications available' : 
               i18n.language === 'es' ? 'No hay notificaciones disponibles' : 
               i18n.language === 'pl' ? 'Brak powiadomień' : 
               'No notifications available'}
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}