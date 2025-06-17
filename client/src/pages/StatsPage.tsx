import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BarChart, Clock, Maximize2, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Issue } from "@shared/schema";
import IssueCard from "@/components/issues/IssueCard";

interface Statistics {
  totalIssues: number;
  openIssues: number;
  resolvedIssues: number;
  totalCost: number;
  estimatedCost: number;
  communityMembers: number;
}

export default function StatsPage() {
  const { t, i18n } = useTranslation();
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/statistics'],
    queryFn: async () => {
      const response = await fetch('/api/statistics');
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      return response.json() as Promise<Statistics>;
    },
  });
  
  // Fetch issues
  const { data: issues, isLoading: issuesLoading } = useQuery<Issue[]>({
    queryKey: ['/api/issues'],
    queryFn: async () => {
      const response = await fetch('/api/issues');
      if (!response.ok) {
        throw new Error('Failed to fetch issues');
      }
      return response.json() as Promise<Issue[]>;
    },
  });

  if (statsLoading) {
    return (
      <div className="container py-10">
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button variant="ghost" className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('stats.backToDashboard')}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{t('stats.pageTitle')}</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-6 w-24 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-10 w-20 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  const formatCurrency = (amount: number) => {
    const locale = i18n.language === 'pl' ? 'pl-PL' : i18n.language === 'es' ? 'es-ES' : 'en-US';
    const currency = i18n.language === 'pl' ? 'PLN' : 'USD';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container py-10">
      <div className="flex items-center mb-8">
        <Link href="/">
          <Button variant="ghost" className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('stats.backToDashboard')}
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t('stats.pageTitle')}</h1>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalIssues')}</CardTitle>
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalIssues || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('stats.allTimeReportedIssues')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.openIssues')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openIssues || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('stats.currentlyWaiting')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.resolvedIssues')}</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.resolvedIssues || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('stats.resolvedThisMonth')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.pendingAssignment')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? Math.round((stats.resolvedIssues / stats.totalIssues) * 100) || 0 : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {t('stats.waitingForAssignment')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.companyMembers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.communityMembers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('stats.totalMembers')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('common.totalCost')}</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalCost || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {t('stats.savingsLabel')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('common.estimatedCost')}</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.estimatedCost || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {t('common.estimatedExpenses')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('common.averageCost')}</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats && stats.totalIssues > 0 ? stats.totalCost / stats.totalIssues : 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('common.averageExpense')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Issues list */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4">{t('stats.issuesList')}</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {issuesLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-500">{t('common.loading')}</p>
            </div>
          ) : issues && issues.length > 0 ? (
            issues.map((issue, index) => (
              <div key={issue.id} className={`${index < issues.length - 1 ? 'border-b border-gray-200' : ''} p-4 hover:bg-gray-50`}>
                <IssueCard issue={issue} />
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">{t('stats.noIssues')}</p>
              <Button asChild className="mt-4">
                <Link href="/report">{t('dashboard.reportIssue')}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}