import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  MapPin, 
  Clock, 
  DollarSign, 
  Wrench, 
  Building, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowUpDown
} from 'lucide-react';
import { format } from 'date-fns';
import { pl, es, enUS } from 'date-fns/locale';

import LocationStatisticsCard from '@/components/dashboard/LocationStatisticsCard';
import StatusLegendCard from '@/components/dashboard/StatusLegendCard';

// Comprehensive translations for advanced statistics
const translations = {
  en: {
    title: 'Advanced Statistics',
    overview: 'Statistical Overview',
    overviewTab: 'Overview',
    machineAnalysis: 'Analysis',
    detailedBreakdown: 'Breakdown',
    locationFilter: 'Filter by Location',
    allLocations: 'All Locations',
    totalCosts: 'Total Repair Costs',
    avgRepairTime: 'Avg Repair Time',
    machineIssues: 'Machine Issues',
    facilityIssues: 'Facility Issues',
    pendingCosts: 'Pending Estimated Costs',
    completedRepairs: 'Completed Repairs',
    machineInvestment: 'Machine Investment Tracking',
    repairHistory: 'Repair History',
    costAnalysis: 'Cost Analysis',
    timeMetrics: 'Time Metrics',
    hours: 'hours',
    days: 'days',
    currency: 'PLN',
    noData: 'No data available',
    loading: 'Loading statistics...',
    reportedBy: 'Reported by',
    repairedBy: 'Repaired by',
    reportTime: 'Report Time',
    repairTime: 'Repair Time',
    duration: 'Duration',
    status: 'Status'
  },
  pl: {
    title: 'Zaawansowane Statystyki',
    overview: 'Przegląd Statystyczny',
    overviewTab: 'Przegląd',
    machineAnalysis: 'Analiza',
    detailedBreakdown: 'Podział',
    locationFilter: 'Filtruj według Lokalizacji',
    allLocations: 'Wszystkie Lokalizacje',
    totalCosts: 'Całkowite Koszty Napraw',
    avgRepairTime: 'Średni Czas Naprawy',
    machineIssues: 'Problemy z Maszynami',
    facilityIssues: 'Problemy z Obiektem',
    pendingCosts: 'Oczekujące Szacowane Koszty',
    completedRepairs: 'Ukończone Naprawy',
    machineInvestment: 'Śledzenie Inwestycji w Maszyny',
    repairHistory: 'Historia Napraw',
    costAnalysis: 'Analiza Kosztów',
    timeMetrics: 'Metryki Czasowe',
    hours: 'godzin',
    days: 'dni',
    currency: 'PLN',
    noData: 'Brak dostępnych danych',
    loading: 'Ładowanie statystyk...',
    reportedBy: 'Zgłoszone przez',
    repairedBy: 'Naprawione przez',
    reportTime: 'Czas Zgłoszenia',
    repairTime: 'Czas Naprawy',
    duration: 'Czas Trwania',
    status: 'Status'
  },
  es: {
    title: 'Estadísticas Avanzadas',
    overview: 'Resumen Estadístico',
    overviewTab: 'Resumen',
    machineAnalysis: 'Análisis',
    detailedBreakdown: 'Desglose',
    locationFilter: 'Filtrar por Ubicación',
    allLocations: 'Todas las Ubicaciones',
    totalCosts: 'Costos Totales de Reparación',
    avgRepairTime: 'Tiempo Promedio de Reparación',
    machineIssues: 'Problemas de Máquinas',
    facilityIssues: 'Problemas de Instalaciones',
    pendingCosts: 'Costos Estimados Pendientes',
    completedRepairs: 'Reparaciones Completadas',
    machineInvestment: 'Seguimiento de Inversión en Máquinas',
    repairHistory: 'Historial de Reparaciones',
    costAnalysis: 'Análisis de Costos',
    timeMetrics: 'Métricas de Tiempo',
    hours: 'horas',
    days: 'días',
    currency: 'PLN',
    noData: 'No hay datos disponibles',
    loading: 'Cargando estadísticas...',
    reportedBy: 'Reportado por',
    repairedBy: 'Reparado por',
    reportTime: 'Hora del Reporte',
    repairTime: 'Hora de Reparación',
    duration: 'Duración',
    status: 'Estado'
  }
};

