import React from 'react';
import { useTranslation } from 'react-i18next';
import { Issue } from '@shared/schema';
import { cn } from '@/lib/utils';
import { Building } from 'lucide-react';
import i18n from 'i18next';

interface IssuePinnedLocationProps {
  issue: Issue;
  className?: string;
}

export default function IssuePinnedLocation({
  issue,
  className,
}: IssuePinnedLocationProps) {
  const { t } = useTranslation();
  
  return (
    <div className={cn("", className)}>
      <div className="border border-gray-200 rounded-md overflow-hidden mb-4 p-6 flex flex-col items-center justify-center">
        <Building className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-700">
          {i18n.language === 'es' ? 'Información de ubicación' : 
           i18n.language === 'pl' ? 'Informacje o lokalizacji' : 
           'Location information'}
        </h3>
        <p className="text-gray-500 text-center mt-2">
          {issue.location}
        </p>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="font-medium text-gray-700">
            {i18n.language === 'es' ? 'Ubicación seleccionada' : 
             i18n.language === 'pl' ? 'Wybrana lokalizacja' : 
             'Selected location'}
          </div>
          <div className="text-sm mt-1">
            {issue.location}
          </div>
        </div>
        
        <div>
          <div className="font-medium text-gray-700">
            {i18n.language === 'es' ? 'Prioridad' : 
             i18n.language === 'pl' ? 'Priorytet' : 
             'Priority'}
          </div>
          <div className="text-sm mt-1">
            {issue.priority}
          </div>
        </div>
      </div>
    </div>
  );
}