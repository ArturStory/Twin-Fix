import React, { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { pl, es, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  id,
  name,
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
}: DatePickerProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  // Get the correct date-fns locale based on current language
  const getDateLocale = () => {
    switch (i18n.language) {
      case 'pl': return pl;
      case 'es': return es;
      case 'en': return enUS;
      default: return enUS;
    }
  };

  // Convert string date to Date object
  const selectedDate = value ? new Date(value) : undefined;

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date && onChange) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      onChange(formattedDate);
    }
    setOpen(false);
  };

  // Format display date
  const formatDisplayDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'PP', { locale: getDateLocale() });
    } catch {
      return dateString;
    }
  };

  // Get localized labels
  const getLocalizedLabels = () => {
    switch (i18n.language) {
      case 'pl':
        return {
          clear: 'Wyczyść',
          today: 'Dzisiaj',
          selectDate: 'Wybierz datę',
        };
      case 'es':
        return {
          clear: 'Limpiar',
          today: 'Hoy',
          selectDate: 'Seleccionar fecha',
        };
      case 'en':
      default:
        return {
          clear: 'Clear',
          today: 'Today',
          selectDate: 'Select date',
        };
    }
  };

  const labels = getLocalizedLabels();

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {value ? formatDisplayDate(value) : placeholder || labels.selectDate}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            locale={getDateLocale()}
            disabled={disabled}
            footer={
              <div className="flex items-center justify-between p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (onChange) onChange('');
                    setOpen(false);
                  }}
                >
                  {labels.clear}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = format(new Date(), 'yyyy-MM-dd');
                    if (onChange) onChange(today);
                    setOpen(false);
                  }}
                >
                  {labels.today}
                </Button>
              </div>
            }
          />
        </PopoverContent>
      </Popover>
      
      {/* Hidden input for form compatibility */}
      <input
        type="hidden"
        name={name}
        value={value || ''}
        onChange={() => {}} // Controlled by the date picker
      />
    </div>
  );
}