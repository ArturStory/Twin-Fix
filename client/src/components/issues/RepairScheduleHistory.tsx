import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarClock, ClockIcon, History, RefreshCw, UserCheck, X } from 'lucide-react';
import { RepairScheduleStatus } from '@shared/schema';

interface RepairScheduleHistoryItem {
  id: number;
  issueId: number;
  oldScheduleDate: string | null;
  newScheduleDate: string | null;
  oldStatus: RepairScheduleStatus | null;
  newStatus: RepairScheduleStatus;
  changedById: number | null;
  changedByName: string | null;
  notes: string | null;
  createdAt: string;
}

interface RepairScheduleHistoryProps {
  issueId: number;
}

export default function RepairScheduleHistory({ issueId }: RepairScheduleHistoryProps) {
  const { t } = useTranslation();

  const { data: history, isLoading, error } = useQuery({
    queryKey: ['/api/issues/repair-history', issueId],
    queryFn: async () => {
      const response = await fetch(`/api/issues/repair-history/${issueId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch repair history');
      }
      return response.json();
    },
    retry: false,
  });

  if (isLoading) {
    return <HistorySkeleton />;
  }

  if (error || !history || (Array.isArray(history) && history.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('repair.historyTitle')}</CardTitle>
          <CardDescription>{t('repair.historyDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <History className="mb-2 h-10 w-10" />
            <p>{error ? t('common.errorFetching') : t('repair.noHistory')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('repair.historyTitle')}</CardTitle>
        <CardDescription>{t('repair.historyDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {Array.isArray(history) ? history.map((item: RepairScheduleHistoryItem) => (
              <HistoryItem key={item.id} item={item} />
            )) : null}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function HistoryItem({ item }: { item: RepairScheduleHistoryItem }) {
  const { t } = useTranslation();
  
  // Format dates
  const formattedCreatedAt = format(new Date(item.createdAt), 'PPP p');
  const formattedOldDate = item.oldScheduleDate 
    ? format(new Date(item.oldScheduleDate), 'PPP')
    : null;
  const formattedNewDate = item.newScheduleDate
    ? format(new Date(item.newScheduleDate), 'PPP')
    : null;
  
  // Determine icon based on status change
  const getIcon = () => {
    switch (item.newStatus) {
      case RepairScheduleStatus.PROPOSED:
        return <CalendarClock className="h-5 w-5 text-blue-500" />;
      case RepairScheduleStatus.CONFIRMED:
        return <UserCheck className="h-5 w-5 text-green-500" />;
      case RepairScheduleStatus.RESCHEDULED:
        return <RefreshCw className="h-5 w-5 text-amber-500" />;
      case RepairScheduleStatus.COMPLETED:
        return <ClockIcon className="h-5 w-5 text-emerald-500" />;
      case RepairScheduleStatus.CANCELLED:
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return <History className="h-5 w-5" />;
    }
  };
  
  return (
    <div className="flex items-start space-x-4 border-b pb-4 last:border-b-0 last:pb-0">
      <div className="mt-1">{getIcon()}</div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {item.changedByName || t('common.system')}
          </p>
          <span className="text-xs text-muted-foreground">{formattedCreatedAt}</span>
        </div>
        
        <div className="space-y-1">
          <Badge variant="outline" className="font-normal">
            {t(`repair.status.${item.newStatus}`)}
          </Badge>
          
          {(formattedOldDate || formattedNewDate) && (
            <div className="text-xs">
              {formattedOldDate && formattedNewDate && formattedOldDate !== formattedNewDate ? (
                <span>
                  {t('repair.rescheduledFrom')} {formattedOldDate} {t('repair.to')} {formattedNewDate}
                </span>
              ) : formattedNewDate ? (
                <span>
                  {t('repair.scheduledFor')} {formattedNewDate}
                </span>
              ) : null}
            </div>
          )}
          
          {item.notes && (
            <p className="text-sm">{item.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('repair.historyTitle')}</CardTitle>
        <CardDescription>{t('repair.historyDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start space-x-4 pb-4">
              <Skeleton className="h-5 w-5 rounded-full" />
              <div className="space-y-2 w-full">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}