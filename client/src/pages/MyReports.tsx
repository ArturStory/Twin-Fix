import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Issue, IssueStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import IssueCard from "@/components/issues/IssueCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter, Plus, Search, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";

export default function MyReports() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18next.language);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [machineFilter, setMachineFilter] = useState<{machineId: number, machineName: string, machineSerial: string} | null>(null);
  
  // Check for machine filter from sessionStorage
  useEffect(() => {
    const storedMachineFilter = sessionStorage.getItem('machineFilter');
    if (storedMachineFilter) {
      try {
        const machineData = JSON.parse(storedMachineFilter);
        setMachineFilter(machineData);
        // Clear the filter from sessionStorage after using it
        sessionStorage.removeItem('machineFilter');
      } catch (error) {
        console.error('Error parsing machine filter from sessionStorage:', error);
      }
    }
  }, []);

  // Force language detection update
  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLanguage(i18next.language);
      console.log("Language changed to:", i18next.language);
    };
    
    i18next.on('languageChanged', handleLanguageChange);
    return () => {
      i18next.off('languageChanged', handleLanguageChange);
    };
  }, []);
  
  // Get the title based on current language
  const getTitle = () => {
    switch(currentLanguage) {
      case 'pl': return 'Moje Zgłoszenia';
      case 'es': return 'Mis Reportes';
      default: return 'My Reports';
    }
  };
  
  // Get the description based on current language
  const getDescription = () => {
    switch(currentLanguage) {
      case 'pl': return 'Zarządzaj i śledź swoje zgłoszone problemy';
      case 'es': return 'Gestiona y haz seguimiento a tus problemas reportados';
      default: return 'Manage and track your reported issues';
    }
  };
  
  // Get the report button text based on current language
  const getReportButtonText = () => {
    switch(currentLanguage) {
      case 'pl': return 'Zgłoś Problem';
      case 'es': return 'Reportar Problema';
      default: return 'Report Issue';
    }
  };

  // Fetch all issues with explicit type
  const { data: issues, isLoading, error } = useQuery<Issue[]>({
    queryKey: ["/api/issues"],
  });

  // Fetch available locations
  const { data: locations } = useQuery<{id: number, name: string}[]>({
    queryKey: ["/api/shared-locations"],
  });
  
  // Handle error if present
  if (error) {
    toast({
      title: "Error",
      description: "Failed to load issues. Please try again.",
      variant: "destructive",
    });
  }

  // Filter issues based on search term, status, location, and machine
  const filteredIssues = issues?.filter((issue: Issue) => {
    const matchesSearch = 
      searchTerm === "" || 
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || 
      issue.status === statusFilter;
    
    const matchesLocation = 
      selectedLocation === "" || selectedLocation === "all" || 
      issue.location.toLowerCase().includes(selectedLocation.toLowerCase());
    
    // Machine-specific filtering
    const matchesMachine = !machineFilter || (
      ((issue as any).machineId && (issue as any).machineId === machineFilter.machineId) ||
      (issue.category === 'machine' && (
        issue.title.toLowerCase().includes(machineFilter.machineName.toLowerCase()) ||
        issue.description.toLowerCase().includes(machineFilter.machineName.toLowerCase()) ||
        issue.title.toLowerCase().includes(machineFilter.machineSerial.toLowerCase()) ||
        issue.description.toLowerCase().includes(machineFilter.machineSerial.toLowerCase())
      ))
    );
    
    return matchesSearch && matchesStatus && matchesLocation && matchesMachine;
  });

  // Get counts for tab badges based on location and machine filter
  const getFilteredCount = (statusFilter?: string) => {
    return issues?.filter((i: Issue) => {
      const matchesLocation = selectedLocation === "" || selectedLocation === "all" || i.location.toLowerCase().includes(selectedLocation.toLowerCase());
      
      // Machine-specific filtering for counts
      const matchesMachine = !machineFilter || (
        ((i as any).machineId && (i as any).machineId === machineFilter.machineId) ||
        (i.category === 'machine' && (
          i.title.toLowerCase().includes(machineFilter.machineName.toLowerCase()) ||
          i.description.toLowerCase().includes(machineFilter.machineName.toLowerCase()) ||
          i.title.toLowerCase().includes(machineFilter.machineSerial.toLowerCase()) ||
          i.description.toLowerCase().includes(machineFilter.machineSerial.toLowerCase())
        ))
      );
      
      if (!statusFilter) return matchesLocation && matchesMachine;
      if (statusFilter === 'open') return matchesLocation && matchesMachine && i.status !== IssueStatus.COMPLETED;
      if (statusFilter === 'urgent') return matchesLocation && matchesMachine && i.status === IssueStatus.URGENT;
      if (statusFilter === 'completed') return matchesLocation && matchesMachine && i.status === IssueStatus.COMPLETED;
      return matchesLocation && matchesMachine;
    }).length || 0;
  };

  const allCount = getFilteredCount();
  const openCount = getFilteredCount('open');
  const completedCount = getFilteredCount('completed');
  const urgentCount = getFilteredCount('urgent');

  // Render function for issues lists
  const renderIssuesList = (issues?: Issue[], isLoading?: boolean) => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex flex-col md:flex-row">
              <Skeleton className="md:w-1/4 h-48 md:h-32 rounded-lg" />
              <div className="md:ml-4 flex-1 mt-4 md:mt-0">
                <div className="flex flex-wrap items-start justify-between">
                  <div>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32 mt-2" />
                  </div>
                  <Skeleton className="h-6 w-20 mt-2 md:mt-0" />
                </div>
                <Skeleton className="h-10 w-full mt-2" />
                <div className="mt-3 flex items-center justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!issues || issues.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Filter className="h-8 w-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium">
            {currentLanguage === 'en' ? 'No Issues Found' : t('issues.noIssuesFound')}
          </h3>
          <p className="text-gray-700 mt-2 max-w-md mx-auto">
            {searchTerm || statusFilter !== "all" 
              ? (currentLanguage === 'en' ? 'Adjust filters to find more issues or report a new issue' : t('issues.adjustFilters'))
              : (currentLanguage === 'en' ? 'You haven\'t reported any issues yet' : t('issues.noIssuesYet'))}
          </p>
          <Button asChild className="mt-6">
            <Link href="/report">
              {currentLanguage === 'en' ? 'Report Issue' : t('issues.reportAnIssue')}
            </Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-200">
        {issues.map((issue) => (
          <div key={issue.id} className="py-4 first:pt-0 last:pb-0">
            <IssueCard issue={issue} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col mb-6">
        <div className="w-full">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">
            {getTitle()}
          </h1>
        </div>
        <div className="w-full mt-1">
          <p className="text-sm sm:text-base text-gray-900 dark:text-gray-300 break-words">
            {getDescription()}
          </p>
        </div>
        <div className="col-span-1 mt-4">
          <Button asChild>
            <Link href="/report">
              <Plus className="mr-2 h-4 w-4" />
              {getReportButtonText()}
            </Link>
          </Button>
        </div>
      </div>

      {/* Machine Filter Indicator */}
      {machineFilter && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {currentLanguage === 'en' ? 'Filtered by Machine:' : 
                 currentLanguage === 'es' ? 'Filtrado por Máquina:' : 
                 currentLanguage === 'pl' ? 'Filtrowane według Maszyny:' : 'Filtered by Machine:'} {machineFilter.machineName}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-300">
                (S/N: {machineFilter.machineSerial})
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setMachineFilter(null)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              {currentLanguage === 'en' ? 'Clear Filter' : 
               currentLanguage === 'es' ? 'Limpiar Filtro' : 
               currentLanguage === 'pl' ? 'Wyczyść Filtr' : 'Clear Filter'}
            </Button>
          </div>
        </div>
      )}

      {/* Location Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            {currentLanguage === 'pl' ? 'Wybierz Lokalizację' : 
             currentLanguage === 'es' ? 'Seleccionar Ubicación' : 'Select Location'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue placeholder={
                currentLanguage === 'pl' ? 'Wybierz lokalizację aby zobaczyć raporty' :
                currentLanguage === 'es' ? 'Selecciona ubicación para ver reportes' :
                'Select a location to view reports'
              } />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {currentLanguage === 'pl' ? 'Wszystkie Lokalizacje' :
                 currentLanguage === 'es' ? 'Todas las Ubicaciones' : 
                 'All Locations'}
              </SelectItem>
              {locations?.map((location) => (
                <SelectItem key={location.id} value={location.name}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>{currentLanguage === 'en' ? 'Issues' : t('issues.issues')}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-600" />
                <Input
                  placeholder={currentLanguage === 'en' ? 'Search...' : currentLanguage === 'pl' ? 'Szukaj...' : 'Buscar...'}
                  className="pl-8 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-primary/10" : ""}
              >
                <Filter className="h-4 w-4" />
                <span className="sr-only">{currentLanguage === 'en' ? 'Filter' : t('issues.filter')}</span>
              </Button>
            </div>
          </div>
          
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  {currentLanguage === 'en' ? 'Status' : t('issues.status')}
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={currentLanguage === 'en' ? 'Filter by status' : t('issues.filterByStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{currentLanguage === 'en' ? 'All Statuses' : t('issues.allStatus')}</SelectItem>
                    <SelectItem value="pending">{currentLanguage === 'en' ? 'Pending' : t('status.pending')}</SelectItem>
                    <SelectItem value="in_progress">{currentLanguage === 'en' ? 'In Progress' : t('status.in_progress')}</SelectItem>
                    <SelectItem value="scheduled">{currentLanguage === 'en' ? 'Scheduled' : t('status.scheduled')}</SelectItem>
                    <SelectItem value="urgent">{currentLanguage === 'en' ? 'Urgent' : t('status.urgent')}</SelectItem>
                    <SelectItem value="completed">{currentLanguage === 'en' ? 'Completed' : t('status.completed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>

        <Tabs defaultValue="all">
          <div className="px-4 sm:px-6">
            <TabsList className="w-full grid grid-cols-4 bg-gray-800 h-auto min-h-[52px]">
              <TabsTrigger value="all" className="px-1 sm:px-3 text-white data-[state=active]:text-blue-300 data-[state=active]:bg-gray-700 flex flex-col items-center justify-center min-h-[48px] py-2 relative">
                <div className="flex flex-col items-center justify-center h-full w-full">
                  <span className="text-[9px] sm:text-xs font-semibold text-center leading-none mb-1">{currentLanguage === 'en' ? 'All' : t('issues.all')}</span>
                  {allCount > 0 && <span className="text-[8px] sm:text-[9px] bg-blue-500 text-white rounded-full px-1.5 py-0.5 min-w-[16px] text-center">{allCount}</span>}
                </div>
              </TabsTrigger>
              <TabsTrigger value="open" className="px-1 sm:px-3 text-white data-[state=active]:text-blue-300 data-[state=active]:bg-gray-700 flex flex-col items-center justify-center min-h-[48px] py-2 relative">
                <div className="flex flex-col items-center justify-center h-full w-full">
                  <span className="text-[9px] sm:text-xs font-semibold text-center leading-none mb-1">{currentLanguage === 'en' ? 'Open' : t('issues.open')}</span>
                  {openCount > 0 && <span className="text-[8px] sm:text-[9px] bg-yellow-500 text-white rounded-full px-1.5 py-0.5 min-w-[16px] text-center">{openCount}</span>}
                </div>
              </TabsTrigger>
              <TabsTrigger value="urgent" className="px-1 sm:px-3 text-white data-[state=active]:text-blue-300 data-[state=active]:bg-gray-700 flex flex-col items-center justify-center min-h-[48px] py-2 relative">
                <div className="flex flex-col items-center justify-center h-full w-full">
                  <span className="text-[9px] sm:text-xs font-semibold text-center leading-none mb-1">{currentLanguage === 'en' ? 'Urgent' : t('issues.urgent')}</span>
                  {urgentCount > 0 && <span className="text-[8px] sm:text-[9px] bg-orange-500 text-white rounded-full px-1.5 py-0.5 min-w-[16px] text-center">{urgentCount}</span>}
                </div>
              </TabsTrigger>
              <TabsTrigger value="completed" className="px-1 sm:px-3 text-white data-[state=active]:text-blue-300 data-[state=active]:bg-gray-700 flex flex-col items-center justify-center min-h-[48px] py-2 relative">
                <div className="flex flex-col items-center justify-center h-full w-full">
                  <span className="text-[9px] sm:text-xs font-semibold text-center leading-none mb-1 break-words max-w-full">{currentLanguage === 'en' ? 'Completed' : t('issues.completed')}</span>
                  {completedCount > 0 && <span className="text-[8px] sm:text-[9px] bg-green-500 text-white rounded-full px-1.5 py-0.5 min-w-[16px] text-center">{completedCount}</span>}
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="pt-6">
            <TabsContent value="all">
              {renderIssuesList(filteredIssues, isLoading)}
            </TabsContent>

            <TabsContent value="open">
              {renderIssuesList(filteredIssues?.filter((i: Issue) => i.status !== IssueStatus.COMPLETED), isLoading)}
            </TabsContent>

            <TabsContent value="urgent">
              {renderIssuesList(filteredIssues?.filter((i: Issue) => i.status === IssueStatus.URGENT), isLoading)}
            </TabsContent>

            <TabsContent value="completed">
              {renderIssuesList(filteredIssues?.filter((i: Issue) => i.status === IssueStatus.COMPLETED), isLoading)}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </>
  );
}