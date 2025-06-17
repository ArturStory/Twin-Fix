import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale/pl';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Clock, Wrench, AlertTriangle, Calendar, RotateCcw, History, Settings } from 'lucide-react';
import i18n from 'i18next';

interface StatusChange {
  id: number;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
  changedBy?: {
    id: number;
    username: string;
  };
  notes?: string;
}

interface StatusHistoryTimelineProps {
  history: StatusChange[];
  className?: string;
  createdDate?: string; // Optional created date for the issue
  machineId?: number; // Optional machine ID for the issue
}

export default function StatusHistoryTimeline({ 
  history, 
  className,
  createdDate,
  machineId
}: StatusHistoryTimelineProps) {
  const { t } = useTranslation();
  
  // Calculate key statistics from history
  const statistics = useMemo(() => {
    // Get initial report date (either from createdDate or from the oldest history item)
    let reportDate = createdDate 
      ? createdDate 
      : history.length > 0 
        ? history.sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())[0].changedAt 
        : new Date().toISOString();
    
    // Count repairs (transitions to 'completed' status)
    const repairs = history.filter(item => item.newStatus?.toLowerCase() === 'completed').length;
    
    // Count breakages (transitions to 'pending' or 'urgent' from another status)
    const breakages = history.filter(item => 
      (item.newStatus?.toLowerCase() === 'pending' || item.newStatus?.toLowerCase() === 'urgent') && 
      item.oldStatus?.toLowerCase() !== 'pending' && 
      item.oldStatus?.toLowerCase() !== 'urgent'
    ).length;
    
    return {
      reportDate,
      repairs,
      breakages,
      totalStatusChanges: history.length
    };
  }, [history, createdDate]);

  // Format the report date for display
  const formattedReportDate = useMemo(() => {
    try {
      const locale = i18n.language === 'pl' ? pl : 
                     i18n.language === 'es' ? es : 
                     enUS;
      return format(parseISO(statistics.reportDate), 'PPpp', { locale });
    } catch (e) {
      console.error('Error formatting report date:', e);
      return 'Unknown date';
    }
  }, [statistics.reportDate, i18n.language]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Initial Report Information */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <History className="h-5 w-5 mr-2 text-primary" />
            {i18n.language === 'es' ? 'Reporte inicial' : 
             i18n.language === 'pl' ? 'Pierwotne zgłoszenie' : 
             'Initial report'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-2">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-sm">{formattedReportDate}</span>
          </div>
          
          {machineId && (
            <div className="flex items-center mb-2">
              <Settings className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">{t('inventory.machine')} ID: {machineId}</span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Repair History Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Wrench className="h-5 w-5 mr-2 text-primary" />
            {i18n.language === 'es' ? 'Historia de reparaciones' : 
             i18n.language === 'pl' ? 'Historia napraw' : 
             'Repair history'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/20 p-4 rounded-lg flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{statistics.repairs}</span>
              <span className="text-sm text-muted-foreground text-center">
                {i18n.language === 'es' ? 'veces reparado' : 
                 i18n.language === 'pl' ? 'razy naprawiony' : 
                 'times repaired'}
              </span>
            </div>
            
            <div className="bg-muted/20 p-4 rounded-lg flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{statistics.breakages}</span>
              <span className="text-sm text-muted-foreground text-center">
                {i18n.language === 'es' ? 'veces dañado' : 
                 i18n.language === 'pl' ? 'razy zepsute' : 
                 'times broken'}
              </span>
            </div>
            
            <div className="bg-muted/20 p-4 rounded-lg flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{statistics.totalStatusChanges}</span>
              <span className="text-sm text-muted-foreground text-center">
                {i18n.language === 'es' ? 'cambios de estado' : 
                 i18n.language === 'pl' ? 'zmiany statusu' : 
                 'status changes'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}