import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

import { usePriorityNotifications } from './PriorityNotificationProvider';
import { NotificationPriority } from './PriorityNotificationSystem';

interface NotificationSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NotificationSettingsPanel({
  open,
  onOpenChange
}: NotificationSettingsPanelProps) {
  const { t } = useTranslation();
  const { settings, updateSettings } = usePriorityNotifications();

  // Handle priority level change
  const handlePriorityChange = (value: string) => {
    updateSettings({
      prioritySettings: {
        ...settings.prioritySettings,
        minimumPriority: value as NotificationPriority
      }
    });
  };

  // Handle priority filtering toggle
  const handlePriorityFilteringChange = (checked: boolean) => {
    updateSettings({
      prioritySettings: {
        ...settings.prioritySettings,
        priorityFiltering: checked
      }
    });
  };

  // Handle notification sound toggle
  const handleSoundChange = (checked: boolean) => {
    updateSettings({
      notificationSound: checked
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('notifications.settings.title')}</DialogTitle>
          <DialogDescription>
            {t('notifications.settings.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Priority Filtering Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('notifications.settings.priorityFiltering')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('notifications.settings.priorityFilteringDescription')}
              </p>
            </div>
            <Switch
              checked={settings.prioritySettings.priorityFiltering}
              onCheckedChange={handlePriorityFilteringChange}
            />
          </div>

          {/* Minimum Priority Level */}
          <div className="space-y-2">
            <Label>{t('notifications.settings.minimumPriority')}</Label>
            <Select
              value={settings.prioritySettings.minimumPriority}
              onValueChange={handlePriorityChange}
              disabled={!settings.prioritySettings.priorityFiltering}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('notifications.settings.selectPriority')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NotificationPriority.CRITICAL}>
                  {t('notifications.priority.critical')} ({t('notifications.settings.criticalOnly')})
                </SelectItem>
                <SelectItem value={NotificationPriority.HIGH}>
                  {t('notifications.priority.high')} ({t('notifications.settings.highAndAbove')})
                </SelectItem>
                <SelectItem value={NotificationPriority.MEDIUM}>
                  {t('notifications.priority.medium')} ({t('notifications.settings.mediumAndAbove')})
                </SelectItem>
                <SelectItem value={NotificationPriority.LOW}>
                  {t('notifications.priority.low')} ({t('notifications.settings.lowAndAbove')})
                </SelectItem>
                <SelectItem value={NotificationPriority.INFO}>
                  {t('notifications.priority.info')} ({t('notifications.settings.allNotifications')})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notification Sound */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('notifications.settings.playSound')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('notifications.settings.playSoundDescription')}
              </p>
            </div>
            <Switch
              checked={settings.notificationSound}
              onCheckedChange={handleSoundChange}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}