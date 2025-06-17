import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

enum IssueStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SCHEDULED = 'scheduled',
  URGENT = 'urgent',
}

interface StatisticsData {
  totalIssues: number;
  openIssues: number;
  resolvedIssues: number;
  inProgressIssues: number;
  urgentIssues: number;
  byStatus: Record<string, number>;
}

interface LocationStatisticsCardProps {
  locationName: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function LocationStatisticsCard({ locationName }: LocationStatisticsCardProps) {
  const { t, i18n } = useTranslation();
  const [selectedTab, setSelectedTab] = useState('pie');
  
  // Fetch statistics data
  const { data: issues, isLoading } = useQuery({
    queryKey: ['/api/issues'],
    staleTime: 60000, // 1 minute
  });

  // Fetch statistics data
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/statistics'],
    staleTime: 60000, // 1 minute
  });

  // Filter issues for this location if needed
  const locationIssues = issues ? issues.filter((issue: any) => 
    issue.location.includes(locationName)
  ) : [];

  // Count issues by status if API doesn't provide it
  const countByStatus = React.useMemo(() => {
    if (!issues || issues.length === 0) return {};
    
    return issues.reduce((acc: Record<string, number>, issue: any) => {
      const status = issue.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [issues]);

  // Prepare data for charts
  const pieChartData = React.useMemo(() => {
    if (statsData) {
      return [
        { name: t('status.in_progress'), value: statsData.inProgressIssues },
        { name: t('status.urgent'), value: statsData.urgentIssues },
        { name: t('status.pending'), value: statsData.openIssues - statsData.inProgressIssues - statsData.urgentIssues },
        { name: t('status.completed'), value: statsData.resolvedIssues },
      ].filter(item => item.value > 0);
    }
    
    if (!countByStatus) return [];
    
    return Object.entries(countByStatus).map(([status, count]) => ({
      name: t(`status.${status}`),
      value: count,
    }));
  }, [statsData, countByStatus, t]);

  if (isLoading || isLoadingStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('statistics.issuesByStatus')}</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-slate-200 h-16 w-16"></div>
            <div className="flex-1 space-y-6 py-1">
              <div className="h-2 bg-slate-200 rounded"></div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                  <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                </div>
                <div className="h-2 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>
            {i18n.language === 'pl' ? 'Zgłoszenia według statusu' : 
             i18n.language === 'es' ? 'Problemas por estado' : 'Issues by Status'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{locationName}</p>
        </div>
        <div className="flex space-x-2">
          <Badge 
            variant={selectedTab === 'pie' ? "default" : "outline"} 
            className="cursor-pointer"
            onClick={() => setSelectedTab('pie')}
          >
            {i18n.language === 'pl' ? 'Przegląd' : 
             i18n.language === 'es' ? 'Resumen' : 'Overview'}
          </Badge>
          <Badge 
            variant={selectedTab === 'bar' ? "default" : "outline"} 
            className="cursor-pointer"
            onClick={() => setSelectedTab('bar')}
          >
            {i18n.language === 'pl' ? 'Trendy zgłoszeń' : 
             i18n.language === 'es' ? 'Tendencia de problemas' : 'Issues Trend'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {selectedTab === 'pie' ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={60}
                  innerRadius={20}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ percent }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                  labelStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value}`, name]} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pieChartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}`, t('statistics.allIssues')]} />
                <Legend />
                <Bar dataKey="value" fill="#8884d8">
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-sm font-medium text-muted-foreground">
              {i18n.language === 'pl' ? 'Wszystkie Problemy' : 
               i18n.language === 'es' ? 'Total de Problemas' : 'Total Issues'}
            </p>
            <p className="mt-1 text-2xl font-bold">
              {statsData?.totalIssues || 0}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-sm font-medium text-muted-foreground">
              {i18n.language === 'pl' ? 'Otwarte Problemy' : 
               i18n.language === 'es' ? 'Problemas Abiertos' : 'Open Issues'}
            </p>
            <p className="mt-1 text-2xl font-bold text-yellow-600">
              {statsData?.openIssues || 0}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-sm font-medium text-muted-foreground">
              {i18n.language === 'pl' ? 'Problemy w Trakcie' : 
               i18n.language === 'es' ? 'Problemas en Progreso' : 'Issues in Progress'}
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {statsData?.inProgressIssues || 0}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-sm font-medium text-muted-foreground">
              {i18n.language === 'pl' ? 'Rozwiązane w Tym Miesiącu' : 
               i18n.language === 'es' ? 'Resueltos Este Mes' : 'Resolved This Month'}
            </p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {statsData?.resolvedIssues || 0}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}