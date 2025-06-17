import React, { useEffect } from 'react';
import { useAppWebSocket } from '@/hooks/use-websocket';
import { useNotifications } from '@/hooks/use-notification-provider';
import { useTranslation } from 'react-i18next';

interface MachineAddedPayload {
  machineId: number;
  name: string;
  category: string;
  location: string;
  addedBy: string;
  userId: number;
  timestamp: string;
}

interface MachineUpdatedPayload {
  machineId: number;
  name: string;
  updatedBy: string;
  userId: number;
  updatedFields: string[];
  timestamp: string;
}

interface MachineRemovedPayload {
  machineId: number;
  name: string;
  removedBy: string;
  userId: number;
  timestamp: string;
}

interface LocationAddedPayload {
  locationId: number;
  name: string;
  addedBy: string;
  userId: number;
  timestamp: string;
}

interface LocationRemovedPayload {
  locationId: number;
  name: string;
  removedBy: string;
  userId: number;
  timestamp: string;
}

interface CategoryAddedPayload {
  categoryId: number;
  name: string;
  addedBy: string;
  userId: number;
  timestamp: string;
}

/**
 * Component that listens for inventory-related events over WebSocket
 * and displays them as notifications
 */
export function InventoryRealTimeUpdates() {
  const { addListener, removeListener } = useAppWebSocket();
  const { notify, settings } = useNotifications();
  const { t } = useTranslation(['common', 'inventory']);

  useEffect(() => {
    // Only proceed if inventory updates notifications are enabled
    if (!settings.showInventoryUpdates) {
      return;
    }

    // Handle machine added events
    const handleMachineAdded = (payload: MachineAddedPayload) => {
      notify(
        t('inventory:machineAddedTitle'),
        t('inventory:machineAddedMessage', { 
          user: payload.addedBy,
          name: payload.name,
          category: payload.category,
          location: payload.location
        }),
        'info'
      );
    };

    // Handle machine updated events
    const handleMachineUpdated = (payload: MachineUpdatedPayload) => {
      notify(
        t('inventory:machineUpdatedTitle'),
        t('inventory:machineUpdatedMessage', {
          user: payload.updatedBy,
          name: payload.name,
          fields: payload.updatedFields.join(', ')
        }),
        'info'
      );
    };

    // Handle machine removed events
    const handleMachineRemoved = (payload: MachineRemovedPayload) => {
      notify(
        t('inventory:machineRemovedTitle'),
        t('inventory:machineRemovedMessage', {
          user: payload.removedBy,
          name: payload.name
        }),
        'info'
      );
    };

    // Handle location added events
    const handleLocationAdded = (payload: LocationAddedPayload) => {
      notify(
        t('inventory:locationAddedTitle'),
        t('inventory:locationAddedMessage', {
          user: payload.addedBy,
          name: payload.name
        }),
        'info'
      );
    };

    // Handle location removed events
    const handleLocationRemoved = (payload: LocationRemovedPayload) => {
      notify(
        t('inventory:locationRemovedTitle'),
        t('inventory:locationRemovedMessage', {
          user: payload.removedBy,
          name: payload.name
        }),
        'info'
      );
    };

    // Handle category added events
    const handleCategoryAdded = (payload: CategoryAddedPayload) => {
      notify(
        t('inventory:categoryAddedTitle'),
        t('inventory:categoryAddedMessage', {
          user: payload.addedBy,
          name: payload.name
        }),
        'info'
      );
    };

    // Register WebSocket listeners
    addListener('machine_added', handleMachineAdded);
    addListener('machine_updated', handleMachineUpdated);
    addListener('machine_removed', handleMachineRemoved);
    addListener('location_added', handleLocationAdded);
    addListener('location_removed', handleLocationRemoved);
    addListener('category_added', handleCategoryAdded);

    // Clean up listeners on unmount
    return () => {
      removeListener('machine_added', handleMachineAdded);
      removeListener('machine_updated', handleMachineUpdated);
      removeListener('machine_removed', handleMachineRemoved);
      removeListener('location_added', handleLocationAdded);
      removeListener('location_removed', handleLocationRemoved);
      removeListener('category_added', handleCategoryAdded);
    };
  }, [addListener, removeListener, notify, settings, t]);

  // This component doesn't render anything
  return null;
}