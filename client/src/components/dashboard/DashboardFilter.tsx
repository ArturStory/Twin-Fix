import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Filter, MapPin, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IssueStatus } from '@shared/schema';
import { useTranslation } from "react-i18next";

export interface DashboardFilterProps {
  onFilterChange: (filters: FilterState) => void;
  uniqueLocations: string[];
}

export interface FilterState {
  searchTerm: string;
  location: string;
  status: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
}

export default function DashboardFilter({ onFilterChange, uniqueLocations }: DashboardFilterProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    location: 'all-locations',
    status: 'all',
    startDate: undefined,
    endDate: undefined
  });

  const handleFilterChange = (name: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      searchTerm: '',
      location: 'all-locations',
      status: 'all',
      startDate: undefined,
      endDate: undefined
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const hasActiveFilters = () => {
    return filters.searchTerm !== '' || 
           filters.location !== 'all-locations' || 
           filters.status !== 'all' || 
           filters.startDate !== undefined || 
           filters.endDate !== undefined;
  };

  return (
    <div className="flex flex-col w-full space-y-4">
      <div className="flex flex-wrap gap-2">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder={t('dashboard.searchIssues')}
            className="pl-9 w-full"
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
          />
          {filters.searchTerm && (
            <button
              onClick={() => handleFilterChange('searchTerm', '')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">{t('common.clear')}</span>
            </button>
          )}
        </div>
        
        {/* Filter toggle button */}
        <Button 
          variant="outline" 
          className={cn(isOpen || hasActiveFilters() ? "bg-primary/10 border-primary/20" : "")}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Filter className="h-4 w-4 mr-2" /> 
          {t('dashboard.filters')}
          {hasActiveFilters() && (
            <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
              {Object.values(filters).filter(v => v !== '' && v !== 'all' && v !== 'all-locations' && v !== undefined).length}
            </span>
          )}
        </Button>
      </div>

      {/* Expanded filter options */}
      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-md bg-white shadow-sm">
          {/* Location filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {t('dashboard.location')}
            </label>
            <Select 
              value={filters.location} 
              onValueChange={(value) => handleFilterChange('location', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('dashboard.selectLocation')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-locations">{t('dashboard.allLocations')}</SelectItem>
                {uniqueLocations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              {t('dashboard.status')}
            </label>
            <Select 
              value={filters.status} 
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('dashboard.selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard.allStatuses')}</SelectItem>
                <SelectItem value={IssueStatus.PENDING}>{t('status.pending')}</SelectItem>
                <SelectItem value={IssueStatus.IN_PROGRESS}>{t('status.in_progress')}</SelectItem>
                <SelectItem value={IssueStatus.COMPLETED}>{t('status.completed')}</SelectItem>
                <SelectItem value={IssueStatus.SCHEDULED}>{t('status.scheduled')}</SelectItem>
                <SelectItem value={IssueStatus.URGENT}>{t('status.urgent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date range filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              {t('dashboard.dateRange')}
            </label>
            <div className="flex gap-2">
              {/* Start date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? format(filters.startDate, "PPP") : t('dashboard.startDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => handleFilterChange('startDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* End date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? format(filters.endDate, "PPP") : t('dashboard.endDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => handleFilterChange('endDate', date)}
                    initialFocus
                    disabled={(date) => 
                      (filters.startDate ? date < filters.startDate : false)
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Action buttons */}
          <div className="md:col-span-3 flex justify-end mt-2">
            <Button
              variant="ghost"
              onClick={clearFilters}
              disabled={!hasActiveFilters()}
              className="mr-2"
            >
              {t('dashboard.clearFilters')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}