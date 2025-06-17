import React, { useEffect } from 'react';
import { useAppWebSocket } from '@/hooks/use-websocket';
import { useNotifications } from '@/hooks/use-notification-provider';
import { useTranslation } from 'react-i18next';

interface UserLoginPayload {
  userId: number;
  username: string;
  role: string;
  timestamp: string;
}

interface UserRoleChangePayload {
  userId: number;
  username: string;
  oldRole: string;
  newRole: string;
  changedBy?: string;
  timestamp: string;
}

interface UserNavigationPayload {
  userId: number;
  username: string;
  page: string;
  pageName: string;
  timestamp: string;
}

/**
 * Component that listens for user action events over WebSocket
 * and displays them as notifications
 */
export function UserActionNotifications() {
  const { addListener, removeListener } = useAppWebSocket();
  const { notify, notifyUserActivity, settings } = useNotifications();
  const { t } = useTranslation(['userActivity']);

  useEffect(() => {
    // Handle user login events
    const handleUserLogin = (payload: UserLoginPayload) => {
      if (!settings.showUserLogins) return;

      notifyUserActivity(
        payload.username,
        t('userActivity:login'),
        t('userActivity:asRole', { role: payload.role })
      );
    };

    // Handle user logout events
    const handleUserLogout = (payload: UserLoginPayload) => {
      if (!settings.showUserLogouts) return;

      notifyUserActivity(
        payload.username,
        t('userActivity:logout')
      );
    };

    // Handle user registration events
    const handleUserRegister = (payload: UserLoginPayload) => {
      if (!settings.showUserRegistrations) return;

      notifyUserActivity(
        payload.username,
        t('userActivity:register'),
        t('userActivity:asRole', { role: payload.role })
      );
    };

    // Handle user role change events
    const handleUserRoleChange = (payload: UserRoleChangePayload) => {
      notifyUserActivity(
        payload.username,
        t('userActivity:roleChange'),
        t('userActivity:newRole', { role: payload.newRole })
      );
    };

    // Handle user navigation events
    const handleUserNavigation = (payload: UserNavigationPayload) => {
      notifyUserActivity(
        payload.username,
        t('userActivity:navigation'),
        t('userActivity:navigatedTo', { page: payload.pageName })
      );
    };

    // Register WebSocket listeners
    addListener('user_login', handleUserLogin);
    addListener('user_logout', handleUserLogout);
    addListener('user_register', handleUserRegister);
    addListener('role_changed', handleUserRoleChange);
    addListener('user_navigation', handleUserNavigation);

    // Clean up listeners on unmount
    return () => {
      removeListener('user_login', handleUserLogin);
      removeListener('user_logout', handleUserLogout);
      removeListener('user_register', handleUserRegister);
      removeListener('role_changed', handleUserRoleChange);
      removeListener('user_navigation', handleUserNavigation);
    };
  }, [addListener, removeListener, notify, notifyUserActivity, settings, t]);

  // This component doesn't render anything
  return null;
}