import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Check, PlayCircle, Calendar, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  showIcon?: boolean;
  className?: string;
}

export default function StatusBadge({ 
  status, 
  showIcon = true,
  className 
}: StatusBadgeProps) {
  const { t, i18n } = useTranslation();
  
  // Get status details based on the status value
  const getStatusDetails = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || 'pending';
    
    switch (normalizedStatus) {
      case 'pending':
        return {
          label: i18n.language === 'en' ? 'Pending' : 
                 i18n.language === 'es' ? 'Pendiente' : 
                 'Oczekujące',
          icon: <Clock className="h-3 w-3 mr-1" />,
          variant: 'warning'
        };
      case 'in_progress':
        return {
          label: i18n.language === 'en' ? 'In Progress' : 
                 i18n.language === 'es' ? 'En Progreso' : 
                 'W trakcie',
          icon: <PlayCircle className="h-3 w-3 mr-1" />,
          variant: 'info'
        };
      case 'completed':
        return {
          label: i18n.language === 'en' ? 'Completed' : 
                 i18n.language === 'es' ? 'Completado' : 
                 'Ukończone',
          icon: <Check className="h-3 w-3 mr-1" />,
          variant: 'success'
        };
      case 'scheduled':
        return {
          label: i18n.language === 'en' ? 'Scheduled' : 
                 i18n.language === 'es' ? 'Programado' : 
                 'Zaplanowane',
          icon: <Calendar className="h-3 w-3 mr-1" />,
          variant: 'purple'
        };
      case 'urgent':
        return {
          label: i18n.language === 'en' ? 'Urgent' : 
                 i18n.language === 'es' ? 'Urgente' : 
                 'Pilne',
          icon: <AlertCircle className="h-3 w-3 mr-1" />,
          variant: 'destructive'
        };
      default:
        return {
          label: status || (i18n.language === 'en' ? 'Unknown' : 
                           i18n.language === 'es' ? 'Desconocido' : 
                           'Nieznany'),
          icon: <Clock className="h-3 w-3 mr-1" />,
          variant: 'default'
        };
    }
  };
  
  const { label, icon, variant } = getStatusDetails(status);
  
  // Custom styling for different variants
  const getVariantClass = (variant: string) => {
    switch (variant) {
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'success':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'purple':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'destructive':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-medium",
        getVariantClass(variant),
        className
      )}
    >
      {showIcon && icon}
      {label}
    </Badge>
  );
}