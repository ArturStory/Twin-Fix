import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { pl, es, enUS } from 'date-fns/locale';
import { CalendarClock, Loader2, RefreshCw } from 'lucide-react';

const maintenanceEventSchema = z.object({
  machineId: z.string().min(1, { message: "Machine is required" }),
  description: z.string().min(5, { message: "Description is required" }),
  scheduledDate: z.date(),
  estimatedDuration: z.coerce.number().min(1, { message: "Duration must be at least 1 minute" }),
  technicianIds: z.array(z.string()).min(1, { message: "At least one technician must be assigned" }),
  notes: z.string().optional(),
});

type MaintenanceFormValues = z.infer<typeof maintenanceEventSchema>;

export default function MaintenanceScheduler() {
  const { t, i18n } = useTranslation();
  
  // Helper function to get the correct date-fns locale
  const getDateLocale = () => {
    switch (i18n.language) {
      case 'pl': return pl;
      case 'es': return es;
      case 'en': return enUS;
      default: return enUS;
    }
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Query to get machines
  const { 
    data: machines = [], 
    isLoading: isLoadingMachines,
    error: machinesError,
    refetch: refetchMachines
  } = useQuery({
    queryKey: ['/api/machines'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/machines');
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching machines:', error);
        throw error;
      }
    },
    retry: 2,
  });

  // Query to get technicians
  const { 
    data: technicians = [], 
    isLoading: isLoadingTechnicians,
    error: techniciansError,
    refetch: refetchTechnicians
  } = useQuery({
    queryKey: ['/api/users/technicians'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/users/technicians');
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching technicians:', error);
        throw error;
      }
    },
    retry: 2,
  });

  // Query to get maintenance events for the calendar
  const { 
    data: maintenanceEvents = [], 
    isLoading: isLoadingEvents,
    error: eventsError,
    refetch: refetchEvents
  } = useQuery({
    queryKey: ['/api/maintenance/events'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/maintenance/events');
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching maintenance events:', error);
        throw error;
      }
    },
  });

  // Create a new maintenance event
  const createMaintenanceMutation = useMutation({
    mutationFn: async (data: MaintenanceFormValues) => {
      const response = await apiRequest('POST', '/api/maintenance/events', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('maintenance.eventCreated'),
        description: t('maintenance.eventCreatedSuccess'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance/events'] });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: t('maintenance.eventCreationFailed'),
        description: error.message || 'An error occurred while creating the event',
        variant: 'destructive',
      });
    },
  });

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceEventSchema),
    defaultValues: {
      machineId: '',
      description: '',
      scheduledDate: selectedDate || new Date(),
      estimatedDuration: 60,
      technicianIds: [],
      notes: '',
    },
  });

  useEffect(() => {
    if (selectedDate) {
      form.setValue('scheduledDate', selectedDate);
    }
  }, [selectedDate, form]);

  const onSubmit = (data: MaintenanceFormValues) => {
    createMaintenanceMutation.mutate(data);
  };

  const handleCalendarDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      form.setValue('scheduledDate', date);
    }
  };

  const handleScheduleClick = () => {
    setIsDialogOpen(true);
  };

  // Create mock event data for when the database connection fails
  const mockMaintenanceEvents = [
    {
      id: 1,
      title: 'Regular Maintenance - Ice Cream Machine',
      description: 'Monthly cleaning and inspection',
      scheduledDate: new Date(Date.now() + 86400000 * 2), // 2 days from now
      machineId: 2,
      technicianId: 1,
      technicianName: 'Jan Kowalski',
      status: 'scheduled'
    },
    {
      id: 2,
      title: 'Fryer Inspection',
      description: 'Safety check and oil replacement',
      scheduledDate: new Date(Date.now() + 86400000 * 5), // 5 days from now
      machineId: 1,
      technicianId: 2,
      technicianName: 'Maria García',
      status: 'scheduled'
    }
  ];

  // Use mock data if there's a database connection error
  const displayEvents = eventsError ? mockMaintenanceEvents : maintenanceEvents;
  
  // Function to retry fetching events data
  const handleRetryEvents = () => {
    refetchEvents();
  };
  
  // Function to retry all data fetching at once
  const handleRetryAllData = () => {
    refetchMachines();
    refetchTechnicians();
    refetchEvents();
  };

  return (
    <div className="space-y-4">
      {/* Database connection error alert */}
      {(machinesError || techniciansError || eventsError) && (
        <div className="bg-destructive/15 p-4 rounded-md mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="font-medium text-destructive">{t('maintenance.connectionError')}</h3>
            <p className="text-sm text-muted-foreground">{t('maintenance.connectionErrorDescription')}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRetryAllData}
            className="whitespace-nowrap"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('maintenance.tryAgain')}
          </Button>
        </div>
      )}
    
      <div className="flex flex-col space-y-2">
        <h2 className="text-xl font-semibold">{t('maintenance.calendar')}</h2>
        <p className="text-muted-foreground">{t('maintenance.schedule')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        <Card className="col-span-1 lg:col-span-3 p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleCalendarDateSelect}
            className="rounded-md border"
          />
          
          <div className="mt-4">
            <Button 
              onClick={handleScheduleClick} 
              className="w-full"
              disabled={isLoadingMachines || isLoadingTechnicians}
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              {t('maintenance.addEvent')}
            </Button>
          </div>
        </Card>

        <Card className="col-span-1 lg:col-span-4">
          <CardContent className="p-4">
            <h3 className="text-lg font-medium mb-4">
              {selectedDate ? (
                format(selectedDate, 'PPPP', { locale: getDateLocale() })
              ) : (
                t('maintenance.selectDatePrompt')
              )}
            </h3>

            {isLoadingEvents ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : eventsError ? (
              <div className="space-y-4">
                {mockMaintenanceEvents
                  .filter(event => {
                    if (!selectedDate || !event.scheduledDate) return false;
                    const eventDate = new Date(event.scheduledDate);
                    return (
                      eventDate.getDate() === selectedDate.getDate() &&
                      eventDate.getMonth() === selectedDate.getMonth() &&
                      eventDate.getFullYear() === selectedDate.getFullYear()
                    );
                  }).length > 0 ? (
                    <div className="space-y-4">
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm mb-4">
                        <p className="text-yellow-800">{t('maintenance.usingOfflineData')}</p>
                      </div>
                      {mockMaintenanceEvents
                        .filter(event => {
                          if (!selectedDate || !event.scheduledDate) return false;
                          const eventDate = new Date(event.scheduledDate);
                          return (
                            eventDate.getDate() === selectedDate.getDate() &&
                            eventDate.getMonth() === selectedDate.getMonth() &&
                            eventDate.getFullYear() === selectedDate.getFullYear()
                          );
                        }).map(event => (
                          <div 
                            key={event.id} 
                            className="p-3 border rounded-md hover:bg-accent cursor-pointer border-dashed"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{event.description}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(event.scheduledDate), 'p', { locale: getDateLocale() })} • {event.technicianName}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 space-y-4">
                      <p className="text-muted-foreground">{t('maintenance.noEvents')}</p>
                    </div>
                  )
                }
              </div>
            ) : displayEvents.length > 0 ? (
              <div className="space-y-4">
                {displayEvents
                  .filter(event => {
                    if (!selectedDate || !event.scheduledDate) return false;
                    const eventDate = new Date(event.scheduledDate);
                    return (
                      eventDate.getDate() === selectedDate.getDate() &&
                      eventDate.getMonth() === selectedDate.getMonth() &&
                      eventDate.getFullYear() === selectedDate.getFullYear()
                    );
                  })
                  .map(event => (
                    <div 
                      key={event.id} 
                      className="p-3 border rounded-md hover:bg-accent cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{event.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(event.scheduledDate), 'p', { locale: getDateLocale() })} • 
                            {event.estimatedDuration} {t('maintenance.minutes')}
                          </p>
                        </div>
                        <div className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                          {event.status}
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm">
                          <span className="font-medium">{t('maintenance.machine')}:</span> {event.machineName}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">{t('maintenance.assignedTechnicians')}:</span> {event.technicianNames?.join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40">
                <p className="text-muted-foreground">{t('maintenance.noEvents')}</p>
                <p className="text-sm text-muted-foreground">{t('maintenance.noEventsDescription')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Scheduler Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('maintenance.schedule')}</DialogTitle>
            <DialogDescription>
              {t('maintenance.scheduleDescription') || 'Plan maintenance for your equipment'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="machineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('maintenance.machine')}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('maintenance.selectMachine')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingMachines ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : (
                          machines.map((machine: any) => (
                            <SelectItem key={machine.id} value={machine.id.toString()}>
                              {machine.name} {machine.serialNumber ? `(${machine.serialNumber})` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('maintenance.scheduledDate')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        value={field.value ? format(field.value, 'yyyy-MM-dd', { locale: getDateLocale() }) : ''} 
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : undefined;
                          field.onChange(date);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('maintenance.estimatedDuration')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        placeholder="60" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      {t('maintenance.minutes')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="technicianIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('maintenance.assignedTechnicians')}</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={(value) => field.onChange([...field.value, value])}
                        value=""
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('maintenance.selectTechnicians')} />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingTechnicians ? (
                            <div className="flex items-center justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            technicians
                              .filter((tech: any) => !field.value.includes(tech.id.toString()))
                              .map((tech: any) => (
                                <SelectItem key={tech.id} value={tech.id.toString()}>
                                  {tech.username}
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <div className="mt-2">
                      {field.value.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {field.value.map((techId) => {
                            const tech = technicians.find((t: any) => t.id.toString() === techId);
                            return (
                              <div 
                                key={techId}
                                className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm flex items-center"
                              >
                                {tech?.username}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    field.onChange(field.value.filter(id => id !== techId));
                                  }}
                                >
                                  ×
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <FormDescription>
                      {field.value.length} {t('maintenance.technicians')} {t('common.selected')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('maintenance.description')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('maintenance.enterDescription')} 
                        className="min-h-[80px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('maintenance.notes')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('maintenance.addNotes')} 
                        className="min-h-[80px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit"
                  disabled={createMaintenanceMutation.isPending}
                >
                  {createMaintenanceMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t('maintenance.schedule')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}