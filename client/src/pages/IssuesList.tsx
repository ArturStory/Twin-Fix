import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Issue } from "@shared/schema";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useAppWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Trash, 
  Loader2,
  MapPin,
  ArrowLeft,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  CalendarClock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

// For simplicity, use string type for status
type IssueStatus = string;

// Define IssueStatus enum values for reference
const IssueStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress', 
  COMPLETED: 'completed',
  SCHEDULED: 'scheduled',
  URGENT: 'urgent'
};

// Define issue type that includes imageUrls field
type IssueWithImages = Issue & {
  imageUrls?: string[] | null;
}

// Image viewer component for full-screen view
interface ImageViewerProps {
  imageUrl: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

function ImageViewer({ imageUrl, alt, isOpen, onClose }: ImageViewerProps) {
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div className="relative max-w-[90%] max-h-[90vh]">
        <button 
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 rounded-full p-2 transition-colors"
          onClick={onClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <img 
          src={imageUrl} 
          alt={alt} 
          className="max-w-full max-h-[85vh] object-contain rounded-lg" 
        />
      </div>
    </div>
  );
}

export default function IssuesList() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  
  // State for clearing issues
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  // Get all locations from localStorage
  const locations = JSON.parse(localStorage.getItem('locations') || '[]');
  
  // Extract location ID and name from URL if present
  React.useEffect(() => {
    // Check for location parameter in URL
    const params = new URLSearchParams(window.location.search);
    const locId = params.get('locationId');
    const locName = params.get('locationName');
    
    if (locId) {
      setLocationId(locId);
      setSelectedLocation(locId);
    }
    
    if (locName) {
      setLocationName(decodeURIComponent(locName));
    }
  }, []);
  
  // Fetch all issues
  const { data: allIssues, isLoading, error } = useQuery<IssueWithImages[]>({
    queryKey: ['/api/issues'],
    staleTime: 30000, // 30 seconds
  });
  
  // Function to clear all issues
  const handleClearAllIssues = async () => {
    if (!window.confirm(t('issues.confirmClearAll', 'Are you sure you want to clear all issues? This cannot be undone.'))) {
      return;
    }

    setIsClearing(true);
    try {
      // Call API to clear all issues - use the proper endpoint
      const response = await fetch('/api/issues/clear-all', {
        method: 'POST',
      });

      if (response.ok) {
        // Update the UI by invalidating all queries
        queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
        queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
        
        // No need to manually send WebSocket message here
        // The server will handle broadcasting the data_refresh event to all clients
        
        toast({
          title: t('issues.cleared', 'Issues Cleared'),
          description: t('issues.clearedDescription', 'All issues have been removed. Ready for fresh testing.')
        });
      } else {
        throw new Error('Failed to clear issues');
      }
    } catch (error) {
      console.error('Error clearing issues:', error);
      toast({
        title: t('issues.clearError', 'Error'),
        description: t('issues.clearErrorDescription', 'Failed to clear issues. Please try again.'),
        variant: 'destructive'
      });
    } finally {
      setIsClearing(false);
    }
  };
  
  // Filter issues by status and location
  const issues = React.useMemo(() => {
    if (!allIssues) return [];
    
    let filteredIssues = [...allIssues];
    
    // First apply status filter if not 'all'
    if (selectedStatus !== "all") {
      filteredIssues = filteredIssues.filter(issue => issue.status === selectedStatus);
    }
    
    // If no locationId/locationName from URL parameter, apply selectedLocation filter
    if (!locationId && !locationName) {
      if (selectedLocation !== "all") {
        const locationObj = locations.find((loc: any) => loc.id === selectedLocation);
        
        if (locationObj) {
          filteredIssues = filteredIssues.filter(issue => 
            belongsToCurrentLocation(issue)
          );
        }
      }
    } 
    // If locationId/locationName from URL parameter, filter by those
    else if (locationId || locationName) {
      filteredIssues = filteredIssues.filter(issue => 
        belongsToCurrentLocation(issue)
      );
    }
    
    return filteredIssues;
  }, [allIssues, selectedStatus, selectedLocation, locationName, locationId]);
  
