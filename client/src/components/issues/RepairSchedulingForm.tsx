import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RepairScheduleStatus } from '@shared/schema';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, CheckCircle, Clock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

// Validation schema for repair scheduling form
const repairScheduleSchema = z.object({
  scheduledDate: z.date({
    required_error: 'Please select a date for the repair',
  }),
  scheduleStatus: z.enum([
    RepairScheduleStatus.PROPOSED,
    RepairScheduleStatus.CONFIRMED,
    RepairScheduleStatus.RESCHEDULED,
    RepairScheduleStatus.COMPLETED,
    RepairScheduleStatus.CANCELLED
  ], {
    required_error: 'Please select a status',
  }),
  notes: z.string().optional(),
  finalCost: z.number().optional(),
});

type RepairScheduleFormValues = z.infer<typeof repairScheduleSchema>;

interface RepairSchedulingFormProps {
  issueId: number;
  existingSchedule?: {
    scheduledDate?: Date | null;
    scheduleStatus?: string | null;
    finalCost?: number | null;
  };
  showCompletionOptions?: boolean;
  isRepairTeam?: boolean;
  onSuccessfulSubmit?: () => void;
}

export default function RepairSchedulingForm({
  issueId,
  existingSchedule,
  showCompletionOptions = false,
  isRepairTeam = false,
  onSuccessfulSubmit
}: RepairSchedulingFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default values based on existing schedule or defaults
  const defaultValues: Partial<RepairScheduleFormValues> = {
    scheduledDate: existingSchedule?.scheduledDate || new Date(),
    scheduleStatus: (existingSchedule?.scheduleStatus as RepairScheduleStatus) || RepairScheduleStatus.PROPOSED,
    notes: '',
    finalCost: existingSchedule?.finalCost || undefined,
  };

  const form = useForm<RepairScheduleFormValues>({
    resolver: zodResolver(repairScheduleSchema),
    defaultValues,
  });

  // Watch the schedule status to conditionally show fields
  const watchStatus = form.watch('scheduleStatus');
  const isCompleted = watchStatus === RepairScheduleStatus.COMPLETED;

  async function onSubmit(data: RepairScheduleFormValues) {
    setIsSubmitting(true);
    
    try {
      let apiEndpoint = '/api/issues/schedule';
      
      if (isCompleted) {
        apiEndpoint = '/api/issues/complete-repair';
      } else if (existingSchedule?.scheduleStatus) {
        apiEndpoint = '/api/issues/update-schedule';
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issueId,
          ...data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to schedule repair');
      }

      // Show success notification
      toast({
        title: isCompleted
          ? t('repair.completedSuccess')
          : existingSchedule?.scheduleStatus
            ? t('repair.updatedSuccess')
            : t('repair.scheduledSuccess'),
        description: t('repair.scheduleSaved'),
      });

      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/issues', issueId] });

      // Call onSuccessfulSubmit if provided
      if (onSuccessfulSubmit) {
        onSuccessfulSubmit();
      }
    } catch (error) {
      console.error('Error scheduling repair:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('repair.scheduleFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>
          {isCompleted
            ? t('repair.completeRepair')
            : existingSchedule?.scheduleStatus
              ? t('repair.updateSchedule')
              : t('repair.scheduleRepair')}
        </CardTitle>
        <CardDescription>
          {isRepairTeam 
            ? t('repair.confirmOrReschedule') 
            : t('repair.selectPreferredDate')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('repair.date')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>{t('repair.pickDate')}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()} // Disable past dates
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    {t('repair.dateDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isRepairTeam && (
              <FormField
                control={form.control}
                name="scheduleStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('repair.status')}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('repair.selectStatus')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={RepairScheduleStatus.PROPOSED}>
                          {t('repair.status.proposed')}
                        </SelectItem>
                        <SelectItem value={RepairScheduleStatus.CONFIRMED}>
                          {t('repair.status.confirmed')}
                        </SelectItem>
                        <SelectItem value={RepairScheduleStatus.RESCHEDULED}>
                          {t('repair.status.rescheduled')}
                        </SelectItem>
                        {showCompletionOptions && (
                          <SelectItem value={RepairScheduleStatus.COMPLETED}>
                            {t('repair.status.completed')}
                          </SelectItem>
                        )}
                        <SelectItem value={RepairScheduleStatus.CANCELLED}>
                          {t('repair.status.cancelled')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t('repair.statusDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('repair.notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('repair.notesPlaceholder')}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('repair.notesDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isCompleted && (
              <FormField
                control={form.control}
                name="finalCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('repair.finalCost')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={field.value || ''}
                        onChange={e => {
                          const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('repair.finalCostDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Clock className="mr-2 h-4 w-4 animate-spin" />
              ) : isCompleted ? (
                <CheckCircle className="mr-2 h-4 w-4" />
              ) : null}
              {isCompleted
                ? t('repair.markAsCompleted')
                : existingSchedule?.scheduleStatus
                  ? t('repair.updateSchedule')
                  : t('repair.scheduleRepair')}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        {isRepairTeam && existingSchedule?.scheduleStatus && (
          <div className="text-sm text-muted-foreground">
            {t('repair.currentStatus')}: {existingSchedule.scheduleStatus}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}