export default function StatisticsPage() {
  const { i18n } = useTranslation();
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Determine which language to use
  const lang = i18n.language.startsWith('pl') ? 'pl' : 
               i18n.language.startsWith('es') ? 'es' : 'en';
  
  // Get translations for current language
  const text = translations[lang];
  
  // Get date locale for formatting
  const dateLocale = lang === 'pl' ? pl : lang === 'es' ? es : enUS;

  // Fetch issues data
  const { data: issues = [], isLoading: issuesLoading } = useQuery({
    queryKey: ['/api/issues'],
  });

  // Fetch locations data  
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['/api/locations'],
  });

  // Fetch machines data
  const { data: machines = [], isLoading: machinesLoading } = useQuery({
    queryKey: ['/api/machines'],
  });

  // Process and filter data based on selected location
  const filteredIssues = selectedLocation === 'all' 
    ? (issues as any[]) 
    : (issues as any[]).filter((issue: any) => issue.location === selectedLocation);

  // Calculate key metrics
  const calculateMetrics = () => {
    if (!filteredIssues.length) return null;

    const completedIssues = filteredIssues.filter((issue: any) => 
      issue.status === 'completed' && issue.finalCost
    );
    
    const machineIssues = filteredIssues.filter((issue: any) => 
      issue.machineId || issue.inventoryItemId
    );
    
    const facilityIssues = filteredIssues.filter((issue: any) => 
      !issue.machineId && !issue.inventoryItemId
    );

    const totalRepairCosts = completedIssues.reduce((sum: number, issue: any) => 
      sum + parseFloat(issue.finalCost || '0'), 0
    );

    const pendingEstimatedCosts = filteredIssues
      .filter((issue: any) => issue.status !== 'completed' && issue.estimatedCost)
      .reduce((sum: number, issue: any) => sum + parseFloat(issue.estimatedCost || '0'), 0);

    // Calculate average repair time
    const completedWithTime = completedIssues.filter((issue: any) => 
      issue.createdAt && issue.updatedAt
    );
    
    const avgRepairTimeHours = completedWithTime.length > 0 
      ? completedWithTime.reduce((sum: number, issue: any) => {
          const created = new Date(issue.createdAt);
          const completed = new Date(issue.updatedAt);
          const hours = (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }, 0) / completedWithTime.length
      : 0;

    return {
      totalRepairCosts,
      pendingEstimatedCosts,
      avgRepairTimeHours,
      machineIssues: machineIssues.length,
      facilityIssues: facilityIssues.length,
      completedRepairs: completedIssues.length,
      totalIssues: filteredIssues.length
    };
  };

  // Calculate machine investment tracking
  const calculateMachineInvestments = () => {
    if (!machines.length || !filteredIssues.length) return [];

    const machineMap = new Map();
    
    machines.forEach((machine: any) => {
      machineMap.set(machine.id, {
        id: machine.id,
        name: machine.name || `${machine.type} #${machine.id}`,
        type: machine.type,
        totalCost: 0,
        repairCount: 0,
        repairs: []
      });
    });

    filteredIssues.forEach((issue: any) => {
      if ((issue.machineId || issue.inventoryItemId) && issue.finalCost) {
        const machineId = issue.machineId || issue.inventoryItemId;
        if (machineMap.has(machineId)) {
          const machine = machineMap.get(machineId);
          const cost = parseFloat(issue.finalCost);
          machine.totalCost += cost;
          machine.repairCount += 1;
          machine.repairs.push({
            id: issue.id,
            title: issue.title,
            cost,
            date: issue.updatedAt,
            status: issue.status
          });
        }
      }
    });

    return Array.from(machineMap.values())
      .filter(machine => machine.repairCount > 0)
      .sort((a, b) => b.totalCost - a.totalCost);
  };

  // Calculate status counts for the legend
  const calculateStatusCounts = () => {
    if (!filteredIssues.length) return {};
    
    const counts = {
      pending: 0,
      in_progress: 0,
      scheduled: 0,
      urgent: 0,
      completed: 0
    };
    
    filteredIssues.forEach((issue: any) => {
      const status = issue.status;
      if (status in counts) {
        (counts as any)[status]++;
      }
    });
    
    return counts;
  };

  const metrics = calculateMetrics();
  const machineInvestments = calculateMachineInvestments();
  const statusCounts = calculateStatusCounts();
  const isLoading = issuesLoading || locationsLoading || machinesLoading;



  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">{text.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-2 sm:p-4 md:p-8 pt-4 sm:pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{text.title}</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={text.locationFilter} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{text.allLocations}</SelectItem>
              {locations.map((location: any) => (
                <SelectItem key={location.id} value={location.name}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>
      </div>
      <p className="text-muted-foreground">{text.overview}</p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">{text.overviewTab}</TabsTrigger>
          <TabsTrigger value="machines" className="text-xs sm:text-sm">{text.machineAnalysis}</TabsTrigger>
          <TabsTrigger value="details" className="text-xs sm:text-sm">{text.detailedBreakdown}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {metrics ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium truncate">{text.totalCosts}</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold text-black dark:text-white break-words">
                    {metrics.totalRepairCosts.toFixed(2)} {text.currency}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {text.completedRepairs}: {metrics.completedRepairs}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium truncate">{text.avgRepairTime}</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold text-black dark:text-white break-words">
                    {metrics.avgRepairTimeHours < 24 
                      ? `${metrics.avgRepairTimeHours.toFixed(1)} ${text.hours}`
                      : `${(metrics.avgRepairTimeHours / 24).toFixed(1)} ${text.days}`
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {text.completedRepairs}: {metrics.completedRepairs}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium truncate">{text.machineIssues}</CardTitle>
                  <Wrench className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold text-black dark:text-white">{metrics.machineIssues}</div>
                  <p className="text-xs text-muted-foreground">
                    vs {metrics.facilityIssues} {text.facilityIssues.toLowerCase()}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium truncate">{text.pendingCosts}</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold text-black dark:text-white break-words">
                    {metrics.pendingEstimatedCosts.toFixed(2)} {text.currency}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.totalIssues - metrics.completedRepairs} pending
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center p-6">
                <p className="text-muted-foreground">{text.noData}</p>
              </CardContent>
            </Card>
          )}
          
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <LocationStatisticsCard locationName={selectedLocation === 'all' ? 'All Locations' : selectedLocation} />
            <StatusLegendCard countsData={statusCounts} />
          </div>
        </TabsContent>
        
        <TabsContent value="machines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {text.machineInvestment}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {machineInvestments.length > 0 ? (
                <div className="space-y-4">
                  {machineInvestments.map((machine: any) => (
                    <div key={machine.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{machine.name}</h4>
                          <p className="text-sm text-muted-foreground">{machine.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            {machine.totalCost.toFixed(2)} {text.currency}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {machine.repairCount} repairs
                          </p>
                        </div>
                      </div>
                      <Separator className="my-2" />
                      <div className="space-y-2">
                        {machine.repairs.slice(0, 3).map((repair: any) => (
                          <div key={repair.id} className="flex justify-between text-sm">
                            <span className="truncate">{repair.title}</span>
                            <span className="font-medium">
                              {repair.cost.toFixed(2)} {text.currency}
                            </span>
                          </div>
                        ))}
                        {machine.repairs.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{machine.repairs.length - 3} more repairs
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">{text.noData}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                {text.detailedBreakdown}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredIssues.length > 0 ? (
                <div className="space-y-4">
                  {filteredIssues
                    .filter((issue: any) => issue.status === 'completed' && issue.finalCost)
                    .sort((a: any, b: any) => parseFloat(b.finalCost) - parseFloat(a.finalCost))
                    .slice(0, 10)
                    .map((issue: any) => {
                      const reportTime = issue.createdAt ? new Date(issue.createdAt) : null;
                      const repairTime = issue.updatedAt ? new Date(issue.updatedAt) : null;
                      let duration = '';
                      
                      if (reportTime && repairTime) {
                        const diffHours = (repairTime.getTime() - reportTime.getTime()) / (1000 * 60 * 60);
                        if (diffHours < 24) {
                          duration = `${diffHours.toFixed(1)} ${text.hours}`;
                        } else {
                          duration = `${(diffHours / 24).toFixed(1)} ${text.days}`;
                        }
                      }

                      return (
                        <div key={issue.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {issue.machineId || issue.inventoryItemId ? (
                                <Wrench className="h-4 w-4 text-blue-500" />
                              ) : (
                                <Building className="h-4 w-4 text-gray-500" />
                              )}
                              <span className="font-medium text-lg">{issue.title}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-xl text-green-600">
                                {parseFloat(issue.finalCost).toFixed(2)} {text.currency}
                              </span>
                              <Badge variant="secondary" className="ml-2">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {text.status}: {issue.status}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                            <div className="space-y-1">
                              <p className="font-medium text-muted-foreground">{text.reportTime}:</p>
                              <p className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {reportTime ? format(reportTime, 'MMM d, yyyy HH:mm', { locale: dateLocale }) : 'N/A'}
                              </p>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="font-medium text-muted-foreground">{text.repairTime}:</p>
                              <p className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                {repairTime ? format(repairTime, 'MMM d, yyyy HH:mm', { locale: dateLocale }) : 'N/A'}
                              </p>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="font-medium text-muted-foreground">{text.duration}:</p>
                              <p className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {duration || 'N/A'}
                              </p>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="font-medium text-muted-foreground">{text.reportedBy}:</p>
                              <p className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {issue.reportedByName || 'Unknown'}
                              </p>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                <strong>Location:</strong> {issue.location}
                              </span>
                              {issue.machineName && (
                                <span className="flex items-center gap-1">
                                  <Wrench className="h-3 w-3" />
                                  <strong>Machine:</strong> {issue.machineName}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <span><strong>{text.repairedBy}:</strong> {issue.fixedByName || issue.repairedByName || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">{text.noData}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}