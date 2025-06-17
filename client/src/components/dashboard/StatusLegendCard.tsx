import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

// Status colors mapping
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  scheduled: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  urgent: 'bg-red-100 text-red-800 border-red-200',
};

// These are the translations for different languages
const translations = {
  en: {
    legend: 'Status Legend',
    pending: 'Pending',
    pendingDesc: 'Waiting for review',
    inProgress: 'In Progress',
    inProgressDesc: 'Currently being repaired',
    scheduled: 'Scheduled',
    scheduledDesc: 'Planned for repair',
    urgent: 'Urgent',
    urgentDesc: 'High priority issues',
    completed: 'Completed',
    completedDesc: 'Successfully repaired'
  },
  pl: {
    legend: 'Legenda Statusów',
    pending: 'Oczekujący',
    pendingDesc: 'Oczekujące na przegląd',
    inProgress: 'W Trakcie',
    inProgressDesc: 'Aktualnie naprawiane',
    scheduled: 'Zaplanowany',
    scheduledDesc: 'Zaplanowane do naprawy',
    urgent: 'Pilny',
    urgentDesc: 'Problemy o wysokim priorytecie',
    completed: 'Zakończony',
    completedDesc: 'Pomyślnie naprawione'
  },
  es: {
    legend: 'Leyenda de Estados',
    pending: 'Pendiente',
    pendingDesc: 'En espera de revisión',
    inProgress: 'En Progreso',
    inProgressDesc: 'En proceso de reparación',
    scheduled: 'Programado',
    scheduledDesc: 'Planificado para reparación',
    urgent: 'Urgente',
    urgentDesc: 'Problemas de alta prioridad',
    completed: 'Completado',
    completedDesc: 'Reparado con éxito'
  }
};

type StatusItem = {
  key: string;
  color: string;
  label: string;
  description: string;
  count?: number;
  interactive?: boolean;
};

interface StatusLegendCardProps {
  onStatusClick?: (status: string) => void;
  hideCount?: boolean;
  countsData?: Record<string, number>;
}

export default function StatusLegendCard({ 
  onStatusClick, 
  hideCount = false,
  countsData = {}
}: StatusLegendCardProps) {
  const { i18n } = useTranslation();
  
  // Get current language or default to English
  const currentLang = i18n.language || 'en';
  const lang = currentLang.startsWith('pl') ? 'pl' : 
               currentLang.startsWith('es') ? 'es' : 'en';
  
  // Use our translations object to get text in the current language
  const trans = translations[lang];

  const statusItems: StatusItem[] = [
    { 
      key: 'pending', 
      color: statusColors.pending,
      label: trans.pending,
      description: trans.pendingDesc,
      count: countsData['pending'] || 0,
      interactive: !!onStatusClick
    },
    { 
      key: 'in_progress', 
      color: statusColors.in_progress,
      label: trans.inProgress,
      description: trans.inProgressDesc,
      count: countsData['in_progress'] || 0,
      interactive: !!onStatusClick
    },
    { 
      key: 'scheduled', 
      color: statusColors.scheduled,
      label: trans.scheduled,
      description: trans.scheduledDesc,
      count: countsData['scheduled'] || 0,
      interactive: !!onStatusClick
    },
    { 
      key: 'urgent', 
      color: statusColors.urgent,
      label: trans.urgent,
      description: trans.urgentDesc,
      count: countsData['urgent'] || 0,
      interactive: !!onStatusClick
    },
    { 
      key: 'completed', 
      color: statusColors.completed,
      label: trans.completed,
      description: trans.completedDesc,
      count: countsData['completed'] || 0,
      interactive: !!onStatusClick
    }
  ];

  const handleStatusClick = (status: string) => {
    if (onStatusClick) {
      onStatusClick(status);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{trans.legend}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {statusItems.map((status) => (
            <div 
              key={status.key}
              className={`p-3 rounded-lg border ${status.color} ${status.interactive ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
              onClick={status.interactive ? () => handleStatusClick(status.key) : undefined}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {status.label}
                  </div>
                  <div className="text-sm mt-1">
                    {status.description}
                  </div>
                </div>
                {!hideCount && (
                  <Badge variant="outline" className="ml-2 text-sm px-2 py-1 font-normal text-black dark:text-black bg-white dark:bg-white border-gray-300">
                    {status.count}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}