  // Log the filtered issues
  React.useEffect(() => {
    if (issues) {
      console.log("Filtered issues by location:", 
        issues.map(i => ({ id: i.id, title: i.title, location: i.location }))
      );
    }
  }, [issues]);
  
  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState<Issue | null>(null);
  
  // Server-side issue deletion functionality - permanently deletes for all users
  const deleteIssueFromServer = async (id: number): Promise<{success: boolean}> => {
    try {
      console.log(`Performing permanent deletion for issue ${id}`);
      
      // Get user data for authentication
      const storedUser = localStorage.getItem('auth_user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      const response = await fetch(`/api/issues/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // Add user info in headers as backup authentication
          'X-User-ID': user?.id?.toString() || '',
          'X-Username': user?.username || '',
          'X-User-Role': user?.role || '',
        },
        credentials: 'include', // This is crucial for session cookies!
      });

      if (!response.ok) {
        throw new Error('Failed to delete issue from server');
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting issue:', error);
      throw error;
    }
  };
  
  // Access WebSocket functionality
  const { send: sendWebSocketMessage, subscribe } = useAppWebSocket();
  
  // Deletion mutation - now uses server API for permanent deletion
  const deleteIssueMutation = useMutation({
    mutationFn: (id: number) => deleteIssueFromServer(id),
    onSuccess: () => {
      // Refresh the issues list from server to show updated data for all users
      queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
      
      toast({
        title: t('issues.deleted'),
        description: t('issues.deletedDescription'),
      });
      
      // Send WebSocket notification to inform other users
      sendWebSocketMessage({
        type: "issue_deleted",
        payload: {
          issueId: issueToDelete?.id,
          title: issueToDelete?.title,
        },
      });
      
      setDeleteDialogOpen(false);
      setIssueToDelete(null);
    },
    onError: (error) => {
      toast({
        title: t('issues.deleteError'),
        description: t('issues.deleteErrorDescription'),
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
    },
  });
  
  // Function to handle issue deletion
  const handleDeleteIssue = (issue: Issue) => {
    setIssueToDelete(issue);
    setDeleteDialogOpen(true);
  };
  
  // Confirm issue deletion
  const confirmDeleteIssue = async () => {
    if (issueToDelete) {
      try {
        // First, ensure session is properly established
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          const recoveryResponse = await fetch('/api/auth/session-recovery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
              userId: user.id,
              username: user.username
            }),
          }).catch(e => console.log("Session recovery attempt:", e));
          
          // Wait a moment for session to be fully established
          if (recoveryResponse && recoveryResponse.ok) {
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log("Session recovery completed, proceeding with delete");
          }
        }
        
        // Now attempt the deletion
        deleteIssueMutation.mutate(issueToDelete.id);
      } catch (error) {
        console.error("Error preparing delete:", error);
        deleteIssueMutation.mutate(issueToDelete.id);
      }
    }
  };
  
  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: IssueStatus; notes: string }) => {
      const response = await fetch(`/api/issues/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, notes }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update status");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Update cache
      queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
      
      toast({
        title: i18n.language === 'en' ? 'Status Updated' : 
               i18n.language === 'es' ? 'Estado Actualizado' : 
               i18n.language === 'pl' ? 'Status Zaktualizowany' : 
               'Status Updated',
        description: i18n.language === 'en' ? 'Issue status has been successfully updated' : 
                     i18n.language === 'es' ? 'El estado del problema se ha actualizado correctamente' : 
                     i18n.language === 'pl' ? 'Status problemu został pomyślnie zaktualizowany' : 
                     'Issue status has been successfully updated',
      });
      
      // Send WebSocket notification about status change
      sendWebSocketMessage({
        type: "status_changed",
        payload: {
          issueId: data.issueId,
          oldStatus: data.oldStatus,
          newStatus: data.newStatus,
          changedById: data.changedById,
          changedByName: data.changedByName,
        },
      });
    },
    onError: (error) => {
      toast({
        title: t('issues.statusUpdateError'),
        description: error instanceof Error ? error.message : t('issues.statusUpdateErrorDescription'),
        variant: "destructive",
      });
    },
  });
  
  // State for scheduling repair dialog
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [issueToSchedule, setIssueToSchedule] = useState<Issue | null>(null);
  const [schedulingNotes, setSchedulingNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  
  // State for issue details dialog
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  
  // Function to handle scheduling a repair
  const handleScheduleRepair = (issue: Issue) => {
    setIssueToSchedule(issue);
    setScheduleDialogOpen(true);
    setSchedulingNotes('');
    setSelectedDate(undefined);
    setSelectedTime('09:00');
  };
  
  // Function to schedule a repair
  const confirmScheduleRepair = () => {
    if (issueToSchedule && selectedDate) {
      // Combine date and time
      const scheduledDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

      // Make API call to update both status and scheduled date
      fetch(`/api/issues/${issueToSchedule.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: IssueStatus.SCHEDULED,
          scheduledDate: scheduledDateTime.toISOString(),
          notes: schedulingNotes || '',
          scheduledByName: user?.username || 'Unknown',
          scheduledById: user?.id || null,
        }),
      })
      .then(response => response.json())
      .then(() => {
        // Refresh the issues list
        queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
        setScheduleDialogOpen(false);
        toast({
          title: i18n.language === 'pl' ? 'Naprawa zaplanowana' : i18n.language === 'es' ? 'Reparación programada' : 'Repair scheduled',
          description: i18n.language === 'pl' ? `Naprawa zaplanowana na ${scheduledDateTime.toLocaleString()}` : 
                      i18n.language === 'es' ? `Reparación programada para ${scheduledDateTime.toLocaleString()}` :
                      `Repair scheduled for ${scheduledDateTime.toLocaleString()}`,
        });
      })
      .catch((error) => {
        console.error('Error scheduling repair:', error);
        toast({
          title: i18n.language === 'pl' ? 'Błąd' : i18n.language === 'es' ? 'Error' : 'Error',
          description: i18n.language === 'pl' ? 'Nie udało się zaplanować naprawy' : 
                      i18n.language === 'es' ? 'No se pudo programar la reparación' :
                      'Failed to schedule repair',
          variant: 'destructive',
        });
      });
    }
  };
  
  // Function to handle marking an issue in progress
  const handleMarkInProgress = (issue: Issue) => {
    updateStatusMutation.mutate({
      id: issue.id,
      status: IssueStatus.IN_PROGRESS,
      notes: '',
    });
  };
  
  // Function to handle marking an issue as complete
  const handleMarkComplete = (issue: Issue) => {
    updateStatusMutation.mutate({
      id: issue.id,
      status: IssueStatus.COMPLETED,
      notes: '',
    });
  };
  
  // Function to check if an issue belongs to the selected location
  const belongsToCurrentLocation = (issue: IssueWithImages): boolean => {
    // If both locationId and locationName are null, no filtering needed
    if (!locationId && !locationName) {
      if (selectedLocation === "all") return true;
      
      // Format of issue.location is expected to be like "Building: B1, Floor: 2, Room: Kitchen"
      return issue.location.toLowerCase().includes(selectedLocation.toLowerCase());
    }
    
    // Filter based on provided locationId if we have one
    if (locationId) {
      return issue.location.toLowerCase().includes(locationId.toLowerCase());
    }
    
    // Otherwise filter based on locationName
    if (locationName) {
      return issue.location.toLowerCase().includes(locationName.toLowerCase());
    }
    
    return true;
  };
  
  // State for image viewer
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <div className="container max-w-none px-6 py-10">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">
          {i18n.language === 'en' ? 'All Reports' : t('issues.allReports')}
        </h1>
        <Button 
          variant="destructive" 
          size="sm"
          onClick={handleClearAllIssues}
          disabled={isClearing}
        >
          {isClearing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Trash className="h-4 w-4 mr-1" />
          {i18n.language === 'en' ? 'Clear All' : t('issues.clearAll', 'Clear All')}
        </Button>
      </div>
      <p className="text-gray-500 mb-8">
        {i18n.language === 'en' ? 'Track and manage all reported issues across all locations' : t('issues.trackAndManage')}
      </p>
      
      {/* Location information if filtered */}
      {locationName && (
        <div className="bg-muted p-4 rounded-lg mb-6 flex items-start">
          <MapPin className="h-5 w-5 mr-2 mt-1 text-primary" />
          <div>
            <h3 className="font-medium">{t('common.viewing')}: {locationName}</h3>
            <p className="text-sm text-muted-foreground">{t('issues.filteringByLocation')}</p>
            <Button 
              variant="link" 
              className="px-0 h-auto text-primary" 
              onClick={() => {
                setLocationId(null);
                setLocationName(null);
                setLocation('/issues');
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('common.viewAll')}
            </Button>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="mb-6">
        <div className="w-full sm:w-1/3">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder={i18n.language === 'en' ? 'Filter by Status' : t('issues.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {i18n.language === 'en' ? 'All' : 
                 i18n.language === 'es' ? 'Todos' : 
                 i18n.language === 'pl' ? 'Wszystkie' : 
                 t('common.all')}
              </SelectItem>
              <SelectItem value={IssueStatus.PENDING}>
                {i18n.language === 'en' ? 'Pending' : 
                 i18n.language === 'es' ? 'Pendiente' : 
                 i18n.language === 'pl' ? 'Oczekujące' : 
                 t('status.pending')}
              </SelectItem>
              <SelectItem value={IssueStatus.IN_PROGRESS}>
                {i18n.language === 'en' ? 'In Progress' : 
                 i18n.language === 'es' ? 'En Progreso' : 
                 i18n.language === 'pl' ? 'W toku' : 
                 t('status.inProgress')}
              </SelectItem>
              <SelectItem value={IssueStatus.SCHEDULED}>
                {i18n.language === 'en' ? 'Scheduled' : 
                 i18n.language === 'es' ? 'Programado' : 
                 i18n.language === 'pl' ? 'Zaplanowane' : 
                 t('status.scheduled')}
              </SelectItem>
              <SelectItem value={IssueStatus.COMPLETED}>
                {i18n.language === 'en' ? 'Completed' : 
                 i18n.language === 'es' ? 'Completado' : 
                 i18n.language === 'pl' ? 'Zakończone' : 
                 t('status.completed')}
              </SelectItem>
              <SelectItem value={IssueStatus.URGENT}>
                {i18n.language === 'en' ? 'Urgent' : 
                 i18n.language === 'es' ? 'Urgente' : 
                 i18n.language === 'pl' ? 'Pilne' : 
                 t('status.urgent')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading && <IssueListSkeleton />}
      
      {/* Error state */}
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6">
          <h3 className="font-medium text-destructive">{t('common.error')}</h3>
          <p className="text-sm">{t('issues.loadingError')}</p>
        </div>
      )}
      
      {/* Empty state */}
      {!isLoading && issues && issues.length === 0 && (
        <EmptyState message={i18n.language === 'en' ? 'No issues found' : 
                           i18n.language === 'es' ? 'No se encontraron problemas' : 
                           i18n.language === 'pl' ? 'Nie znaleziono problemów' : 
                           'No issues found'} />
      )}
      
      {/* Issues list */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {issues?.map((issue) => (
          <Card key={issue.id} className="overflow-hidden">
            <CardHeader className="px-6 py-4 pb-0 flex flex-row justify-between items-start">
              <div>
                <CardTitle className="line-clamp-1">{issue.title}</CardTitle>
                <CardDescription className="line-clamp-1">
                  <span className="inline-flex items-center mr-2">
                    <MapPin className="h-3 w-3 mr-1" />
                    {issue.location}
                  </span>
                </CardDescription>
              </div>
              
              <StatusBadge status={issue.status} />
            </CardHeader>
            
            <CardContent className="px-6 py-4">
              <p className="text-sm mb-4 line-clamp-2">{issue.description}</p>
              
              {/* Images gallery */}
              {issue.imageUrls && issue.imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {issue.imageUrls.map((url, index) => (
                    <div 
                      key={`${issue.id}-img-${index}`} 
                      className="w-16 h-16 rounded-md overflow-hidden cursor-pointer border"
                      onClick={() => setSelectedImage(url)}
                    >
                      <img 
                        src={url} 
                        alt={`Issue ${issue.id} image ${index + 1}`} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/assets/placeholder-image.svg'; // Fallback to placeholder
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex flex-wrap gap-y-2 text-xs text-muted-foreground mb-4">
                <div className="flex items-center mr-4">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center">
                  <span className="font-medium">
                    {i18n.language === 'en' ? 'Reported by' : 
                     i18n.language === 'es' ? 'Reportado por' : 
                     i18n.language === 'pl' ? 'Zgłoszone przez' : 
                     'Reported by'}:
                  </span>
                  <span className="ml-1">{issue.reportedByName || t('common.unknown')}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedIssue(issue)}
                >
                  {i18n.language === 'en' ? 'View' : 
                   i18n.language === 'es' ? 'Ver' : 
                   i18n.language === 'pl' ? 'Zobacz' : 
                   'View'}
                </Button>
                
                {issue.status === IssueStatus.PENDING && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleScheduleRepair(issue)}
                  >
                    <CalendarClock className="h-3 w-3 mr-1" />
                    {i18n.language === 'en' ? 'Schedule' : 
                     i18n.language === 'es' ? 'Programar' : 
                     i18n.language === 'pl' ? 'Zaplanuj' : 
                     'Schedule'}
                  </Button>
                )}
                
                {issue.status === IssueStatus.SCHEDULED && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleMarkInProgress(issue)}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {i18n.language === 'en' ? 'Start Work' : 
                     i18n.language === 'es' ? 'Comenzar Trabajo' : 
                     i18n.language === 'pl' ? 'Rozpocznij Pracę' : 
                     'Start Work'}
                  </Button>
                )}
                
                {issue.status === IssueStatus.IN_PROGRESS && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleMarkComplete(issue)}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t('issues.markComplete')}
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteIssue(issue)}
                >
                  <Trash className="h-3 w-3 mr-1" />
                  {t('common.delete')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('issues.confirmDelete')}</DialogTitle>
            <DialogDescription>
              {t('issues.confirmDeleteDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteIssue}
              disabled={deleteIssueMutation.isPending}
            >
              {deleteIssueMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Schedule repair dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {i18n.language === 'en' ? 'Schedule Repair' : 
               i18n.language === 'es' ? 'Programar Reparación' : 
               i18n.language === 'pl' ? 'Zaplanuj Naprawę' : 
               'Schedule Repair'}
            </DialogTitle>
            <DialogDescription>
              {i18n.language === 'en' ? 'Add notes for the repair team and schedule this issue for maintenance.' : 
               i18n.language === 'es' ? 'Agregue notas para el equipo de reparación y programe este problema para mantenimiento.' : 
               i18n.language === 'pl' ? 'Dodaj notatki dla zespołu naprawczego i zaplanuj ten problem do konserwacji.' : 
               'Add notes for the repair team and schedule this issue for maintenance.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            {/* Date Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {i18n.language === 'en' ? 'Select Repair Date' : 
                 i18n.language === 'es' ? 'Seleccionar Fecha de Reparación' : 
                 i18n.language === 'pl' ? 'Wybierz Datę Naprawy' : 
                 'Select Repair Date'}
              </Label>
              <Input
                type="date"
                value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(new Date(e.target.value));
                  } else {
                    setSelectedDate(undefined);
                  }
                }}
                min={format(new Date(), "yyyy-MM-dd")}
                className="w-full"
              />
            </div>

            {/* Time Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {i18n.language === 'en' ? 'Select Time' : 
                 i18n.language === 'es' ? 'Seleccionar Hora' : 
                 i18n.language === 'pl' ? 'Wybierz Godzinę' : 
                 'Select Time'}
              </Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={
                    i18n.language === 'en' ? 'Select time' : 
                    i18n.language === 'es' ? 'Seleccionar hora' : 
                    i18n.language === 'pl' ? 'Wybierz godzinę' : 
                    'Select time'
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="08:00">08:00</SelectItem>
                  <SelectItem value="09:00">09:00</SelectItem>
                  <SelectItem value="10:00">10:00</SelectItem>
                  <SelectItem value="11:00">11:00</SelectItem>
                  <SelectItem value="12:00">12:00</SelectItem>
                  <SelectItem value="13:00">13:00</SelectItem>
                  <SelectItem value="14:00">14:00</SelectItem>
                  <SelectItem value="15:00">15:00</SelectItem>
                  <SelectItem value="16:00">16:00</SelectItem>
                  <SelectItem value="17:00">17:00</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scheduling Notes */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {i18n.language === 'en' ? 'Scheduling Notes' : 
                 i18n.language === 'es' ? 'Notas de Programación' : 
                 i18n.language === 'pl' ? 'Notatki Planowania' : 
                 'Scheduling Notes'}
              </Label>
              <Textarea
                value={schedulingNotes}
                onChange={(e) => setSchedulingNotes(e.target.value)}
                placeholder={i18n.language === 'en' ? 'Add notes for the repair team...' : 
                            i18n.language === 'es' ? 'Agregar notas para el equipo de reparación...' : 
                            i18n.language === 'pl' ? 'Dodaj notatki dla zespołu naprawczego...' : 
                            'Add notes for the repair team...'}
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setScheduleDialogOpen(false)}
            >
              {i18n.language === 'en' ? 'Cancel' : 
               i18n.language === 'es' ? 'Cancelar' : 
               i18n.language === 'pl' ? 'Anuluj' : 
               'Cancel'}
            </Button>
            <Button 
              variant="default" 
              onClick={confirmScheduleRepair}
              disabled={updateStatusMutation.isPending || !selectedDate}
            >
              {updateStatusMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {i18n.language === 'en' ? 'Schedule Repair' : 
               i18n.language === 'es' ? 'Programar Reparación' : 
               i18n.language === 'pl' ? 'Zaplanuj Naprawę' : 
               'Schedule Repair'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Image viewer */}
      {selectedImage && (
        <ImageViewer
          imageUrl={selectedImage}
          alt="Issue image"
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
      
      {/* Issue details dialog */}
      {selectedIssue && (
        <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedIssue.title}</DialogTitle>
              <DialogDescription>
                {selectedIssue.location} • {new Date(selectedIssue.createdAt).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">
                  {i18n.language === 'pl' ? 'Opis' : i18n.language === 'es' ? 'Descripción' : 'Description'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {selectedIssue.description || (i18n.language === 'pl' ? 'Brak opisu' : i18n.language === 'es' ? 'Sin descripción' : 'No description provided')}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={selectedIssue.status} />
                <PriorityBadge priority={selectedIssue.priority} />
              </div>
              {selectedIssue.status === 'scheduled' && selectedIssue.scheduledDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-blue-900 mb-1">
                    {i18n.language === 'pl' ? 'Naprawa zaplanowana na:' : i18n.language === 'es' ? 'Reparación programada para:' : 'Repair scheduled for:'}
                  </h4>
                  <p className="text-sm text-blue-700 mb-2">
                    {new Date(selectedIssue.scheduledDate).toLocaleString()}
                  </p>
                  {selectedIssue.scheduledByName && (
                    <p className="text-sm text-blue-600 mb-1">
                      <span className="font-medium">
                        {i18n.language === 'pl' ? 'Zaplanowane przez:' : i18n.language === 'es' ? 'Programado por:' : 'Scheduled by:'}
                      </span> {selectedIssue.scheduledByName}
                    </p>
                  )}
                  {selectedIssue.notes && selectedIssue.notes.trim() && (
                    <p className="text-sm text-blue-600">
                      <span className="font-medium">
                        {i18n.language === 'pl' ? 'Notatki:' : i18n.language === 'es' ? 'Notas:' : 'Notes:'}
                      </span> {selectedIssue.notes}
                    </p>
                  )}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {i18n.language === 'pl' ? 'Zgłoszone przez:' : i18n.language === 'es' ? 'Reportado por:' : 'Reported by:'} {selectedIssue.reportedByName || (i18n.language === 'pl' ? 'Nieznany' : i18n.language === 'es' ? 'Desconocido' : 'Unknown')}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  
  let variant: 
    | "default"
    | "secondary"
    | "destructive"
    | "outline" = "secondary";
  
  let label = t('status.unknown');
  let icon: React.ReactNode = null;
  
  switch (status) {
    case IssueStatus.PENDING:
      variant = "secondary";
      label = t('status.pending');
      icon = <Clock className="h-3 w-3 mr-1" />;
      break;
    case IssueStatus.IN_PROGRESS:
      variant = "default";
      label = t('status.inProgress');
      icon = <Clock className="h-3 w-3 mr-1" />;
      break;
    case IssueStatus.COMPLETED:
      variant = "outline";
      label = t('status.completed');
      icon = <CheckCircle className="h-3 w-3 mr-1" />;
      break;
    case IssueStatus.SCHEDULED:
      variant = "secondary";
      label = t('status.scheduled');
      icon = <CalendarClock className="h-3 w-3 mr-1" />;
      break;
    case IssueStatus.URGENT:
      variant = "destructive";
      label = t('status.urgent');
      icon = <AlertTriangle className="h-3 w-3 mr-1" />;
      break;
  }
  
  return (
    <Badge variant={variant} className="ml-2 flex items-center">
      {icon}
      {label}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const { t, i18n } = useTranslation();
  
  let variant: 
    | "default"
    | "secondary"
    | "destructive"
    | "outline" = "default";
  
  let label = priority;
  
  switch (priority) {
    case 'low':
      variant = "secondary";
      label = i18n.language === 'pl' ? 'Niski' : i18n.language === 'es' ? 'Bajo' : 'Low';
      break;
    case 'medium':
      variant = "default";
      label = i18n.language === 'pl' ? 'Średni' : i18n.language === 'es' ? 'Medio' : 'Medium';
      break;
    case 'high':
      variant = "destructive";
      label = i18n.language === 'pl' ? 'Wysoki' : i18n.language === 'es' ? 'Alto' : 'High';
      break;
  }
  
  return (
    <Badge variant={variant}>
      {label}
    </Badge>
  );
}

function EmptyState({ message }: { message: string }) {
  const { i18n } = useTranslation();
  
  return (
    <div className="border rounded-lg p-8 flex flex-col items-center justify-center text-center">
      <div className="bg-primary/10 p-3 rounded-full mb-4">
        <MapPin className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-medium mb-2">{message}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {i18n.language === 'en' ? 'Adjust your filters or check back later' : 
         i18n.language === 'es' ? 'Ajusta los filtros o vuelve más tarde' : 
         i18n.language === 'pl' ? 'Dostosuj filtry lub sprawdź później' : 
         'Adjust your filters or check back later'}
      </p>
    </div>
  );
}

function IssueListSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="px-6 py-4 pb-0">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="px-6 py-4">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}