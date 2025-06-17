import { useQuery } from "@tanstack/react-query";
import { Issue, IssueStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { getQueryFn } from "@/lib/queryClient";
import MapDisplay from "@/components/map/MapDisplay";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Filter, Map, Calendar, Clock, Tag, X } from "lucide-react";
import { format } from "date-fns";

export default function LocationView() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showIssueDetails, setShowIssueDetails] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState(i18next.language);
  const [pageTitle, setPageTitle] = useState("");
  const [locationText, setLocationText] = useState("");
  
  // Update state when language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLanguage(i18next.language);
      updatePageTitle();
    };
    
    i18next.on('languageChanged', handleLanguageChange);
    return () => {
      i18next.off('languageChanged', handleLanguageChange);
    };
  }, []);
  
  // Update the page title directly
  useEffect(() => {
    updatePageTitle();
  }, [currentLanguage]);
  
  // Updates the page title directly in the DOM
  const updatePageTitle = () => {
    // Set state values first
    let title = "Location";
    let text = "View Location";
    
    if (currentLanguage === 'pl') {
      title = "Lokalizacja";
      text = "Zobacz Lokalizację";
    } else if (currentLanguage === 'es') {
      title = "Ubicación";
      text = "Ver Ubicación";
    }
    
    setPageTitle(title);
    setLocationText(text);
    
    // Direct DOM manipulation as a fallback
    setTimeout(() => {
      // Target the main header more precisely
      console.log("Attempting to update Location page title to", title);
      
      // Most specific approach: Target the first h1 element on the page
      const mainPageHeader = document.querySelector('main h1, body > div > h1, #root h1, h1');
      if (mainPageHeader) {
        console.log("Found main header:", mainPageHeader.textContent);
        mainPageHeader.textContent = title;
      } else {
        // Fallback: Try to find any h1 with specific text
        console.log("No main header found, trying fallback method");
        const pageTitleElements = document.querySelectorAll('h1');
        console.log("Found", pageTitleElements.length, "h1 elements");
        
        pageTitleElements.forEach((element, index) => {
          console.log(`H1 #${index}:`, element.textContent);
          if (element.textContent === "My Reports" || 
              element.textContent?.includes("Reports") || 
              element.textContent === "Location" ||
              element.textContent === "Lokalizacja" ||
              element.textContent === "Ubicación") {
            console.log("Found matching header:", element.textContent);
            element.textContent = title;
          }
        });
      }
      
      // Update the subtitle
      const subtitleElements = document.querySelectorAll('p');
      subtitleElements.forEach(element => {
        if (element.textContent === "View Location" || 
            element.textContent === "Zobacz Lokalizację" || 
            element.textContent === "Ver Ubicación") {
          element.textContent = text;
        }
      });
    }, 100);
  };

  // Fetch all issues
  const { data: issues, isLoading } = useQuery<Issue[]>({
    queryKey: ["/api/issues"],
    queryFn: getQueryFn<Issue[]>({ on401: "throw" }),
  });

  // Filter issues based on search term and status
  const filteredIssues = issues?.filter((issue: Issue) => {
    const matchesSearch = 
      searchTerm === "" || 
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      (statusFilter === "all" && !selectedStatus) || 
      (selectedStatus ? issue.status === selectedStatus : issue.status === statusFilter);
    
    return matchesSearch && matchesStatus;
  });
  
  // Handler for when a statistic box is clicked
  const handleStatusBoxClick = (status: string | null) => {
    setSelectedStatus(status);
    setShowIssueDetails(true);
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('locations.title')}
        </h1>
        <p className="text-gray-700 dark:text-gray-300">
          {currentLanguage === 'en' ? 'View and manage issue locations on the map' : 
           currentLanguage === 'es' ? 'Ver y gestionar ubicaciones de problemas en el mapa' : 
           currentLanguage === 'pl' ? 'Zobacz i zarządzaj lokalizacjami problemów na mapie' : 
           'View and manage issue locations on the map'}
        </p>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle>
                {currentLanguage === 'en' ? 'Issue Locations' : t('locations.issueLocations')}
              </CardTitle>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-500">
                  {currentLanguage === 'en' ? 'Outdoor Map' : t('locations.outdoorMap')}
                </h4>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={currentLanguage === 'en' ? 'Search issues...' : t('locations.searchIssues')}
                  className="pl-8"
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
                <span className="sr-only">{t('dashboard.filter')}</span>
              </Button>
            </div>
          </div>
          
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t('form.status')}</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('locations.filterByStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('locations.allStatus')}</SelectItem>
                    <SelectItem value="pending">{t('status.pending')}</SelectItem>
                    <SelectItem value="in_progress">{t('status.in_progress')}</SelectItem>
                    <SelectItem value="scheduled">{t('status.scheduled')}</SelectItem>
                    <SelectItem value="urgent">{t('status.urgent')}</SelectItem>
                    <SelectItem value="completed">{t('status.completed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="h-[500px] rounded-md bg-gray-100 animate-pulse flex items-center justify-center">
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          ) : filteredIssues && filteredIssues.length > 0 ? (
            <div className="h-[500px] rounded-md overflow-hidden border">
              <MapDisplay issues={filteredIssues} zoom={12} />
            </div>
          ) : (
            <div className="h-[500px] rounded-md border bg-gray-50 flex flex-col items-center justify-center p-6">
              <MapPin className="h-12 w-12 text-gray-300 mb-2" />
              <h3 className="text-lg font-medium text-gray-700">
                {currentLanguage === 'en' ? 'Not Found' : t('errors.notFound')}
              </h3>
              <p className="text-gray-500 text-center mt-2">
                {searchTerm || statusFilter !== "all" 
                  ? (currentLanguage === 'en' ? 'Failed to load issues' : t('errors.loadingFailed'))
                  : (currentLanguage === 'en' ? 'No issues to display' : t('dashboard.noIssues'))}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-full md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">
              {currentLanguage === 'en' ? 'Status Legend' : t('locations.statusLegend')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div 
                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedStatus === "urgent" ? 'bg-red-100' : 'hover:bg-gray-100'}`}
                onClick={() => handleStatusBoxClick("urgent")}
              >
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white mr-3">
                  <span>!</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {currentLanguage === 'en' ? 'Urgent' : t('status.urgent')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {currentLanguage === 'en' ? 'Issues requiring immediate attention' : t('locations.urgentDesc')}
                  </p>
                </div>
                {selectedStatus === "urgent" && (
                  <div className="text-red-500 ml-2">
                    <span className="text-xs">▶</span>
                  </div>
                )}
              </div>
              
              <div 
                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedStatus === "in_progress" ? 'bg-yellow-100' : 'hover:bg-gray-100'}`}
                onClick={() => handleStatusBoxClick("in_progress")}
              >
                <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white mr-3">
                  <span>⟳</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {currentLanguage === 'en' ? 'In Progress' : t('status.in_progress')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {currentLanguage === 'en' ? 'Issues currently being worked on' : t('locations.inProgressDesc')}
                  </p>
                </div>
                {selectedStatus === "in_progress" && (
                  <div className="text-yellow-500 ml-2">
                    <span className="text-xs">▶</span>
                  </div>
                )}
              </div>
              
              <div 
                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedStatus === "scheduled" ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                onClick={() => handleStatusBoxClick("scheduled")}
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white mr-3">
                  <span>⏱</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {currentLanguage === 'en' ? 'Scheduled' : t('status.scheduled')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {currentLanguage === 'en' ? 'Issues planned for future repair' : t('locations.scheduledDesc')}
                  </p>
                </div>
                {selectedStatus === "scheduled" && (
                  <div className="text-blue-500 ml-2">
                    <span className="text-xs">▶</span>
                  </div>
                )}
              </div>
              
              <div 
                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedStatus === "pending" ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                onClick={() => handleStatusBoxClick("pending")}
              >
                <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white mr-3">
                  <span>•</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {currentLanguage === 'en' ? 'Pending' : t('status.pending')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {currentLanguage === 'en' ? 'Newly reported issues awaiting review' : t('locations.pendingDesc')}
                  </p>
                </div>
                {selectedStatus === "pending" && (
                  <div className="text-gray-500 ml-2">
                    <span className="text-xs">▶</span>
                  </div>
                )}
              </div>
              
              <div 
                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedStatus === "completed" ? 'bg-green-100' : 'hover:bg-gray-100'}`}
                onClick={() => handleStatusBoxClick("completed")}
              >
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white mr-3">
                  <span>✓</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {currentLanguage === 'en' ? 'Completed' : t('status.completed')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {currentLanguage === 'en' ? 'Issues that have been resolved' : t('locations.completedDesc')}
                  </p>
                </div>
                {selectedStatus === "completed" && (
                  <div className="text-green-500 ml-2">
                    <span className="text-xs">▶</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-full md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {currentLanguage === 'en' ? 'Location Statistics' : t('locations.locationStatistics')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div 
                className={`p-4 ${selectedStatus === null ? 'bg-primary/10' : 'bg-gray-50'} rounded-md text-center cursor-pointer transition-colors hover:bg-gray-100`}
                onClick={() => handleStatusBoxClick(null)}
              >
                <p className="text-4xl font-bold text-primary">{filteredIssues?.length || 0}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {currentLanguage === 'en' ? 'Total Issues' : t('dashboard.totalIssues')}
                </p>
                {selectedStatus === null && <div className="mt-2 text-xs text-primary">
                  {currentLanguage === 'en' ? '▼ View on map' : 
                   currentLanguage === 'es' ? '▼ Ver en mapa' : 
                   currentLanguage === 'pl' ? '▼ Zobacz na mapie' : 
                   t('locations.viewOnMap', '▼ View on map')}
                </div>}
              </div>
              
              <div 
                className={`p-4 ${selectedStatus === "in_progress" ? 'bg-yellow-100' : 'bg-gray-50'} rounded-md text-center cursor-pointer transition-colors hover:bg-gray-100`}
                onClick={() => handleStatusBoxClick("in_progress")}
              >
                <p className="text-4xl font-bold text-yellow-500">
                  {filteredIssues?.filter((i: Issue) => i.status === "in_progress").length || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {currentLanguage === 'en' ? 'In Progress' : t('status.in_progress')}
                </p>
                {selectedStatus === "in_progress" && <div className="mt-2 text-xs text-yellow-500">
                  {currentLanguage === 'en' ? '▼ View on map' : 
                   currentLanguage === 'es' ? '▼ Ver en mapa' : 
                   currentLanguage === 'pl' ? '▼ Zobacz na mapie' : 
                   t('locations.viewOnMap', '▼ View on map')}
                </div>}
              </div>
              
              <div 
                className={`p-4 ${selectedStatus === "urgent" ? 'bg-red-100' : 'bg-gray-50'} rounded-md text-center cursor-pointer transition-colors hover:bg-gray-100`}
                onClick={() => handleStatusBoxClick("urgent")}
              >
                <p className="text-4xl font-bold text-red-500">
                  {filteredIssues?.filter((i: Issue) => i.status === "urgent").length || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {currentLanguage === 'en' ? 'Urgent' : t('status.urgent')}
                </p>
                {selectedStatus === "urgent" && <div className="mt-2 text-xs text-red-500">
                  {currentLanguage === 'en' ? '▼ View on map' : 
                   currentLanguage === 'es' ? '▼ Ver en mapa' : 
                   currentLanguage === 'pl' ? '▼ Zobacz na mapie' : 
                   t('locations.viewOnMap', '▼ View on map')}
                </div>}
              </div>
              
              <div 
                className={`p-4 ${selectedStatus === "completed" ? 'bg-green-100' : 'bg-gray-50'} rounded-md text-center cursor-pointer transition-colors hover:bg-gray-100`}
                onClick={() => handleStatusBoxClick("completed")}
              >
                <p className="text-4xl font-bold text-green-500">
                  {filteredIssues?.filter((i: Issue) => i.status === "completed").length || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {currentLanguage === 'en' ? 'Completed' : t('status.completed')}
                </p>
                {selectedStatus === "completed" && <div className="mt-2 text-xs text-green-500">
                  {currentLanguage === 'en' ? '▼ View on map' : 
                   currentLanguage === 'es' ? '▼ Ver en mapa' : 
                   currentLanguage === 'pl' ? '▼ Zobacz na mapie' : 
                   t('locations.viewOnMap', '▼ View on map')}
                </div>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Issue details section shown when a stat box is clicked */}
      {showIssueDetails && selectedStatus !== undefined && (
        <Card className="mt-6">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {selectedStatus === null 
                  ? t('dashboard.totalIssues') 
                  : `${t(`status.${selectedStatus}`)} ${t('dashboard.issues')}`}
              </CardTitle>
              <CardDescription>
                {selectedStatus === null 
                  ? t('dashboard.allIssuesDesc') 
                  : t('dashboard.filteredIssuesDesc')}
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                setSelectedStatus(null);
                setShowIssueDetails(false);
              }}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredIssues && filteredIssues.length > 0 ? (
                filteredIssues.map((issue) => (
                  <div key={issue.id} className="border rounded-md p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{issue.title}</h3>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium
                        ${issue.status === 'urgent' ? 'bg-red-100 text-red-800' : ''}
                        ${issue.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${issue.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                        ${issue.status === 'pending' ? 'bg-gray-100 text-gray-800' : ''}
                        ${issue.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : ''}
                      `}>
                        {t(`status.${issue.status}`)}
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">{issue.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{issue.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{issue.createdAt ? format(new Date(issue.createdAt), 'MMM d, yyyy') : '-'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        <span>{t(`priority.${issue.priority}`)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  {t('dashboard.noIssues')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}