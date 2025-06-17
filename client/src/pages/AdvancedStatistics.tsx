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

interface ExtendedStatistics {
  totalIssues: number;
  openIssues: number;
  resolvedIssues: number;
  totalCost: number;
  estimatedCost: number;
  avgRepairTimeHours: number;
  machineIssuesCount: number;
  otherIssuesCount: number;
  machineStats: Array<{
    machineId: number;
    totalCost: number;
    repairCount: number;
    issues: any[];
  }>;
  locationStats: Array<{
    location: string;
    totalIssues: number;
    totalCost: number;
    machineIssues: number;
    otherIssues: number;
  }>;
  selectedLocation: string | null;
}

interface DetailedStatistics {
  location: string;
  machineIssues: any[];
  otherIssues: any[];
  machineGroups: Array<{
    machineId: number;
    machineName: string;
    machineType: string;
    totalCost: number;
    totalRepairs: number;
    avgRepairTime: number;
    issues: any[];
  }>;
  summary: {
    totalMachineIssues: number;
    totalOtherIssues: number;
    totalMachineCost: number;
    totalOtherCost: number;
  };
}

export default function AdvancedStatistics() {
  const { i18n } = useTranslation();
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'pl': return pl;
      case 'es': return es;
      case 'en': 
      default: return enUS;
    }
  };

  const getLabel = (en: string, pl: string, es: string) => {
    switch (i18n.language) {
      case 'pl': return pl;
      case 'es': return es;
      case 'en':
      default: return en;
    }
  };

  // Fetch locations for the filter
  const { data: locations = [] } = useQuery({
    queryKey: ['/api/shared-locations'],
  });

  // Fetch enhanced statistics
  const { data: stats, isLoading: statsLoading } = useQuery<ExtendedStatistics>({
    queryKey: ['/api/statistics', selectedLocation],
    queryFn: async () => {
      const url = selectedLocation ? 
        `/api/statistics?location=${encodeURIComponent(selectedLocation)}` : 
        '/api/statistics';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch statistics');
      return response.json();
    },
  });

  // Fetch detailed breakdown
  const { data: detailed, isLoading: detailedLoading } = useQuery<DetailedStatistics>({
    queryKey: ['/api/statistics/detailed', selectedLocation],
    queryFn: async () => {
      const url = selectedLocation ? 
        `/api/statistics/detailed?location=${encodeURIComponent(selectedLocation)}` : 
        '/api/statistics/detailed';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch detailed statistics');
      return response.json();
    },
    enabled: activeTab === 'detailed',
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
    return `${Math.round(hours / 24 * 10) / 10} ${getLabel('days', 'dni', 'días')}`;
  };

  if (statsLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {getLabel('Loading statistics...', 'Ładowanie statystyk...', 'Cargando estadísticas...')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {getLabel('Advanced Statistics', 'Zaawansowane Statystyki', 'Estadísticas Avanzadas')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {getLabel(
              'Comprehensive analysis of maintenance costs and repair times',
              'Kompleksowa analiza kosztów konserwacji i czasów napraw',
              'Análisis integral de costos de mantenimiento y tiempos de reparación'
            )}
          </p>
        </div>

        {/* Location Filter */}
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder={getLabel('All Locations', 'Wszystkie Lokalizacje', 'Todas las Ubicaciones')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">
                {getLabel('All Locations', 'Wszystkie Lokalizacje', 'Todas las Ubicaciones')}
              </SelectItem>
              {locations.map((location: any) => (
                <SelectItem key={location.id} value={location.name}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Location Indicator */}
      {selectedLocation && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-600" />
              <span className="text-blue-800 font-medium">
                {getLabel('Viewing statistics for:', 'Wyświetlanie statystyk dla:', 'Viendo estadísticas para:')} {selectedLocation}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            {getLabel('Overview', 'Przegląd', 'Resumen')}
          </TabsTrigger>
          <TabsTrigger value="machines">
            {getLabel('Analysis', 'Analiza', 'Análisis')}
          </TabsTrigger>
          <TabsTrigger value="detailed">
            {getLabel('Breakdown', 'Podział', 'Desglose')}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {getLabel('Total Issues', 'Wszystkie Zgłoszenia', 'Total de Problemas')}
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalIssues || 0}</div>
                <div className="text-xs text-muted-foreground">
                  {stats?.openIssues || 0} {getLabel('open', 'otwarte', 'abiertos')} · {stats?.resolvedIssues || 0} {getLabel('resolved', 'rozwiązane', 'resueltos')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {getLabel('Total Repair Cost', 'Całkowity Koszt Napraw', 'Costo Total de Reparación')}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats?.totalCost || 0)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(stats?.estimatedCost || 0)} {getLabel('estimated pending', 'szacowane oczekujące', 'estimado pendiente')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {getLabel('Avg Repair Time', 'Średni Czas Naprawy', 'Tiempo Promedio de Reparación')}
                </CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.avgRepairTimeHours ? formatTime(stats.avgRepairTimeHours) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {getLabel('From report to completion', 'Od zgłoszenia do ukończenia', 'Desde reporte hasta finalización')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {getLabel('Machine vs Other', 'Maszyny vs Inne', 'Máquinas vs Otros')}
                </CardTitle>
                <Wrench className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.machineIssuesCount || 0} / {stats?.otherIssuesCount || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {getLabel('Machine issues / Other issues', 'Problemy z maszynami / Inne problemy', 'Problemas de máquinas / Otros problemas')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Location Breakdown */}
          {!selectedLocation && stats?.locationStats && stats.locationStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  {getLabel('Cost by Location', 'Koszty według Lokalizacji', 'Costos por Ubicación')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.locationStats
                    .sort((a, b) => b.totalCost - a.totalCost)
                    .map((location, index) => (
                    <div key={location.location} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{location.location}</div>
                          <div className="text-sm text-gray-500">
                            {location.totalIssues} {getLabel('issues', 'zgłoszeń', 'problemas')} · 
                            {location.machineIssues} {getLabel('machine', 'maszyny', 'máquinas')} · 
                            {location.otherIssues} {getLabel('other', 'inne', 'otros')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(location.totalCost)}</div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedLocation(location.location)}
                        >
                          {getLabel('View Details', 'Zobacz Szczegóły', 'Ver Detalles')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Machine Analysis Tab */}
        <TabsContent value="machines" className="space-y-6">
          {stats?.machineStats && stats.machineStats.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  {getLabel('Machine Repair Costs', 'Koszty Napraw Maszyn', 'Costos de Reparación de Máquinas')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.machineStats
                    .sort((a, b) => b.totalCost - a.totalCost)
                    .map((machine, index) => (
                    <div key={machine.machineId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-red-100 text-red-700' :
                          index === 1 ? 'bg-orange-100 text-orange-700' :
                          index === 2 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">
                            {getLabel('Machine', 'Maszyna', 'Máquina')} #{machine.machineId}
                          </div>
                          <div className="text-sm text-gray-500">
                            {machine.repairCount} {getLabel('repairs', 'napraw', 'reparaciones')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{formatCurrency(machine.totalCost)}</div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(machine.totalCost / machine.repairCount)} {getLabel('per repair', 'za naprawę', 'por reparación')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {getLabel('No machine data available for this location', 'Brak danych o maszynach dla tej lokalizacji', 'No hay datos de máquinas disponibles para esta ubicación')}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Detailed Breakdown Tab */}
        <TabsContent value="detailed" className="space-y-6">
          {detailedLoading ? (
            <div className="text-center py-8">
              <p>{getLabel('Loading detailed breakdown...', 'Ładowanie szczegółowego podziału...', 'Cargando desglose detallado...')}</p>
            </div>
          ) : detailed ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-blue-600" />
                      {getLabel('Machine Issues', 'Problemy z Maszynami', 'Problemas de Máquinas')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{detailed.summary.totalMachineIssues}</div>
                    <div className="text-sm text-gray-500">
                      {getLabel('Total cost:', 'Całkowity koszt:', 'Costo total:')} {formatCurrency(detailed.summary.totalMachineCost)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-green-600" />
                      {getLabel('Other Issues', 'Inne Problemy', 'Otros Problemas')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{detailed.summary.totalOtherIssues}</div>
                    <div className="text-sm text-gray-500">
                      {getLabel('Total cost:', 'Całkowity koszt:', 'Costo total:')} {formatCurrency(detailed.summary.totalOtherCost)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Machine Groups */}
              {detailed.machineGroups.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {getLabel('Machine Investment Summary', 'Podsumowanie Inwestycji w Maszyny', 'Resumen de Inversión en Máquinas')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {detailed.machineGroups.map((group) => (
                        <div key={`${group.machineId}-${group.machineName}`} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="font-semibold">{group.machineName}</h3>
                              <p className="text-sm text-gray-500">{group.machineType}</p>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg">{formatCurrency(group.totalCost)}</div>
                              <div className="text-sm text-gray-500">
                                {group.totalRepairs} {getLabel('repairs', 'napraw', 'reparaciones')}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">
                                {getLabel('Avg cost per repair:', 'Śr. koszt za naprawę:', 'Costo promedio por reparación:')}
                              </span>
                              <div className="font-medium">
                                {formatCurrency(group.totalCost / group.totalRepairs)}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">
                                {getLabel('Avg repair time:', 'Śr. czas naprawy:', 'Tiempo promedio de reparación:')}
                              </span>
                              <div className="font-medium">
                                {group.avgRepairTime > 0 ? formatTime(group.avgRepairTime) : 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}