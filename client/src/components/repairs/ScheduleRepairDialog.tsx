import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar, Clock, User, AlertTriangle, Check, CalendarDays } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const scheduleRepairSchema = z.object({
  scheduledDate: z.string().min(1, "Scheduled date is required"),
  scheduledTime: z.string().min(1, "Scheduled time is required"),
  technicianId: z.string().min(1, "Technician assignment is required"),
  estimatedDuration: z.string().min(1, "Estimated duration is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  notes: z.string().optional(),
  partsNeeded: z.string().optional(),
  estimatedCost: z.string().optional(),
});

type ScheduleRepairFormData = z.infer<typeof scheduleRepairSchema>;

interface ScheduleRepairDialogProps {
  issueId: number;
  issueTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ScheduleRepairDialog({
  issueId,
  issueTitle,
  isOpen,
  onClose,
}: ScheduleRepairDialogProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get translation with fallback
  const getLabel = (key: string, english: string, polish: string, spanish: string) => {
    const translation = t(key);
    if (translation === key || translation.includes(key)) {
      if (i18n.language === 'pl') return polish;
      if (i18n.language === 'es') return spanish;
      return english;
    }
    return translation;
  };

  const form = useForm<ScheduleRepairFormData>({
    resolver: zodResolver(scheduleRepairSchema),
    defaultValues: {
      scheduledDate: "",
      scheduledTime: "",
      technicianId: "",
      estimatedDuration: "60",
      priority: "medium",
      notes: "",
      partsNeeded: "",
      estimatedCost: "",
    },
  });

  // Fetch available technicians
  const { data: technicians = [] } = useQuery({
    queryKey: ["/api/users/technicians"],
    enabled: isOpen,
  });

  // Type the technicians array
  const techniciansList = technicians as Array<{ id: number; username: string; role: string }>;

  const scheduleRepairMutation = useMutation({
    mutationFn: async (data: ScheduleRepairFormData) => {
      const requestBody = {
        ...data,
        scheduledDateTime: `${data.scheduledDate}T${data.scheduledTime}`,
        estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : null,
      };
      
      const response = await fetch(`/api/issues/${issueId}/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to schedule repair: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      queryClient.invalidateQueries({ queryKey: [`/api/issues/${issueId}`] });
      
      toast({
        title: getLabel('repairs.scheduled', 'Repair Scheduled', 'Naprawa Zaplanowana', 'Reparación Programada'),
        description: getLabel('repairs.scheduledSuccess', 'The repair has been successfully scheduled', 'Naprawa została pomyślnie zaplanowana', 'La reparación ha sido programada exitosamente'),
      });
      
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: getLabel('common.error', 'Error', 'Błąd', 'Error'),
        description: error.message || getLabel('repairs.scheduleError', 'Failed to schedule repair', 'Nie udało się zaplanować naprawy', 'Error al programar la reparación'),
      });
    },
  });

  const onSubmit = async (data: ScheduleRepairFormData) => {
    setIsSubmitting(true);
    try {
      await scheduleRepairMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate time slots for selection
  const timeSlots: string[] = [];
  for (let hour = 8; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(timeString);
    }
  }

  // Get minimum date (today)
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {getLabel('repairs.scheduleTitle', 'Schedule Repair', 'Zaplanuj Naprawę', 'Programar Reparación')}
          </DialogTitle>
          <DialogDescription>
            {getLabel('repairs.scheduleDescription', 'Schedule a repair for issue:', 'Zaplanuj naprawę dla problemu:', 'Programar una reparación para el problema:')} <strong>"{issueTitle}"</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Scheduled Date */}
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {getLabel('repairs.date', 'Date', 'Data', 'Fecha')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={today}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Scheduled Time */}
              <FormField
                control={form.control}
                name="scheduledTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {getLabel('repairs.time', 'Time', 'Czas', 'Hora')}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={getLabel('repairs.selectTime', 'Select time', 'Wybierz czas', 'Seleccionar hora')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Technician Assignment */}
              <FormField
                control={form.control}
                name="technicianId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {getLabel('repairs.technician', 'Technician', 'Technik', 'Técnico')}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={getLabel('repairs.selectTechnician', 'Select technician', 'Wybierz technika', 'Seleccionar técnico')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {techniciansList.map((tech) => (
                          <SelectItem key={tech.id} value={tech.id.toString()}>
                            {tech.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estimated Duration */}
              <FormField
                control={form.control}
                name="estimatedDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getLabel('repairs.duration', 'Duration (minutes)', 'Czas trwania (minuty)', 'Duración (minutos)')}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="30">30 {getLabel('common.minutes', 'minutes', 'minut', 'minutos')}</SelectItem>
                        <SelectItem value="60">1 {getLabel('common.hour', 'hour', 'godzina', 'hora')}</SelectItem>
                        <SelectItem value="90">1.5 {getLabel('common.hours', 'hours', 'godziny', 'horas')}</SelectItem>
                        <SelectItem value="120">2 {getLabel('common.hours', 'hours', 'godziny', 'horas')}</SelectItem>
                        <SelectItem value="180">3 {getLabel('common.hours', 'hours', 'godziny', 'horas')}</SelectItem>
                        <SelectItem value="240">4 {getLabel('common.hours', 'hours', 'godziny', 'horas')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {getLabel('common.priority', 'Priority', 'Priorytet', 'Prioridad')}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">{getLabel('priority.low', 'Low', 'Niski', 'Bajo')}</SelectItem>
                        <SelectItem value="medium">{getLabel('priority.medium', 'Medium', 'Średni', 'Medio')}</SelectItem>
                        <SelectItem value="high">{getLabel('priority.high', 'High', 'Wysoki', 'Alto')}</SelectItem>
                        <SelectItem value="urgent">{getLabel('priority.urgent', 'Urgent', 'Pilny', 'Urgente')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estimated Cost */}
              <FormField
                control={form.control}
                name="estimatedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getLabel('repairs.estimatedCost', 'Estimated Cost ($)', 'Szacowany Koszt ($)', 'Costo Estimado ($)')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {getLabel('repairs.costOptional', 'Optional - estimated repair cost', 'Opcjonalne - szacowany koszt naprawy', 'Opcional - costo estimado de reparación')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Parts Needed */}
            <FormField
              control={form.control}
              name="partsNeeded"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getLabel('repairs.partsNeeded', 'Parts Needed', 'Potrzebne Części', 'Partes Necesarias')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={getLabel('repairs.partsPlaceholder', 'List any parts or materials needed for the repair...', 'Wymień części lub materiały potrzebne do naprawy...', 'Lista las partes o materiales necesarios para la reparación...')}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getLabel('repairs.notes', 'Additional Notes', 'Dodatkowe Uwagi', 'Notas Adicionales')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={getLabel('repairs.notesPlaceholder', 'Add any special instructions or notes for the technician...', 'Dodaj specjalne instrukcje lub uwagi dla technika...', 'Agregar instrucciones especiales o notas para el técnico...')}
                      className="resize-none"
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
                onClick={onClose}
                disabled={isSubmitting}
              >
                {getLabel('common.cancel', 'Cancel', 'Anuluj', 'Cancelar')}
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {getLabel('repairs.scheduling', 'Scheduling...', 'Planowanie...', 'Programando...')}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Zaplanuj Naprawę
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}