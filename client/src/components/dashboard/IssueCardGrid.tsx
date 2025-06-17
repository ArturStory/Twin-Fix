import { Issue } from "@shared/schema";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, ExternalLink, ChevronRight, Calendar } from "lucide-react";
import IssueStatus from "../issues/IssueStatus";
import { useTranslation } from "react-i18next";

interface IssueCardGridProps {
  issues: Issue[];
  isLoading?: boolean;
}

export default function IssueCardGrid({ issues, isLoading = false }: IssueCardGridProps) {
  const { t } = useTranslation();

  // Format date for display
  const formatDate = (dateString?: Date | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="overflow-hidden">
            <div className="bg-gray-200 h-40 animate-pulse"></div>
            <CardContent className="pt-4">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4 animate-pulse"></div>
              <div className="h-16 bg-gray-200 rounded mb-4 animate-pulse"></div>
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <MapPin className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium">{t('dashboard.noIssuesFound')}</h3>
        <p className="text-gray-500 mt-2 max-w-md mx-auto">
          {t('dashboard.noIssuesDescription')}
        </p>
        <Button asChild className="mt-6">
          <Link href="/report">{t('dashboard.reportIssue')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {issues.map((issue) => (
        <Card key={issue.id} className="overflow-hidden hover:shadow-md transition-shadow">
          {/* Map or Image Preview */}
          <div className="h-40 relative bg-gray-100">
            {issue.latitude && issue.longitude ? (
              <div className="absolute inset-0 bg-gray-200">
                <iframe 
                  title={`Map for ${issue.title}`}
                  className="w-full h-full border-0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${issue.longitude-0.01},${issue.latitude-0.01},${issue.longitude+0.01},${issue.latitude+0.01}&marker=${issue.latitude},${issue.longitude}`} 
                />
              </div>
            ) : issue.imageUrls && issue.imageUrls.length > 0 ? (
              <div className="h-full w-full flex items-center justify-center bg-gray-100">
                <img 
                  src={issue.imageUrls[0]} 
                  alt={issue.title}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-100">
                <MapPin className="h-8 w-8 text-gray-400" />
              </div>
            )}
            
            {/* Status badge */}
            <div className="absolute bottom-2 right-2">
              <IssueStatus status={issue.status} />
            </div>
            
            {/* Location badge if map is not shown */}
            {(!issue.latitude || !issue.longitude) && (
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="flex items-center gap-1 bg-white/90">
                  <MapPin className="h-3 w-3" />
                  {issue.location.length > 20 
                    ? `${issue.location.substring(0, 20)}...` 
                    : issue.location}
                </Badge>
              </div>
            )}
          </div>

          <CardContent className="pt-4">
            <div className="flex justify-between items-start mb-1">
              <Link href={`/issue/${issue.id}`} className="font-semibold text-gray-800 hover:text-primary hover:underline line-clamp-1">
                {issue.title}
              </Link>
            </div>
            
            <div className="flex items-center text-xs text-gray-500 mb-2">
              <Calendar className="h-3 w-3 mr-1" />
              {formatDate(issue.createdAt)}
            </div>
            
            <p className="text-sm text-gray-600 line-clamp-3 mb-3 h-12">
              {issue.description}
            </p>
            
            <div className="flex justify-between items-center mt-2">
              <Link 
                href={`/issue/${issue.id}`} 
                className="text-primary text-sm font-medium hover:underline flex items-center"
              >
                {t('dashboard.viewDetails')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
              
              {issue.latitude && issue.longitude && (
                <a 
                  href={`https://www.openstreetmap.org/?mlat=${issue.latitude}&mlon=${issue.longitude}#map=18/${issue.latitude}/${issue.longitude}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">{t('dashboard.viewOnMap')}</span>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}