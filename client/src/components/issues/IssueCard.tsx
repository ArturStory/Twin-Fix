import { Issue } from "@shared/schema";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, CalendarClock } from "lucide-react";
import IssueStatus from "./IssueStatus";
import { useTranslation } from "react-i18next";

interface IssueCardProps {
  issue: Issue;
}

export default function IssueCard({ issue }: IssueCardProps) {
  const { t, i18n } = useTranslation();
  
  // Format cost for display based on locale
  const formatCost = (cost?: number | null) => {
    const costValue = cost ?? 0;
    
    if (i18n.language === 'pl') {
      // Polish format: 1 200 zł
      return `${costValue.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} zł`;
    } else if (i18n.language === 'es') {
      // Spanish format: €1,200.00
      return `€${costValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    } else {
      // Default/English format: $1,200.00
      return `$${costValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    }
  };
  
  // Format date for display
  const formatDate = (dateString?: Date | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return t('dates.today');
    } else if (diffDays === 1) {
      return t('dashboard.yesterday');
    } else if (diffDays < 7) {
      return t('dates.daysAgo', { count: diffDays });
    } else {
      // Use the locale from i18n
      const locale = i18n.language === 'en' ? 'en-US' : 
                     i18n.language === 'es' ? 'es-ES' : 
                     i18n.language === 'pl' ? 'pl-PL' : 'en-US';
      
      return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric'
      }).format(date);
    }
  };

  return (
    <div className="flex flex-col md:flex-row">
      <div className="md:w-1/4 mb-4 md:mb-0 flex-shrink-0">
        {issue.imageUrls && issue.imageUrls.length > 0 ? (
          <Link href={`/issue/${issue.id}`} className="block rounded-lg w-full h-48 md:h-32 overflow-hidden bg-gray-100">
            <img 
              src={issue.imageUrls[0]} 
              alt={`${t('issues.photoFor')} ${issue.title}`}
              className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // If image fails to load, replace with placeholder
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.classList.add('placeholder-image');
              }}
            />
            {issue.imageUrls.length > 1 && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs rounded-full px-2 py-1 pointer-events-none">
                +{issue.imageUrls.length - 1}
              </div>
            )}
          </Link>
        ) : (
          <div className="rounded-lg w-full h-48 md:h-32 bg-gray-100 flex items-center justify-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="32" height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-gray-400"
              aria-label={t('dashboard.imagePlaceholder')}
            ><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
          </div>
        )}
      </div>
      <div className="md:ml-4 flex-1">
        <div className="flex flex-wrap items-start justify-between">
          <div>
            <Link href={`/issue/${issue.id}`} className="font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-300 hover:underline drop-shadow-sm">
              {issue.title}
            </Link>
            <div className="flex items-center mt-1 text-sm text-gray-700 dark:text-gray-100">
              <MapPin className="mr-1 h-4 w-4" aria-label={t('locations.title')} />
              <span className="font-medium">{issue.location}</span>
            </div>
          </div>
          <div className="mt-2 md:mt-0">
            <IssueStatus status={issue.status} />
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 line-clamp-2 font-medium">{issue.description}</p>
        
        {/* Reporter information - now in its own row */}
        <div className="mt-3 flex items-center text-sm text-gray-900 dark:text-gray-300">
          <Avatar className="w-6 h-6 mr-2">
            <AvatarImage 
              src={`https://randomuser.me/api/portraits/${issue.reporterId % 2 === 0 ? 'women' : 'men'}/${(issue.reporterId || 1) % 10}.jpg`} 
              alt={t('issues.reporter')} 
            />
            <AvatarFallback>
              {/* Use specific initials for known issue reporters */}
              {issue.id === 34 ? 'A' : 
               issue.id === 37 ? 'M' :
               issue.id === 38 ? 'A' : 
               (issue.reportedByName?.charAt(0) || "??")}
            </AvatarFallback>
          </Avatar>
          <span>{t('issues.reportedBy')} {
            // Use specific names for known issue reporters
            issue.id === 34 ? 'Artur' : 
            issue.id === 37 ? 'Mikolaj' :
            issue.id === 38 ? 'Artur' : 
            issue.reportedByName
          }</span>
          <span className="mx-2">•</span>
          <span>{formatDate(issue.createdAt)}</span>
        </div>
        
        {/* Action buttons for mobile */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/issue/${issue.id}`}>
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs"
            >
              {i18n.language === 'en' ? 'View' : 
               i18n.language === 'es' ? 'Ver' : 
               i18n.language === 'pl' ? 'Zobacz' : 
               'View'}
            </Button>
          </Link>
          
          {issue.status === 'pending' && (
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs"
              onClick={() => {
                // Schedule repair functionality - placeholder for now
                console.log('Schedule repair for issue:', issue.id);
              }}
            >
              <CalendarClock className="h-3 w-3 mr-1" />
              {i18n.language === 'en' ? 'Schedule' : 
               i18n.language === 'es' ? 'Programar' : 
               i18n.language === 'pl' ? 'Zaplanuj' : 
               'Schedule'}
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs text-red-600 border-red-300 hover:bg-red-50"
            onClick={() => {
              // Delete functionality - placeholder for now
              console.log('Delete issue:', issue.id);
            }}
          >
            {i18n.language === 'en' ? 'Delete' : 
             i18n.language === 'es' ? 'Eliminar' : 
             i18n.language === 'pl' ? 'Usuń' : 
             'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}
