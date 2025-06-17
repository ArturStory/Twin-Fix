import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: string;
  showIcon?: boolean;
  className?: string;
}

export default function PriorityBadge({ 
  priority, 
  showIcon = true,
  className 
}: PriorityBadgeProps) {
  const { t, i18n } = useTranslation();
  
  // Get priority details based on the priority value
  const getPriorityDetails = (priority: string) => {
    const normalizedPriority = priority?.toLowerCase() || 'medium';
    
    switch (normalizedPriority) {
      case 'low':
        return {
          label: i18n.language === 'en' ? 'Low' : 
                 i18n.language === 'es' ? 'Bajo' : 
                 'Niski',
          icon: <ArrowDown className="h-3 w-3 mr-1" />,
          variant: 'low'
        };
      case 'medium':
        return {
          label: i18n.language === 'en' ? 'Medium' : 
                 i18n.language === 'es' ? 'Medio' : 
                 'Średni',
          icon: <ArrowRight className="h-3 w-3 mr-1" />,
          variant: 'medium'
        };
      case 'high':
        return {
          label: i18n.language === 'en' ? 'High' : 
                 i18n.language === 'es' ? 'Alto' : 
                 'Wysoki',
          icon: <ArrowUp className="h-3 w-3 mr-1" />,
          variant: 'high'
        };
      default:
        return {
          label: priority || (i18n.language === 'en' ? 'Normal' : 
                             i18n.language === 'es' ? 'Normal' : 
                             'Normalny'),
          icon: <ArrowRight className="h-3 w-3 mr-1" />,
          variant: 'default'
        };
    }
  };
  
  const { label, icon, variant } = getPriorityDetails(priority);
  
  // Custom styling for different variants
  const getVariantClass = (variant: string) => {
    switch (variant) {
      case 'low':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'medium':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'high':
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