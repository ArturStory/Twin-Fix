import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Wrench, Calendar, Clock, AlertTriangle, Check, Loader2 } from 'lucide-react';
import MaintenanceScheduler from '@/components/maintenance/MaintenanceScheduler';

export default function MaintenancePlanner() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('scheduler');
  
  // Query to get machines due for service
  const { 
    data: servicedueMachines = [], 
    isLoading: isLoadingServiceDue 
  } = useQuery({
    queryKey: ['/api/maintenance/machines/service-due'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/maintenance/machines/service-due');
        return await response.json();
      } catch (error) {
        console.error('Error fetching machines due for service:', error);
        return [];
      }
    },
  });

  // Query to get upcoming maintenance events
  const { 
    data: upcomingEvents = [], 
    isLoading: isLoadingUpcoming 
  } = useQuery({
    queryKey: ['/api/maintenance/events/upcoming'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/maintenance/events/upcoming');
        return await response.json();
      } catch (error) {
        console.error('Error fetching upcoming maintenance events:', error);
        return [];
      }
    },
  });
  
  const handleScheduleClick = (tab: string) => {
    setActiveTab(tab);
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col space-y-2 mb-8">
        <h1 className="text-3xl font-bold">{t('maintenance.maintenancePlanner')}</h1>
        <p className="text-muted-foreground">{t('maintenance.plannerDescription')}</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="scheduler" className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">{t('maintenance.scheduled')}</span>
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center">
            <Wrench className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">{t('maintenance.upcoming')}</span>
          </TabsTrigger>
          <TabsTrigger value="service-due" className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">{t('maintenance.service')}</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="scheduler" className="space-y-8">
          <MaintenanceScheduler />
        </TabsContent>
        
        <TabsContent value="upcoming" className="space-y-8">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col space-y-1.5 p-6">
              <h3 className="text-xl font-semibold leading-none tracking-tight">
                {t('maintenance.upcoming')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('maintenance.upcomingDescription')}
              </p>
            </div>
            <div className="p-6">
              {isLoadingUpcoming ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.map((event: any) => (
                    <div key={event.id} className="flex flex-col p-4 rounded-md border">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{event.description}</h4>
                          <p className="text-sm text-muted-foreground">
                            {event.machineSerialNumber && <span className="font-medium mr-1">{event.machineSerialNumber}</span>}
                            {event.machineName}
                          </p>
                        </div>
                        <div className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                          {new Date(event.scheduledDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="grid grid-cols-2 gap-2">
                          <p className="text-sm">
                            <span className="font-medium">{t('maintenance.location')}:</span> {event.machineLocation || t('common.unknown')}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">{t('maintenance.estimatedDuration')}:</span> {event.estimatedDuration} {t('maintenance.minutes')}
                          </p>
                        </div>
                        <p className="text-sm mt-1">
                          <span className="font-medium">{t('maintenance.assignedTechnicians')}:</span> {event.technicianName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Check className="mb-2 h-10 w-10 text-green-500" />
                  <p className="text-lg font-medium">{t('maintenance.noUpcomingEvents')}</p>
                  <p className="text-sm text-muted-foreground">{t('maintenance.allMaintenanceCompleted')}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="service-due" className="space-y-8">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col space-y-1.5 p-6">
              <h3 className="text-xl font-semibold leading-none tracking-tight">
                {t('maintenance.service')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('maintenance.serviceDueDescription')}
              </p>
            </div>
            <div className="p-6">
              {isLoadingServiceDue ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : servicedueMachines.length > 0 ? (
                <div className="space-y-4">
                  {servicedueMachines.map((machine: any) => (
                    <div key={machine.id} className="flex flex-col p-4 rounded-md border">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{machine.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {machine.serialNumber && <span className="font-medium mr-1">{machine.serialNumber}</span>}
                            {machine.location}
                          </p>
                        </div>
                        <div className={`px-2 py-1 text-xs rounded-full ${machine.daysUntilService <= 0 
                          ? 'bg-red-100 text-red-700'
                          : machine.daysUntilService <= 7 
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'}`}>
                          {machine.daysUntilService <= 0 
                            ? t('maintenance.overdue')
                            : machine.daysUntilService === 1
                              ? t('maintenance.dueInOneDay')
                              : t('maintenance.dueInDays', { days: machine.daysUntilService })}
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <p className="text-sm">
                            <span className="font-medium">{t('maintenance.manufacturer')}:</span> {machine.manufacturer || t('common.unknown')}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">{t('maintenance.model')}:</span> {machine.model || t('common.unknown')}
                          </p>
                        </div>
                        <p className="text-sm">
                          <span className="font-medium">{t('maintenance.lastService')}:</span> {machine.lastServiceDate ? new Date(machine.lastServiceDate).toLocaleDateString() : t('maintenance.never')}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">{t('maintenance.nextService')}:</span> {machine.nextServiceDate ? new Date(machine.nextServiceDate).toLocaleDateString() : t('maintenance.unknown')}
                        </p>
                      </div>
                      <div className="mt-4">
                        <Button 
                          size="sm"
                          onClick={() => {
                            setActiveTab('scheduler');
                            // Ideally pre-select this machine in the scheduler
                          }}
                        >
                          {t('maintenance.scheduleService')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Check className="mb-2 h-10 w-10 text-green-500" />
                  <p className="text-lg font-medium">{t('maintenance.noMachinesDue')}</p>
                  <p className="text-sm text-muted-foreground">{t('maintenance.allMachinesServiced')}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}