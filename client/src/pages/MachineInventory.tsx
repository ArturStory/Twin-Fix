import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { Link, useLocation, useRoute } from 'wouter';
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

// Image viewer component for full-screen view
interface ImageViewerProps {
  imageUrl: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

function ImageViewer({ imageUrl, alt, isOpen, onClose }: ImageViewerProps) {
  const { t } = useTranslation();
  
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
          aria-label={t('common.close')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <img 
          src={imageUrl} 
          alt={alt || t('inventory.machineImage')} 
          className="max-w-full max-h-[90vh] object-contain" 
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, AlertTriangle, CheckCircle, Clock, Settings, Plus, Wrench, MapPin, Calendar } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { format, differenceInDays, addDays } from 'date-fns';
import { pl, es, enUS } from 'date-fns/locale';

// Type definitions based on machine schema
interface Machine {
  id: number;
  name: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  installationDate: string;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  location: string;
  floor?: string;
  room?: string;
  categoryId: number;
  description: string | null;
  status: string;
  serviceIntervalDays: number;
  pinX: number | null;
  pinY: number | null;
  isInteriorPin: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string | null;
  category?: MachineCategory;
}

interface MachineCategory {
  id: number;
  name: string;
  description: string | null;
  serviceIntervalDays: number;
}

interface MachineService {
  id: number;
  machineId: number;
  serviceDate: string;
  technicianId: number | null;
  technicianName: string | null;
  description: string;
  cost: number | null;
  isCompleted: boolean;
  notes: string | null;
}

// New type for adding a machine
interface NewMachine {
  name: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  installationDate: string;
  lastServiceDate?: string;
  location: string;
  floor?: string;
  room?: string;
  categoryId: number;
  description: string;
  notes: string;
  serviceIntervalDays: number;
  image?: File | null;
  imageUrl?: string | null;
}

// Type definition for a custom location
interface CustomLocation {
  id: string;
  name: string;
  address: string;
  type: string;
  isCustom: boolean;
}

// Define issue type that includes imageUrls field and machine relationship
type IssueWithImages = {
  id: number;
  title: string;
  description: string;
  location: string;
  status: string;
  priority: string;
  createdAt?: string;
  updatedAt?: string;
  reporterId?: number;
  reportedByName?: string;
  technicianId?: number | null;
  imageUrls?: string[] | null;
  machineId?: number | null;
  category?: string;
}

export default function MachineInventory() {
  // Initialize translation hook
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
  
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/machines?:location*');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [customLocations, setCustomLocations] = useState<CustomLocation[]>([]);
  const { toast } = useToast();
  
  // Dialog state for adding a new machine
  const [showAddMachineDialog, setShowAddMachineDialog] = useState(false);
  // State for new machine form
  const [newMachine, setNewMachine] = useState<Partial<NewMachine>>({
    installationDate: format(new Date(), "yyyy-MM-dd"),
    lastServiceDate: "",
    serviceIntervalDays: 90,
    floor: "",
    room: "",
  });
  const [addingMachine, setAddingMachine] = useState(false);
  
  // State for managing custom location in the machine dialog
  const [showAddLocationInMachineDialog, setShowAddLocationInMachineDialog] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  
  // State for managing custom categories
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [editingCategory, setEditingCategory] = useState<MachineCategory | null>(null);
  
  // State for adding new categories in the management dialog
  const [addNewCategoryName, setAddNewCategoryName] = useState("");
  const [addNewCategoryDescription, setAddNewCategoryDescription] = useState("");
  const [addNewCategoryServiceInterval, setAddNewCategoryServiceInterval] = useState("180");
  
  // State for removing categories
  const [categoryToRemove, setCategoryToRemove] = useState("");
  
  // State for machine details dialog
  const [showMachineDetailsDialog, setShowMachineDetailsDialog] = useState(false);
  const [newCategoryServiceInterval, setNewCategoryServiceInterval] = useState("90");
  const [customCategories, setCustomCategories] = useState<MachineCategory[]>([]);
  
  // State for schedule service dialog
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [machineToSchedule, setMachineToSchedule] = useState<Machine | null>(null);
  const [showEditMachineDialog, setShowEditMachineDialog] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [scheduledServices, setScheduledServices] = useState<Array<{
    machineId: number;
    serviceDate: string;
    technician: string;
    description: string;
    status: string;
    cost?: string;
  }>>([]);
  
  // State for schedule service form
  const [serviceDate, setServiceDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [serviceDescription, setServiceDescription] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [availableTechnicians, setAvailableTechnicians] = useState<Array<{id: number, username: string, role: string}>>([]);
  
  // Fetch technicians when component mounts
  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const response = await fetch('/api/users/technicians');
        if (response.ok) {
          const technicians = await response.json();
          setAvailableTechnicians(technicians);
        }
      } catch (error) {
        console.error('Failed to fetch technicians:', error);
      }
    };
    
    fetchTechnicians();
  }, []);
  
  // State for overdue services dialog
  const [showOverdueServicesDialog, setShowOverdueServicesDialog] = useState(false);
  const [showUpcomingServicesDialog, setShowUpcomingServicesDialog] = useState(false);
  
  // State for machine removal confirmation
  const [showRemoveMachineDialog, setShowRemoveMachineDialog] = useState(false);
  const [machineToRemove, setMachineToRemove] = useState<Machine | null>(null);
  
  // State for location management
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<Array<{id: string, name: string}>>([]);
  const [selectedLocationForChange, setSelectedLocationForChange] = useState<string>("");
  
  // Image viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  
  // Load custom categories and custom machines from localStorage on component mount
  useEffect(() => {
    // Load custom categories
    const savedCategories = localStorage.getItem('customCategories');
    if (savedCategories) {
      const parsedCategories = JSON.parse(savedCategories);
      setCustomCategories(parsedCategories);
      
      // Update query client data to include custom categories
      queryClient.setQueryData(['/api/machine-categories'], (oldData: MachineCategory[] | undefined) => {
        if (!oldData) return parsedCategories;
        
        // Merge, avoiding duplicates by ID
        const existingIds = new Set(oldData.map(cat => cat.id));
        const newCategories = parsedCategories.filter((cat: MachineCategory) => !existingIds.has(cat.id));
        
        return [...oldData, ...newCategories];
      });
    }
    
    // Load custom machines
    const savedMachines = localStorage.getItem('machines');
    if (savedMachines) {
      try {
        const parsedMachines = JSON.parse(savedMachines);
        console.log(`Loaded ${parsedMachines.length} machines from localStorage`);
        
        // Update query client data to include custom machines
        queryClient.setQueryData(['/api/machines', locationId], (oldData: Machine[] | undefined) => {
          if (!oldData) return parsedMachines;
          
          // Merge, avoiding duplicates by ID
          const existingIds = new Set(oldData.map(m => m.id));
          const newMachines = parsedMachines.filter((m: Machine) => !existingIds.has(m.id));
          
          return [...oldData, ...newMachines];
        });
      } catch (error) {
        console.error("Error loading machines from localStorage:", error);
      }
    }
  }, [locationId]);
  
  // Check if location is selected, otherwise redirect to location selection
  useEffect(() => {
    // Get location from query parameter or localStorage
    const locationFromParams = new URLSearchParams(window.location.search).get('location');
    const locationFromStorage = localStorage.getItem('selectedLocation');
    const selectedLocationId = locationFromParams || locationFromStorage;
    
    if (!selectedLocationId) {
      // No location selected, redirect to location selection
      setLocation('/location-select');
    } else {
      // Save location to state and localStorage
      setLocationId(selectedLocationId);
      if (!locationFromStorage) {
        localStorage.setItem('selectedLocation', selectedLocationId);
      }
      
      // Load custom locations from localStorage
      const savedLocations = localStorage.getItem('customLocations');
      const customLocs = savedLocations ? JSON.parse(savedLocations) : [];
      setCustomLocations(customLocs);
      
      // Determine the location name for display
      if (selectedLocationId.startsWith('custom-')) {
        // Find the custom location by ID
        const customLocation = customLocs.find((loc: CustomLocation) => loc.id === selectedLocationId);
        if (customLocation) {
          setLocationName(customLocation.name);
          // Set the location for the new machine form
          setNewMachine(prev => ({ ...prev, location: customLocation.name }));
        }
      } else {
        // This is a default location - you could fetch the location name from the API
        // For now, we'll use hardcoded names based on the ID
        const locationNames = {
          '1': 'Jakubowski McDonald\'s',
          '2': 'Centrum McDonald\'s',
          '3': 'Galeria Baltycka McDonald\'s'
        };
        const name = locationNames[selectedLocationId as keyof typeof locationNames] || `Location ${selectedLocationId}`;
        setLocationName(name);
        // Set the location for the new machine form
        setNewMachine(prev => ({ ...prev, location: name }));
      }
    }
  }, [setLocation, locationId]);

  // Fetch shared locations from database
  const { data: sharedLocations = [] } = useQuery<any[]>({
    queryKey: ['/api/shared-locations'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch user permissions
  const { data: permissions } = useQuery<{
    canAddLocations: boolean;
    canScheduleRepairs: boolean;
    canManageUsers: boolean;
    canDeleteIssues: boolean;
    role: string;
    authenticated: boolean;
  }>({
    queryKey: ['/api/user-permissions'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Load available locations for the dialogs
  useEffect(() => {
    // Custom locations from localStorage (keep for backward compatibility)
    const savedLocations = localStorage.getItem('customLocations');
    const customLocs = savedLocations ? JSON.parse(savedLocations) : [];
    
    // Combine shared locations from database with localStorage custom locations
    const allLocations = [
      // Shared locations from database
      ...sharedLocations.map((loc: any) => ({
        id: loc.id.toString(),
        name: loc.name
      })),
      // Custom locations from localStorage (for backward compatibility)
      ...customLocs.map((loc: CustomLocation) => ({
        id: loc.id,
        name: loc.name
      }))
    ];
    
    // Remove duplicates based on name
    const uniqueLocations = allLocations.filter((location, index, self) => 
      index === self.findIndex(l => l.name.toLowerCase() === location.name.toLowerCase())
    );
    
    setAvailableLocations(uniqueLocations);
  }, [sharedLocations, customLocations]);

  // Fetch machines filtered by location
  const { data: machines = [], isLoading: machinesLoading, error: machinesError } = useQuery<Machine[]>({
    queryKey: ['/api/machines', locationId, locationName],
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!locationId && !!locationName, // Only fetch when both locationId and locationName are available
    queryFn: async () => {
      console.log('Fetching machines for locationId:', locationId, 'locationName:', locationName);
      try {
        // Get machines from localStorage
        const storedMachines = localStorage.getItem('machines');
        const localMachines = storedMachines ? JSON.parse(storedMachines) : [];
        
        // Try to fetch from API as well
        try {
          const response = await fetch('/api/machines');
          if (response.ok) {
            const apiMachines = await response.json();
            
            // Merge localStorage machines with API machines
            // Use Map to avoid duplicates by ID, showing both sources
            const machineMap = new Map();
            
            // Add API machines first (official data from database)
            apiMachines.forEach((machine: Machine) => {
              machineMap.set(machine.id, machine);
            });
            
            // Then add localStorage machines that don't conflict with API machines
            // Use a different ID range for localStorage machines to avoid conflicts
            localMachines.forEach((machine: Machine) => {
              // If this machine ID already exists in API, give it a new ID to avoid conflict
              let machineId = machine.id;
              if (machineMap.has(machineId)) {
                // Generate a new ID for localStorage machine (use high numbers to avoid conflict)
                machineId = 10000 + Math.floor(Math.random() * 90000);
              }
              machineMap.set(machineId, { ...machine, id: machineId });
            });
            
            // Convert Map back to array
            const allMachines = Array.from(machineMap.values());
            
            // Filter machines by current location
            const filteredMachines = allMachines.filter(machine => {
              // Check if machine location matches current location name
              if (!machine.location || !locationName) return false;
              
              // Exact match for location names
              const machineLocation = machine.location.toLowerCase().trim();
              const currentLocation = locationName.toLowerCase().trim();
              
              // Match if the machine location exactly matches the current location
              return machineLocation === currentLocation;
            });
            
            console.log('Found machines - localStorage:', localMachines.length, 'API:', apiMachines.length, 'Total:', allMachines.length, 'Filtered for location:', filteredMachines.length, 'Current location:', locationName);
            return filteredMachines;
          }
        } catch (apiError) {
          console.error("Error fetching machines from API:", apiError);
        }
        
        // If API fetch fails, filter localStorage machines by location
        const filteredLocalMachines = localMachines.filter((machine: Machine) => {
          if (!machine.location || !locationName) return false;
          
          // Exact match for location names
          const machineLocation = machine.location.toLowerCase().trim();
          const currentLocation = locationName.toLowerCase().trim();
          
          // Match if the machine location exactly matches the current location
          return machineLocation === currentLocation;
        });
        console.log('API failed, returning filtered localStorage machines:', filteredLocalMachines.length);
        return filteredLocalMachines;
      } catch (error) {
        console.error("Error fetching machines:", error);
        return [];
      }
    }
  });

  // Fetch machine categories from database
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<MachineCategory[]>({
    queryKey: ['/api/machine-categories'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch service history for selected machine - only real data, no mock data
  const { data: serviceHistory = [], isLoading: serviceHistoryLoading } = useQuery<MachineService[]>({
    queryKey: ['/api/machines', selectedMachine?.id, 'services'],
    enabled: !!selectedMachine,
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async () => {
      if (!selectedMachine?.id) return [];
      
      try {
        const response = await fetch(`/api/machines/${selectedMachine.id}/services`);
        if (!response.ok) {
          // If API returns error or no data, return empty array instead of mock data
          return [];
        }
        
        const data = await response.json();
        
        // Filter out any obviously fake/test data
        const realServiceHistory = data.filter((service: MachineService) => {
          // Only include services that have proper dates and meaningful descriptions
          return service.serviceDate && 
                 service.serviceDate !== 'No date' &&
                 service.description && 
                 service.description.length > 3 && // Avoid random short strings
                 !service.description.match(/^[a-z]{3,8}$/); // Filter out random lowercase strings like "dwjeodnk"
        });
        
        return realServiceHistory;
      } catch (error) {
        console.error('Error fetching service history:', error);
        return [];
      }
    }
  });
  
  // Fetch issues
  const { data: allIssues = [] } = useQuery<IssueWithImages[]>({
    queryKey: ["/api/issues"],
    staleTime: 10000,
  });
  
  // Filter issues by location and machine
  const issuesByLocation = React.useMemo(() => {
    if (!allIssues.length || !locationName) return [];
    
    // Function to normalize text for comparison
    const normalizeText = (text: string): string => {
      return text.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove non-alphanumeric characters
        .replace(/\s+/g, ' ')    // Replace multiple spaces with a single space
        .trim();                  // Remove leading/trailing whitespace
    };
    
    // Filter issues that belong to the current location
    return allIssues.filter(issue => {
      if (!issue.location) return false;
      
      const issueLocation = normalizeText(issue.location);
      const currentLocation = normalizeText(locationName);
      
      // Check for matches in standard locations
      if (locationId === "1") {
        // Special handling for Jakubowski McDonald's
        return issueLocation.includes("jakubowski") || 
               issueLocation.includes("bazynskiego") ||
               issue.location.includes(locationName);
      } 
      
      if (locationId === "2") {
        // Special handling for Centrum McDonald's
        return issueLocation.includes("centrum") || 
               issueLocation.includes("zlota") ||
               issue.location.includes(locationName);
      } 
      
      if (locationId === "3") {
        // Special handling for Galeria Baltycka McDonald's
        return issueLocation.includes("baltycka") || 
               issueLocation.includes("galeria") ||
               issue.location.includes(locationName);
      }
      
      // For custom locations, ensure we match the location name
      if (locationId?.startsWith("custom-")) {
        const keyParts = currentLocation.split(' ')
          .filter(part => part.length > 3);
        return keyParts.every(part => issueLocation.includes(part));
      }
      
      // Fallback - match on location name
      return issueLocation.includes(currentLocation);
    });
  }, [allIssues, locationName, locationId]);

  // Function to get issues for a specific machine
  const getIssuesForMachine = (machine: Machine) => {
    return issuesByLocation.filter(issue => {
      // Check if issue is related to this specific machine via machineId
      if (issue.machineId && machine.id) {
        return issue.machineId === machine.id;
      }
      
      // Check if issue category is 'machine' and mentions this machine
      if (issue.category === 'machine') {
        const issueLower = (issue.title + ' ' + issue.description).toLowerCase();
        const machineNameLower = machine.name.toLowerCase();
        const machineSerialLower = machine.serialNumber.toLowerCase();
        
        return issueLower.includes(machineNameLower) || 
               issueLower.includes(machineSerialLower);
      }
      
      return false;
    });
  };

  const getMachineStatusColor = (machine: Machine) => {
    if (!machine.nextServiceDate) return "bg-gray-200";
    
    try {
      const nextService = new Date(machine.nextServiceDate);
      const today = new Date();
      const daysUntilService = differenceInDays(nextService, today);
      
      if (daysUntilService < 0) return "bg-red-500"; // Overdue
      if (daysUntilService < 7) return "bg-orange-400"; // Soon
      if (daysUntilService < 14) return "bg-yellow-300"; // Upcoming
      return "bg-green-400"; // Scheduled
    } catch (error) {
      console.error("Invalid date format:", machine.nextServiceDate);
      return "bg-gray-200"; // Fallback color for invalid dates
    }
  };

  const getMachineStatusText = (machine: Machine) => {
    if (!machine.nextServiceDate) {
      return i18n.language === 'en' ? 'Not scheduled' : 
             i18n.language === 'es' ? 'No programado' : 
             i18n.language === 'pl' ? 'Nie zaplanowane' : 'Not scheduled';
    }
    
    try {
      const nextService = new Date(machine.nextServiceDate);
      const today = new Date();
      const daysUntilService = differenceInDays(nextService, today);
      
      if (daysUntilService < 0) {
        const days = Math.abs(daysUntilService);
        return i18n.language === 'en' ? `Overdue by ${days} days` : 
               i18n.language === 'es' ? `Atrasado por ${days} días` : 
               i18n.language === 'pl' ? `Opóźnione o ${days} dni` : `Overdue by ${days} days`;
      }
      if (daysUntilService === 0) {
        return i18n.language === 'en' ? 'Due today' : 
               i18n.language === 'es' ? 'Vence hoy' : 
               i18n.language === 'pl' ? 'Termin dzisiaj' : 'Due today';
      }
      return i18n.language === 'en' ? `Due in ${daysUntilService} days` : 
             i18n.language === 'es' ? `Vence en ${daysUntilService} días` : 
             i18n.language === 'pl' ? `Termin za ${daysUntilService} dni` : `Due in ${daysUntilService} days`;
    } catch (error) {
      console.error("Invalid date format in getMachineStatusText:", machine.nextServiceDate);
      return i18n.language === 'en' ? 'Unknown status' : 
             i18n.language === 'es' ? 'Estado desconocido' : 
             i18n.language === 'pl' ? 'Status nieznany' : 'Unknown status';
    }
  };

  const getServiceProgressPercent = (machine: Machine) => {
    if (!machine.lastServiceDate || !machine.nextServiceDate) return 0;
    
    try {
      const lastService = new Date(machine.lastServiceDate);
      const nextService = new Date(machine.nextServiceDate);
      const today = new Date();
      
      const totalInterval = differenceInDays(nextService, lastService);
      const daysPassed = differenceInDays(today, lastService);
      
      // Calculate percentage of time elapsed since last service
      const percentComplete = Math.min(100, Math.max(0, (daysPassed / totalInterval) * 100));
      return percentComplete;
    } catch (error) {
      console.error("Invalid date format in getServiceProgressPercent:", 
        { lastServiceDate: machine.lastServiceDate, nextServiceDate: machine.nextServiceDate });
      return 0;
    }
  };

  const getMachineStatusIcon = (machine: Machine) => {
    if (!machine.nextServiceDate) return <Clock className="h-5 w-5 text-gray-500" />;
    
    try {
      const nextService = new Date(machine.nextServiceDate);
      const today = new Date();
      const daysUntilService = differenceInDays(nextService, today);
      
      if (daysUntilService < 0) return <AlertTriangle className="h-5 w-5 text-red-500" />;
      if (daysUntilService < 7) return <Wrench className="h-5 w-5 text-orange-500" />;
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } catch (error) {
      console.error("Invalid date format in getMachineStatusIcon:", machine.nextServiceDate);
      return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  // Handle loading state
  if (machinesLoading || categoriesLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-gray-500">{t('form.loading')}</p>
      </div>
    );
  }

  // Handle error state
  if (machinesError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="h-8 w-8 text-red-500 mb-4" />
        <p className="text-red-500 font-medium">{t('errors.loadingFailed')}</p>
        <p className="text-gray-500 mt-2">{t('errors.serverError')}</p>
      </div>
    );
  }

  // Handler for adding a new location within the machine dialog
  const handleAddLocationInMachineDialog = () => {
    if (!newLocationName || !newLocationAddress) return;
    
    // Create a unique ID for the custom location
    const newLocationId = `custom-${Date.now()}`;
    
    // Create the new location object
    const newLocation: CustomLocation = {
      id: newLocationId,
      name: newLocationName,
      address: newLocationAddress,
      type: "restaurant",
      isCustom: true
    };
    
    // Add to custom locations
    const updatedLocations = [...customLocations, newLocation];
    setCustomLocations(updatedLocations);
    
    // Save to localStorage
    localStorage.setItem('customLocations', JSON.stringify(updatedLocations));
    
    // Update the new machine form with this location
    setNewMachine(prev => ({ ...prev, location: newLocationName }));
    console.log("Added new location and updated form:", newLocationName);
    
    // Reset form and close dialog
    setNewLocationName("");
    setNewLocationAddress("");
    setShowAddLocationInMachineDialog(false);
  };
  
  // Handler for adding a new machine to the inventory
  const handleAddMachine = async () => {
    if (!newMachine.name || !newMachine.serialNumber || !newMachine.location || !newMachine.categoryId) {
      // Missing required fields
      return;
    }
    
    setAddingMachine(true);
    
    try {
      let imageUrl = null;
      
      // Upload image first if one is selected
      if (newMachine.image) {
        const formData = new FormData();
        formData.append('photo', newMachine.image);
        
        const imageResponse = await fetch('/api/machines/upload-photo', {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        
        if (imageResponse.ok) {
          const imageResult = await imageResponse.json();
          imageUrl = imageResult.imageUrl;
        }
      }
      
      // Call the API to create the machine
      const response = await fetch('/api/machines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newMachine.name,
          serialNumber: newMachine.serialNumber,
          manufacturer: newMachine.manufacturer,
          model: newMachine.model,
          location: newMachine.location,
          floor: newMachine.floor,
          room: newMachine.room,
          categoryId: newMachine.categoryId,
          installationDate: newMachine.installationDate,
          lastServiceDate: newMachine.lastServiceDate || null,
          serviceIntervalDays: newMachine.serviceIntervalDays,
          description: newMachine.description,
          notes: newMachine.notes,
          imageUrl: imageUrl,
          status: 'active'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create machine');
      }

      const createdMachine = await response.json();
      
      // Invalidate and refetch the machines query to get the updated list
      queryClient.invalidateQueries({ queryKey: ['/api/machines', locationId] });
      
      // Also add to localStorage for consistency with existing data
      const existingMachinesJson = localStorage.getItem('machines') || '[]';
      let existingMachines = JSON.parse(existingMachinesJson);
      
      // Add the new machine to localStorage
      const updatedMachines = [...existingMachines, createdMachine];
      localStorage.setItem('machines', JSON.stringify(updatedMachines));
      
      // Reset form and close dialog
      setNewMachine({
        installationDate: format(new Date(), "yyyy-MM-dd"),
        lastServiceDate: "",
        serviceIntervalDays: 90,
        floor: "",
        room: "",
      });
      setShowAddMachineDialog(false);
    } catch (error) {
      console.error("Error adding machine:", error);
    } finally {
      setAddingMachine(false);
    }
  };

  // Handle input change for new machine form
  const handleNewMachineInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric inputs differently
    if (name === 'serviceIntervalDays') {
      const numValue = parseInt(value);
      setNewMachine(prev => ({ ...prev, [name]: isNaN(numValue) ? 90 : numValue }));
    } else {
      setNewMachine(prev => ({ ...prev, [name]: value }));
    }
    
    // Log for debugging
    console.log(`Updated ${name}:`, value);
  };

  // Handle saving edited machine
  const handleSaveEditedMachine = async () => {
    if (!editingMachine) return;
    
    try {
      // Call the API to update the machine
      const response = await fetch(`/api/machines/${editingMachine.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(editingMachine)
      });

      if (!response.ok) {
        throw new Error('Failed to update machine');
      }

      const updatedMachine = await response.json();
      
      // Update localStorage for consistency
      const existingMachinesJson = localStorage.getItem('machines') || '[]';
      let existingMachines = JSON.parse(existingMachinesJson);
      
      existingMachines = existingMachines.map((m: Machine) => 
        m.id === editingMachine.id ? updatedMachine : m
      );
      
      localStorage.setItem('machines', JSON.stringify(existingMachines));
      
      // Invalidate and refetch the machines query
      queryClient.invalidateQueries({ queryKey: ['/api/machines', locationId] });

      setEditingMachine(null);
      setShowEditMachineDialog(false);
      
    } catch (error) {
      console.error("Error saving edited machine:", error);
    }
  };
  
  // Handle image upload for new machine
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setNewMachine(prev => ({ ...prev, image: file }));
      
      // Create a preview URL for the uploaded image
      const imageUrl = URL.createObjectURL(file);
      setNewMachine(prev => ({ ...prev, imageUrl }));
    }
  };
  
  // Handle image drop from drag and drop
  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Only accept image files
      if (file.type.startsWith('image/')) {
        setNewMachine(prev => ({ ...prev, image: file }));
        
        // Create a preview URL for the dropped image
        const imageUrl = URL.createObjectURL(file);
        setNewMachine(prev => ({ ...prev, imageUrl }));
      }
    }
  };
  
  // Handle camera capture (triggered by the camera button)
  const handleCameraCapture = () => {
    // Create a hidden file input for triggering the camera
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use the environment-facing camera (usually back camera)
    
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        setNewMachine(prev => ({ ...prev, image: file }));
        
        // Create a preview URL for the captured image
        const imageUrl = URL.createObjectURL(file);
        setNewMachine(prev => ({ ...prev, imageUrl }));
      }
    };
    
    // Trigger the file input click event to open the camera
    input.click();
  };
  
  // Handler for removing a machine
  const handleRemoveMachine = async () => {
    if (!machineToRemove) return;
    
    try {
      // Call the API to delete the machine
      const response = await fetch(`/api/machines/${machineToRemove.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete machine');
      }
      
      // Update localStorage for consistency
      const existingMachinesJson = localStorage.getItem('machines') || '[]';
      const existingMachines = JSON.parse(existingMachinesJson);
      const updatedMachines = existingMachines.filter((m: Machine) => m.id !== machineToRemove.id);
      localStorage.setItem('machines', JSON.stringify(updatedMachines));
      
      // Invalidate and refetch the machines query
      queryClient.invalidateQueries({ queryKey: ['/api/machines', locationId] });
      
      // Reset state and close dialog
      setMachineToRemove(null);
      setShowRemoveMachineDialog(false);
      
      // Show toast notification
      toast({
        title: "Machine removed",
        description: `${machineToRemove.name} has been removed from inventory.`,
      });
    } catch (error) {
      console.error("Error removing machine:", error);
      toast({
        title: "Error",
        description: "Failed to remove machine. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle location change
  const handleLocationChange = () => {
    if (selectedLocationForChange) {
      // Save to localStorage
      localStorage.setItem('selectedLocation', selectedLocationForChange);
      
      // Update the current location state
      setLocationId(selectedLocationForChange);
      
      // Navigate using wouter instead of window.location.href
      setLocation(`/inventory?location=${selectedLocationForChange}`);
      
      // Close the dialog
      setShowLocationDialog(false);
      setSelectedLocationForChange('');
    }
  };
  


  // Handler for adding a new category
  const handleAddCategory = () => {
    if (!newCategoryName) return;
    
    // Create a unique ID for the custom category
    const newCategoryId = Math.floor(Math.random() * 10000) + 1000; // Generate a random ID
    
    // Create the new category object
    const newCategory: MachineCategory = {
      id: newCategoryId,
      name: newCategoryName,
      description: newCategoryDescription || null,
      serviceIntervalDays: parseInt(newCategoryServiceInterval) || 90
    };
    
    // Add to custom categories
    const updatedCategories = [...customCategories, newCategory];
    setCustomCategories(updatedCategories);
    
    // Save to localStorage
    localStorage.setItem('customCategories', JSON.stringify(updatedCategories));
    
    // Update query client data to include the new category
    queryClient.setQueryData(['/api/machine-categories'], (oldData: MachineCategory[] | undefined) => {
      return [...(oldData || []), newCategory];
    });
    
    // Select the new category in the machine form
    setNewMachine(prev => ({ ...prev, categoryId: newCategoryId }));
    console.log("Added new category and updated form:", newCategoryName);
    
    // Reset form and close dialog
    setNewCategoryName("");
    setNewCategoryDescription("");
    setNewCategoryServiceInterval("90");
    setShowAddCategoryDialog(false);
  };

  // Handler for editing a category
  const handleEditCategory = (category: MachineCategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryDescription(category.description || "");
    setNewCategoryServiceInterval(category.serviceIntervalDays.toString());
    setShowEditCategoryDialog(true);
  };

  // Handler for saving edited category
  const handleSaveEditedCategory = async () => {
    if (!editingCategory || !newCategoryName) return;
    
    try {
      const updatedCategoryData = {
        name: newCategoryName,
        description: newCategoryDescription || null,
        serviceIntervalDays: parseInt(newCategoryServiceInterval) || 90
      };
      
      // Call API to update category in database
      const response = await fetch(`/api/machine-categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedCategoryData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update category');
      }
      
      const updatedCategory = await response.json();
      
      // Invalidate and refetch categories to get updated list from database
      queryClient.invalidateQueries({ queryKey: ['/api/machine-categories'] });
      
      toast({
        title: i18n.language === 'en' ? 'Category Updated' : 
               i18n.language === 'es' ? 'Categoría Actualizada' : 
               i18n.language === 'pl' ? 'Kategoria Zaktualizowana' : 'Category Updated',
        description: `${updatedCategory.name} has been updated successfully.`,
      });
      
      // Reset form and close dialog
      setNewCategoryName("");
      setNewCategoryDescription("");
      setNewCategoryServiceInterval("90");
      setEditingCategory(null);
      setShowEditCategoryDialog(false);
      
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: i18n.language === 'en' ? 'Error' : 
               i18n.language === 'es' ? 'Error' : 
               i18n.language === 'pl' ? 'Błąd' : 'Error',
        description: 'Failed to update category. Please try again.',
        variant: "destructive",
      });
    }
  };

  // Handler for adding a new category from the management dialog
  const handleAddNewCategory = async () => {
    if (!addNewCategoryName) return;
    
    try {
      const newCategoryData = {
        name: addNewCategoryName,
        description: addNewCategoryDescription || null,
        serviceIntervalDays: parseInt(addNewCategoryServiceInterval) || 180
      };
      
      // Call API to create category in database
      const response = await fetch('/api/machine-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newCategoryData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create category');
      }
      
      const newCategory = await response.json();
      
      // Invalidate and refetch categories to get updated list from database
      queryClient.invalidateQueries({ queryKey: ['/api/machine-categories'] });
      
      toast({
        title: i18n.language === 'en' ? 'Category Added' : 
               i18n.language === 'es' ? 'Categoría Agregada' : 
               i18n.language === 'pl' ? 'Kategoria Dodana' : 'Category Added',
        description: `${newCategory.name} has been added successfully.`,
      });
      
      // Reset form
      setAddNewCategoryName("");
      setAddNewCategoryDescription("");
      setAddNewCategoryServiceInterval("180");
      
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: i18n.language === 'en' ? 'Error' : 
               i18n.language === 'es' ? 'Error' : 
               i18n.language === 'pl' ? 'Błąd' : 'Error',
        description: 'Failed to add category. Please try again.',
        variant: "destructive",
      });
    }
  };

  // Handler for removing a category
  const handleRemoveCategory = async () => {
    if (!categoryToRemove) return;
    
    const categoryId = parseInt(categoryToRemove);
    const categoryToDelete = categories?.find(cat => cat.id === categoryId);
    
    if (!categoryToDelete) return;
    
    try {
      // Call API to delete category from database
      const response = await fetch(`/api/machine-categories/${categoryId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.status === 400) {
        // Handle case where category has machines assigned
        const errorData = await response.json();
        toast({
          title: i18n.language === 'en' ? 'Cannot Remove Category' : 
                 i18n.language === 'es' ? 'No se puede Eliminar la Categoría' : 
                 i18n.language === 'pl' ? 'Nie można Usunąć Kategorii' : 'Cannot Remove Category',
          description: errorData.message || `Category has machines assigned to it. Please reassign them first.`,
          variant: "destructive",
        });
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to delete category');
      }
      
      // Invalidate and refetch categories to get updated list from database
      queryClient.invalidateQueries({ queryKey: ['/api/machine-categories'] });
      
      toast({
        title: i18n.language === 'en' ? 'Category Removed' : 
               i18n.language === 'es' ? 'Categoría Eliminada' : 
               i18n.language === 'pl' ? 'Kategoria Usunięta' : 'Category Removed',
        description: `${categoryToDelete.name} has been removed successfully.`,
      });
      
      // Reset selection
      setCategoryToRemove("");
      
    } catch (error) {
      console.error('Error removing category:', error);
      toast({
        title: i18n.language === 'en' ? 'Error' : 
               i18n.language === 'es' ? 'Error' : 
               i18n.language === 'pl' ? 'Błąd' : 'Error',
        description: 'Failed to remove category. Please try again.',
        variant: "destructive",
      });
    }
  };
  
  // Success button variant fix for TypeScript
  const getButtonVariant = (variant: string): "default" | "destructive" | "outline" | "secondary" | null | undefined => {
    if (variant === "success") {
      return "default"; // Use default for success (green)
    }
    return variant as "default" | "destructive" | "outline" | "secondary" | null | undefined;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('inventory.title')}</h2>
          <p className="text-muted-foreground">
            {t('inventory.machineInfo')}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 text-sm font-medium">
              {i18n.language === 'en' ? 'Location' : 
               i18n.language === 'es' ? 'Ubicación' : 
               i18n.language === 'pl' ? 'Lokalizacja' : 'Location'}: {locationName}
            </Badge>
            <Button 
              variant="outline"
              size="sm"
              className="flex items-center gap-1 h-8"
              onClick={() => setShowLocationDialog(true)}
            >
              <MapPin className="h-3.5 w-3.5" />
              {i18n.language === 'en' ? 'Switch Location' : 
               i18n.language === 'es' ? 'Cambiar Ubicación' : 
               i18n.language === 'pl' ? 'Zmień Lokalizację' : 'Switch Location'}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle>{t('inventory.title')}</CardTitle>
            <CardDescription>{t('inventory.machineInfo')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col">
            <div className="text-3xl font-bold">{machines?.length || 0}</div>
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm text-blue-500 mt-1"
              onClick={(e) => {
                e.stopPropagation();
                // Scroll to the machines table in the Inventory Management tab
                const inventoryTab = document.querySelector('#all-tab') as HTMLElement;
                if (inventoryTab) {
                  inventoryTab.click();
                  // Wait a moment for the tab to load, then scroll to the table
                  setTimeout(() => {
                    const machinesTable = document.querySelector('table');
                    if (machinesTable) {
                      machinesTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }
              }}
            >
              {i18n.language === 'en' ? 'View all machines' : 
               i18n.language === 'es' ? 'Ver todas las máquinas' : 
               i18n.language === 'pl' ? 'Zobacz wszystkie maszyny' : 
               'View all machines'}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>
              {i18n.language === 'en' ? 'Reported Issues' : 
               i18n.language === 'es' ? 'Problemas Reportados' : 
               i18n.language === 'pl' ? 'Zgłoszone Problemy' : 'Reported Issues'}
            </CardTitle>
            <CardDescription>
              {i18n.language === 'en' ? 'Recent Issues' : 
               i18n.language === 'es' ? 'Problemas Recientes' : 
               i18n.language === 'pl' ? 'Ostatnie Problemy' : 'Recent Issues'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">
              {issuesByLocation?.length || 0}
            </div>
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm text-blue-500"
              onClick={() => setLocation('/my-reports')}
            >
              {t('dashboard.viewAll')}
            </Button>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => setShowOverdueServicesDialog(true)}>
          <CardHeader className="pb-2">
            <CardTitle>
              {i18n.language === 'en' ? 'Overdue Services' : 
               i18n.language === 'es' ? 'Servicios Atrasados' : 
               i18n.language === 'pl' ? 'Zaległe Serwisy' : 'Overdue Services'}
            </CardTitle>
            <CardDescription>
              {i18n.language === 'en' ? 'Machine status' : 
               i18n.language === 'es' ? 'Estado de máquina' : 
               i18n.language === 'pl' ? 'Stan maszyny' : 'Machine status'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col">
            <div className="text-3xl font-bold text-red-500">
              {machines?.filter(m => {
                if (!m.nextServiceDate) return false;
                try {
                  return differenceInDays(new Date(m.nextServiceDate), new Date()) < 0;
                } catch (error) {
                  console.error("Invalid date format in overdue services:", m.nextServiceDate);
                  return false;
                }
              }).length || 0}
            </div>
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm text-red-500 mt-1"
              onClick={(e) => {
                e.stopPropagation();
                setShowOverdueServicesDialog(true);
              }}
            >
              {t('dashboard.viewAll')}
            </Button>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => setShowUpcomingServicesDialog(true)}>
          <CardHeader className="pb-2">
            <CardTitle>
              {i18n.language === 'en' ? 'Upcoming Services' : 
               i18n.language === 'es' ? 'Próximos Servicios' : 
               i18n.language === 'pl' ? 'Nadchodzące Serwisy' : 'Upcoming Services'}
            </CardTitle>
            <CardDescription>
              {i18n.language === 'en' ? 'Next service' : 
               i18n.language === 'es' ? 'Próximo servicio' : 
               i18n.language === 'pl' ? 'Następny serwis' : 'Next service'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col">
            <div className="text-3xl font-bold text-amber-500">
              {machines?.filter(m => {
                if (!m.nextServiceDate) return false;
                try {
                  const days = differenceInDays(new Date(m.nextServiceDate), new Date());
                  return days >= 0 && days <= 7;
                } catch (error) {
                  console.error("Invalid date format in upcoming services:", m.nextServiceDate);
                  return false;
                }
              }).length || 0}
            </div>
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm text-amber-500 mt-1"
              onClick={(e) => {
                e.stopPropagation();
                setShowUpcomingServicesDialog(true);
              }}
            >
              {t('dashboard.viewAll')}
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-end mb-2">
        <Button 
          className="flex items-center gap-2"
          onClick={() => setShowAddMachineDialog(true)}
        >
          <Plus className="h-4 w-4" />
          {t('inventory.addMachine')}
        </Button>
      </div>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4 w-full grid grid-cols-4">
          <TabsTrigger id="all-tab" value="all" className="text-sm px-3 py-1.5">
            {i18n.language === 'en' ? 'Inventory' : 
             i18n.language === 'es' ? 'Inventario' : 
             i18n.language === 'pl' ? 'Inwentarz' : 'Inventory'}
          </TabsTrigger>
          <TabsTrigger id="overdue-tab" value="overdue" className="text-sm px-3 py-1.5">
            {i18n.language === 'en' ? 'Overdue' : 
             i18n.language === 'es' ? 'Atrasados' : 
             i18n.language === 'pl' ? 'Zaległe' : 'Overdue'}
          </TabsTrigger>
          <TabsTrigger id="upcoming-tab" value="upcoming" className="text-sm px-3 py-1.5">
            {i18n.language === 'en' ? 'Upcoming' : 
             i18n.language === 'es' ? 'Próximos' : 
             i18n.language === 'pl' ? 'Nadchodzące' : 'Upcoming'}
          </TabsTrigger>
          <TabsTrigger id="categories-tab" value="categories" className="text-sm px-3 py-1.5">
            {i18n.language === 'en' ? 'Categories' : 
             i18n.language === 'es' ? 'Categorías' : 
             i18n.language === 'pl' ? 'Kategorie' : 'Categories'}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {i18n.language === 'en' ? 'Name' : 
                       i18n.language === 'es' ? 'Nombre' : 
                       i18n.language === 'pl' ? 'Nazwa' : 'Name'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Serial Number' : 
                       i18n.language === 'es' ? 'Número de Serie' : 
                       i18n.language === 'pl' ? 'Numer Seryjny' : 'Serial Number'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Location' : 
                       i18n.language === 'es' ? 'Ubicación' : 
                       i18n.language === 'pl' ? 'Lokalizacja' : 'Location'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Category' : 
                       i18n.language === 'es' ? 'Categoría' : 
                       i18n.language === 'pl' ? 'Kategoria' : 'Category'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Next Service' : 
                       i18n.language === 'es' ? 'Próximo Servicio' : 
                       i18n.language === 'pl' ? 'Następny Serwis' : 'Next Service'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Status' : 
                       i18n.language === 'es' ? 'Estado' : 
                       i18n.language === 'pl' ? 'Status' : 'Status'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Reported Issues' : 
                       i18n.language === 'es' ? 'Problemas Reportados' : 
                       i18n.language === 'pl' ? 'Zgłoszone Problemy' : 'Reported Issues'}
                    </TableHead>
                    <TableHead className="w-[100px]">
                      {i18n.language === 'en' ? 'Actions' : 
                       i18n.language === 'es' ? 'Acciones' : 
                       i18n.language === 'pl' ? 'Akcje' : 'Actions'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machines && machines.length > 0 ? (
                    machines.map((machine: Machine) => (
                      <TableRow key={machine.id}>
                        <TableCell className="font-medium">{machine.name}</TableCell>
                        <TableCell>{machine.serialNumber}</TableCell>
                        <TableCell>{machine.location}</TableCell>
                        <TableCell>
                          {categories?.find(c => c.id === machine.categoryId)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {machine.nextServiceDate ? 
                            format(new Date(machine.nextServiceDate), 'MMM d, yyyy') : 
                            'Not scheduled'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMachineStatusIcon(machine)}
                            <span>{getMachineStatusText(machine)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => {
                              // Navigate to my-reports with machine filter
                              const machineIssues = getIssuesForMachine(machine);
                              // Store machine filter in sessionStorage for the reports page
                              sessionStorage.setItem('machineFilter', JSON.stringify({
                                machineId: machine.id,
                                machineName: machine.name,
                                machineSerial: machine.serialNumber
                              }));
                              setLocation('/my-reports');
                            }}
                          >
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
                              {getIssuesForMachine(machine).length}
                            </Badge>
                            <span>{t('dashboard.viewAll')}</span>
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedMachine(machine);
                                setShowMachineDetailsDialog(true);
                              }}
                            >
                              {t('inventory.machineDetails')}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMachineToRemove(machine);
                                setShowRemoveMachineDialog(true);
                              }}
                            >
                              {t('inventory.removeMachine')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                        {t('inventory.noMachines')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableCaption>
                  {i18n.language === 'en' ? 'Machines past their scheduled service date' : 
                   i18n.language === 'es' ? 'Máquinas con fecha de servicio vencida' : 
                   i18n.language === 'pl' ? 'Maszyny po terminie zaplanowanego serwisu' : 
                   'Machines past their scheduled service date'}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {i18n.language === 'en' ? 'Name' : 
                       i18n.language === 'es' ? 'Nombre' : 
                       i18n.language === 'pl' ? 'Nazwa' : 'Name'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Serial Number' : 
                       i18n.language === 'es' ? 'Número de Serie' : 
                       i18n.language === 'pl' ? 'Numer Seryjny' : 'Serial Number'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Location' : 
                       i18n.language === 'es' ? 'Ubicación' : 
                       i18n.language === 'pl' ? 'Lokalizacja' : 'Location'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Scheduled Date' : 
                       i18n.language === 'es' ? 'Fecha Programada' : 
                       i18n.language === 'pl' ? 'Data Zaplanowana' : 'Scheduled Date'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Days Overdue' : 
                       i18n.language === 'es' ? 'Días de Retraso' : 
                       i18n.language === 'pl' ? 'Dni Opóźnienia' : 'Days Overdue'}
                    </TableHead>
                    <TableHead className="w-[100px]">
                      {i18n.language === 'en' ? 'Actions' : 
                       i18n.language === 'es' ? 'Acciones' : 
                       i18n.language === 'pl' ? 'Akcje' : 'Actions'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machines && machines.filter(m => {
                    if (!m.nextServiceDate) return false;
                    try {
                      return differenceInDays(new Date(m.nextServiceDate), new Date()) < 0;
                    } catch (error) {
                      console.error("Invalid date format in overdue table:", m.nextServiceDate);
                      return false;
                    }
                  }).length > 0 ? (
                    machines.filter(m => {
                      if (!m.nextServiceDate) return false;
                      try {
                        return differenceInDays(new Date(m.nextServiceDate), new Date()) < 0;
                      } catch (error) {
                        console.error("Invalid date format in overdue table:", m.nextServiceDate);
                        return false;
                      }
                    }).map((machine: Machine) => (
                      <TableRow key={machine.id}>
                        <TableCell className="font-medium">{machine.name}</TableCell>
                        <TableCell>{machine.serialNumber}</TableCell>
                        <TableCell>{machine.location}</TableCell>
                        <TableCell>
                          {machine.nextServiceDate ? 
                            format(new Date(machine.nextServiceDate), 'MMM d, yyyy') : 
                            'Not scheduled'
                          }
                        </TableCell>
                        <TableCell className="text-red-500 font-medium">
                          {(() => {
                            try {
                              const days = Math.abs(differenceInDays(new Date(machine.nextServiceDate!), new Date()));
                              const dayWord = i18n.language === 'es' ? 'días' : i18n.language === 'pl' ? 'dni' : 'days';
                              return `${days} ${dayWord}`;
                            } catch (error) {
                              console.error("Invalid date in overdue days calculation:", machine.nextServiceDate);
                              return "Unknown";
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedMachine(machine)}
                          >
                            {i18n.language === 'en' ? 'Service' : 
                             i18n.language === 'es' ? 'Servicio' : 
                             i18n.language === 'pl' ? 'Serwis' : 
                             'Service'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        {i18n.language === 'en' ? 'No overdue services. All machines are up to date.' : 
                         i18n.language === 'es' ? 'No hay servicios atrasados. Todas las máquinas están actualizadas.' : 
                         i18n.language === 'pl' ? 'Brak zaległych serwisów. Wszystkie maszyny są aktualne.' : 
                         'No overdue services. All machines are up to date.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableCaption>
                  {i18n.language === 'en' ? 'Machines with service due in the next 7 days' : 
                   i18n.language === 'es' ? 'Máquinas con servicio pendiente en los próximos 7 días' : 
                   i18n.language === 'pl' ? 'Maszyny z serwisem w ciągu najbliższych 7 dni' : 
                   'Machines with service due in the next 7 days'}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {i18n.language === 'en' ? 'Name' : 
                       i18n.language === 'es' ? 'Nombre' : 
                       i18n.language === 'pl' ? 'Nazwa' : 'Name'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Serial Number' : 
                       i18n.language === 'es' ? 'Número de Serie' : 
                       i18n.language === 'pl' ? 'Numer Seryjny' : 'Serial Number'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Location' : 
                       i18n.language === 'es' ? 'Ubicación' : 
                       i18n.language === 'pl' ? 'Lokalizacja' : 'Location'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Service Date' : 
                       i18n.language === 'es' ? 'Fecha de Servicio' : 
                       i18n.language === 'pl' ? 'Data Serwisu' : 'Service Date'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Days Remaining' : 
                       i18n.language === 'es' ? 'Días Restantes' : 
                       i18n.language === 'pl' ? 'Pozostałe Dni' : 'Days Remaining'}
                    </TableHead>
                    <TableHead className="w-[100px]">
                      {i18n.language === 'en' ? 'Actions' : 
                       i18n.language === 'es' ? 'Acciones' : 
                       i18n.language === 'pl' ? 'Akcje' : 'Actions'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machines && machines.filter(m => {
                    if (!m.nextServiceDate) return false;
                    try {
                      const days = differenceInDays(new Date(m.nextServiceDate), new Date());
                      return days >= 0 && days <= 7;
                    } catch (error) {
                      console.error("Invalid date format in upcoming table:", m.nextServiceDate);
                      return false;
                    }
                  }).length > 0 ? (
                    machines.filter(m => {
                      if (!m.nextServiceDate) return false;
                      try {
                        const days = differenceInDays(new Date(m.nextServiceDate), new Date());
                        return days >= 0 && days <= 7;
                      } catch (error) {
                        console.error("Invalid date format in upcoming table:", m.nextServiceDate);
                        return false;
                      }
                    }).map((machine: Machine) => (
                      <TableRow key={machine.id}>
                        <TableCell className="font-medium">{machine.name}</TableCell>
                        <TableCell>{machine.serialNumber}</TableCell>
                        <TableCell>{machine.location}</TableCell>
                        <TableCell>
                          {machine.nextServiceDate ? 
                            format(new Date(machine.nextServiceDate), 'MMM d, yyyy') : 
                            'Not scheduled'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            {(() => {
                              try {
                                return `${differenceInDays(new Date(machine.nextServiceDate!), new Date())} days" + (i18n.language === "es" ? " días" : i18n.language === "pl" ? " dni" : " days")`;
                              } catch (error) {
                                console.error("Invalid date in upcoming days calculation:", machine.nextServiceDate);
                                return "Unknown";
                              }
                            })()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedMachine(machine)}
                          >
                            Schedule
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        {i18n.language === 'en' ? 'No upcoming services scheduled for the next 7 days.' : 
                         i18n.language === 'es' ? 'No hay servicios programados para los próximos 7 días.' : 
                         i18n.language === 'pl' ? 'Brak zaplanowanych serwisów na najbliższe 7 dni.' : 
                         'No upcoming services scheduled for the next 7 days.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableCaption>
                  {i18n.language === 'en' ? 'Machine categories and service intervals' : 
                   i18n.language === 'es' ? 'Categorías de máquinas e intervalos de servicio' : 
                   i18n.language === 'pl' ? 'Kategorie maszyn i interwały serwisowe' : 
                   'Machine categories and service intervals'}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {i18n.language === 'en' ? 'Category Name' : 
                       i18n.language === 'es' ? 'Nombre de Categoría' : 
                       i18n.language === 'pl' ? 'Nazwa Kategorii' : 'Category Name'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Description' : 
                       i18n.language === 'es' ? 'Descripción' : 
                       i18n.language === 'pl' ? 'Opis' : 'Description'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Service Interval' : 
                       i18n.language === 'es' ? 'Intervalo de Servicio' : 
                       i18n.language === 'pl' ? 'Interwał Serwisowy' : 'Service Interval'}
                    </TableHead>
                    <TableHead>
                      {i18n.language === 'en' ? 'Machine Count' : 
                       i18n.language === 'es' ? 'Cantidad de Máquinas' : 
                       i18n.language === 'pl' ? 'Liczba Maszyn' : 'Machine Count'}
                    </TableHead>
                    <TableHead className="w-[100px]">
                      {i18n.language === 'en' ? 'Actions' : 
                       i18n.language === 'es' ? 'Acciones' : 
                       i18n.language === 'pl' ? 'Akcje' : 'Actions'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories && categories.length > 0 ? (
                    categories.map((category: MachineCategory) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          {i18n.language === 'en' ? category.name : 
                           i18n.language === 'es' ? 
                             (category.name === 'Kitchen Equipment' ? 'Equipamiento de Cocina' : 
                              category.name === 'HVAC Systems' ? 'Sistemas HVAC' :
                              category.name === 'Electrical Systems' ? 'Sistemas Eléctricos' : 
                              category.name === 'Plumbing' ? 'Fontanería' : 
                              category.name === 'Furniture' ? 'Mobiliario' : 
                              category.name === 'Electronics' ? 'Electrónica' : 
                              category.name === 'Refrigeration' ? 'Refrigeración' : 
                              category.name) : 
                           i18n.language === 'pl' ? 
                             (category.name === 'Kitchen Equipment' ? 'Wyposażenie Kuchni' : 
                              category.name === 'HVAC Systems' ? 'Systemy HVAC' :
                              category.name === 'Electrical Systems' ? 'Systemy Elektryczne' : 
                              category.name === 'Plumbing' ? 'Hydraulika' : 
                              category.name === 'Furniture' ? 'Meble' : 
                              category.name === 'Electronics' ? 'Elektronika' : 
                              category.name === 'Refrigeration' ? 'Chłodnictwo' : 
                              category.name) : 
                           category.name}
                        </TableCell>
                        <TableCell>{category.description || '-'}</TableCell>
                        <TableCell>
                          {category.serviceIntervalDays} {' '}
                          {i18n.language === 'en' ? 'days' : 
                           i18n.language === 'es' ? 'días' : 
                           i18n.language === 'pl' ? 'dni' : 
                           'days'}
                        </TableCell>
                        <TableCell>
                          {machines?.filter(m => m.categoryId === category.id).length || 0}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditCategory(category)}
                          >
                            {i18n.language === 'en' ? 'Edit' : 
                             i18n.language === 'es' ? 'Editar' : 
                             i18n.language === 'pl' ? 'Edytuj' : 
                             'Edit'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No categories defined. Create categories to organize your machines.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {selectedMachine && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{selectedMachine.name}</CardTitle>
                <CardDescription>Serial: {selectedMachine.serialNumber} • Location: {selectedMachine.location}</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedMachine(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {/* Machine Image (if available) */}
              {selectedMachine.imageUrl && (
                <div className="flex justify-center">
                  <div 
                    className="relative w-full max-w-md h-48 rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      setSelectedImage(selectedMachine.imageUrl!);
                      setViewerOpen(true);
                    }}
                  >
                    <img 
                      src={selectedMachine.imageUrl} 
                      alt={selectedMachine.name} 
                      className="w-full h-full object-contain" 
                    />
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="bg-black/50 text-white px-3 py-1 rounded-full text-sm">Click to enlarge</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'en' ? 'Manufacturer' : 
                     i18n.language === 'es' ? 'Fabricante' : 
                     i18n.language === 'pl' ? 'Producent' : 'Manufacturer'}
                  </div>
                  <div>{selectedMachine.manufacturer}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Model</div>
                  <div>{selectedMachine.model}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'en' ? 'Installation Date' : 
                     i18n.language === 'es' ? 'Fecha de Instalación' : 
                     i18n.language === 'pl' ? 'Data Instalacji' : 'Installation Date'}
                  </div>
                  <div>
                    {selectedMachine.installationDate ? 
                      (() => {
                        try {
                          return format(new Date(selectedMachine.installationDate), 'MMMM d, yyyy', { locale: getDateLocale() });
                        } catch (error) {
                          console.error("Error formatting installation date:", error);
                          return selectedMachine.installationDate;
                        }
                      })() : 'Unknown date'}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'en' ? 'Category' : 
                     i18n.language === 'es' ? 'Categoría' : 
                     i18n.language === 'pl' ? 'Kategoria' : 'Category'}
                  </div>
                  <div>{categories?.find(c => c.id === selectedMachine.categoryId)?.name || '-'}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'en' ? 'Service Interval' : 
                     i18n.language === 'es' ? 'Intervalo de Servicio' : 
                     i18n.language === 'pl' ? 'Interwał Serwisu' : 'Service Interval'}
                  </div>
                  <div>
                    {selectedMachine.serviceIntervalDays} {i18n.language === 'en' ? 'days' : 
                     i18n.language === 'es' ? 'días' : 
                     i18n.language === 'pl' ? 'dni' : 'days'}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'en' ? 'Status' : 
                     i18n.language === 'es' ? 'Estado' : 
                     i18n.language === 'pl' ? 'Status' : 'Status'}
                  </div>
                  <div>{selectedMachine.status}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'en' ? 'Service Status' : 
                     i18n.language === 'es' ? 'Estado del Servicio' : 
                     i18n.language === 'pl' ? 'Status Serwisu' : 'Service Status'}
                  </div>
                  <div className="text-sm">{getMachineStatusText(selectedMachine)}</div>
                </div>
                <Progress value={getServiceProgressPercent(selectedMachine)} className={getMachineStatusColor(selectedMachine)} />
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  {i18n.language === 'en' ? 'Service History' : 
                   i18n.language === 'es' ? 'Historial de Servicio' : 
                   i18n.language === 'pl' ? 'Historia Serwisu' : 'Service History'}
                </div>
                {serviceHistoryLoading ? (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : serviceHistory && serviceHistory.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            {i18n.language === 'en' ? 'Service Date' : 
                             i18n.language === 'es' ? 'Fecha de Servicio' : 
                             i18n.language === 'pl' ? 'Data Serwisu' : 'Service Date'}
                          </TableHead>
                          <TableHead>
                            {i18n.language === 'en' ? 'Technician' : 
                             i18n.language === 'es' ? 'Técnico' : 
                             i18n.language === 'pl' ? 'Technik' : 'Technician'}
                          </TableHead>
                          <TableHead>
                            {i18n.language === 'en' ? 'Description' : 
                             i18n.language === 'es' ? 'Descripción' : 
                             i18n.language === 'pl' ? 'Opis' : 'Description'}
                          </TableHead>
                          <TableHead>
                            {i18n.language === 'en' ? 'Cost' : 
                             i18n.language === 'es' ? 'Costo' : 
                             i18n.language === 'pl' ? 'Koszt' : 'Cost'}
                          </TableHead>
                          <TableHead>
                            {i18n.language === 'en' ? 'Status' : 
                             i18n.language === 'es' ? 'Estado' : 
                             i18n.language === 'pl' ? 'Status' : 'Status'}
                          </TableHead>
                          <TableHead>
                            {i18n.language === 'en' ? 'Actions' : 
                             i18n.language === 'es' ? 'Acciones' : 
                             i18n.language === 'pl' ? 'Akcje' : 'Actions'}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Show existing service history */}
                        {serviceHistory.map((service: MachineService) => (
                          <TableRow key={service.id}>
                            <TableCell>
                              {service.serviceDate ? 
                                (() => {
                                  try {
                                    return format(new Date(service.serviceDate), 'MMM d, yyyy');
                                  } catch (e) {
                                    return service.serviceDate;
                                  }
                                })() : (i18n.language === 'en' ? 'No date' : 
                                 i18n.language === 'es' ? 'Sin fecha' : 
                                 i18n.language === 'pl' ? 'Brak daty' : 'No date')}
                            </TableCell>
                            <TableCell>{service.technicianName || '-'}</TableCell>
                            <TableCell>{service.description}</TableCell>
                            <TableCell>
                              {service.cost ? `$${service.cost.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center ${
                                service.isCompleted 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {service.isCompleted ? 'Completed' : 'Scheduled'}
                              </div>
                            </TableCell>
                            <TableCell>
                              {!service.isCompleted && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      // Send completion notification to all users
                                      await fetch('/api/notifications/service-completed', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                          machineName: selectedMachine?.name,
                                          serviceDate: service.serviceDate,
                                          technician: service.technicianName || 'Unknown',
                                          description: service.description,
                                          location: locationId || 'Unknown Location',
                                          cost: service.cost
                                        }),
                                      });
                                      
                                      console.log('Service completion notification sent to all users');
                                      
                                      // Refresh the service history
                                      if (selectedMachine) {
                                        // You can add logic here to update the service as completed
                                        // For now, we'll just refresh the data
                                        window.location.reload();
                                      }
                                    } catch (error) {
                                      console.error('Failed to send completion notification:', error);
                                    }
                                  }}
                                >
                                  {i18n.language === 'en' ? 'Mark Complete' : 
                                   i18n.language === 'es' ? 'Marcar Completo' : 
                                   i18n.language === 'pl' ? 'Oznacz jako Ukończone' : 'Mark Complete'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {/* Show newly scheduled services for this machine */}
                        {scheduledServices
                          .filter(service => service.machineId === selectedMachine?.id)
                          .map((service, index) => (
                          <TableRow key={`scheduled-${index}`}>
                            <TableCell>
                              {format(new Date(service.serviceDate), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>{service.technician}</TableCell>
                            <TableCell>{service.description}</TableCell>
                            <TableCell>{service.cost}</TableCell>
                            <TableCell>
                              <div className="px-2 py-1 rounded-full text-xs font-medium inline-flex items-center bg-blue-100 text-blue-800">
                                {service.status}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-md">
                    <div className="flex flex-col items-center space-y-2">
                      <Wrench className="h-12 w-12 text-gray-300" />
                      <div className="text-lg font-medium">
                        {i18n.language === 'en' ? 'No Service Records' : 
                         i18n.language === 'es' ? 'Sin Registros de Servicio' : 
                         i18n.language === 'pl' ? 'Brak Zapisów Serwisowych' : 'No Service Records'}
                      </div>
                      <div className="text-sm max-w-md">
                        {i18n.language === 'en' ? 'This machine has no documented service history yet. Service records will appear here once maintenance is performed and logged.' : 
                         i18n.language === 'es' ? 'Esta máquina no tiene historial de servicio documentado aún. Los registros de servicio aparecerán aquí una vez que se realice y registre el mantenimiento.' : 
                         i18n.language === 'pl' ? 'Ta maszyna nie ma jeszcze udokumentowanej historii serwisu. Zapisy serwisowe pojawią się tutaj po wykonaniu i zloguowaniu konserwacji.' : 'This machine has no documented service history yet. Service records will appear here once maintenance is performed and logged.'}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          setMachineToSchedule(selectedMachine);
                          setShowScheduleDialog(true);
                        }}
                      >
                        {i18n.language === 'en' ? 'Schedule First Service' : 
                         i18n.language === 'es' ? 'Programar Primer Servicio' : 
                         i18n.language === 'pl' ? 'Zaplanuj Pierwszy Serwis' : 'Schedule First Service'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {selectedMachine.notes && (
                <div className="space-y-1">
                  <div className="text-sm font-medium">Notes</div>
                  <div className="p-3 bg-gray-50 rounded-md text-sm">{selectedMachine.notes}</div>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  if (selectedMachine) {
                    setEditingMachine(selectedMachine);
                    setShowEditMachineDialog(true);
                  }
                }}
              >
                {i18n.language === 'en' ? 'Edit Machine' : 
                 i18n.language === 'es' ? 'Editar Máquina' : 
                 i18n.language === 'pl' ? 'Edytuj Maszynę' : 'Edit Machine'}
              </Button>
              <Button 
                variant="outline"
                className="flex items-center gap-1"
                onClick={() => setLocation('/my-reports')}
              >
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">3</Badge>
                <span>
                  {i18n.language === 'en' ? 'View Issues' : 
                   i18n.language === 'es' ? 'Ver Problemas' : 
                   i18n.language === 'pl' ? 'Zobacz Problemy' : 'View Issues'}
                </span>
              </Button>
            </div>
            <Button 
              onClick={() => {
                if (selectedMachine) {
                  setMachineToSchedule(selectedMachine);
                  setShowScheduleDialog(true);
                }
              }}
            >
              {i18n.language === 'en' ? 'Schedule Service' : 
               i18n.language === 'es' ? 'Programar Servicio' : 
               i18n.language === 'pl' ? 'Zaplanuj Serwis' : 'Schedule Service'}
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Add Machine Dialog */}
      <Dialog open={showAddMachineDialog} onOpenChange={setShowAddMachineDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {i18n.language === 'en' ? 'Add New Machine' : 
               i18n.language === 'es' ? 'Añadir Nueva Máquina' : 
               i18n.language === 'pl' ? 'Dodaj Nową Maszynę' : 'Add New Machine'}
            </DialogTitle>
            <DialogDescription>
              {i18n.language === 'en' ? 'Enter the details for the new equipment to add to the inventory' : 
               i18n.language === 'es' ? 'Ingrese los detalles del nuevo equipo para agregar al inventario' : 
               i18n.language === 'pl' ? 'Wprowadź szczegóły nowego urządzenia, aby dodać je do inwentarza' : 
               'Enter the details for the new equipment to add to the inventory'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {i18n.language === 'en' ? 'Machine Name' : 
                   i18n.language === 'es' ? 'Nombre de Máquina' : 
                   i18n.language === 'pl' ? 'Nazwa Maszyny' : 'Machine Name'}
                </Label>
                <Input 
                  id="name" 
                  name="name"
                  placeholder={i18n.language === 'en' ? 'Ice Cream Machine' : 
                             i18n.language === 'es' ? 'Máquina de Helados' : 
                             i18n.language === 'pl' ? 'Maszyna do Lodów' : 
                             'Ice Cream Machine'} 
                  value={newMachine.name || ''}
                  onChange={handleNewMachineInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="serialNumber">
                  {i18n.language === 'en' ? 'Serial Number' : 
                   i18n.language === 'es' ? 'Número de Serie' : 
                   i18n.language === 'pl' ? 'Numer Seryjny' : 'Serial Number'}
                </Label>
                <Input 
                  id="serialNumber" 
                  name="serialNumber"
                  placeholder={i18n.language === 'en' ? 'SN-12345678' : 
                             i18n.language === 'es' ? 'NS-12345678' : 
                             i18n.language === 'pl' ? 'SN-12345678' : 
                             'SN-12345678'} 
                  value={newMachine.serialNumber || ''}
                  onChange={handleNewMachineInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manufacturer">
                  {i18n.language === 'en' ? 'Manufacturer' : 
                   i18n.language === 'es' ? 'Fabricante' : 
                   i18n.language === 'pl' ? 'Producent' : 'Manufacturer'}
                </Label>
                <Input 
                  id="manufacturer" 
                  name="manufacturer"
                  placeholder={i18n.language === 'en' ? 'Taylor' : 
                             i18n.language === 'es' ? 'Taylor' : 
                             i18n.language === 'pl' ? 'Taylor' : 
                             'Taylor'} 
                  value={newMachine.manufacturer || ''}
                  onChange={handleNewMachineInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="model">
                  {i18n.language === 'en' ? 'Model' : 
                   i18n.language === 'es' ? 'Modelo' : 
                   i18n.language === 'pl' ? 'Model' : 'Model'}
                </Label>
                <Input 
                  id="model" 
                  name="model"
                  placeholder={i18n.language === 'en' ? 'C723-33' : 
                             i18n.language === 'es' ? 'C723-33' : 
                             i18n.language === 'pl' ? 'C723-33' : 
                             'C723-33'} 
                  value={newMachine.model || ''}
                  onChange={handleNewMachineInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="installationDate">
                  {i18n.language === 'en' ? 'Installation Date' : 
                   i18n.language === 'es' ? 'Fecha de Instalación' : 
                   i18n.language === 'pl' ? 'Data Instalacji' : 'Installation Date'}
                </Label>
                <DatePicker
                  id="installationDate"
                  name="installationDate"
                  value={newMachine.installationDate || format(new Date(), 'yyyy-MM-dd')}
                  onChange={(value) => setNewMachine(prev => ({ ...prev, installationDate: value }))}
                  placeholder={i18n.language === 'en' ? 'Select installation date' : 
                             i18n.language === 'es' ? 'Seleccionar fecha de instalación' : 
                             i18n.language === 'pl' ? 'Wybierz datę instalacji' : 
                             'Select installation date'}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastServiceDate">
                  {i18n.language === 'en' ? 'Last Service Date' : 
                   i18n.language === 'es' ? 'Fecha del Último Servicio' : 
                   i18n.language === 'pl' ? 'Data Ostatniego Serwisu' : 'Last Service Date'}
                </Label>
                <DatePicker
                  id="lastServiceDate"
                  name="lastServiceDate"
                  value={newMachine.lastServiceDate || ''}
                  onChange={(value) => setNewMachine(prev => ({ ...prev, lastServiceDate: value }))}
                  placeholder={i18n.language === 'en' ? 'Optional - when was it last serviced?' : 
                             i18n.language === 'es' ? 'Opcional - ¿cuándo fue el último servicio?' : 
                             i18n.language === 'pl' ? 'Opcjonalne - kiedy był ostatni serwis?' : 
                             'Optional - when was it last serviced?'}
                />
                <p className="text-xs text-muted-foreground">
                  {i18n.language === 'en' ? 'Leave empty if this is a new machine or service date is unknown' : 
                   i18n.language === 'es' ? 'Dejar vacío si es una máquina nueva o la fecha de servicio es desconocida' : 
                   i18n.language === 'pl' ? 'Pozostaw puste, jeśli to jest nowa maszyna lub data serwisu jest nieznana' : 
                   'Leave empty if this is a new machine or service date is unknown'}
                </p>
              </div>
              
              <div className="space-y-2 relative">
                <Label htmlFor="categoryId">
                  {i18n.language === 'en' ? 'Category' : 
                   i18n.language === 'es' ? 'Categoría' : 
                   i18n.language === 'pl' ? 'Kategoria' : 'Category'}
                </Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select 
                      value={newMachine.categoryId?.toString() || ""} 
                      onValueChange={(value) => setNewMachine(prev => ({ ...prev, categoryId: parseInt(value) }))}
                    >
                      <SelectTrigger id="categoryId">
                        <SelectValue placeholder={i18n.language === 'en' ? 'Select a category' : 
                                             i18n.language === 'es' ? 'Seleccione una categoría' : 
                                             i18n.language === 'pl' ? 'Wybierz kategorię' : 
                                             'Select a category'} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {i18n.language === 'en' ? category.name : 
                             i18n.language === 'es' ? 
                               (category.name === 'Kitchen Equipment' ? 'Equipamiento de Cocina' : 
                                category.name === 'HVAC Systems' ? 'Sistemas HVAC' :
                                category.name === 'Electrical Systems' ? 'Sistemas Eléctricos' : 
                                category.name === 'Plumbing' ? 'Fontanería' : 
                                category.name === 'Furniture' ? 'Mobiliario' : 
                                category.name === 'Electronics' ? 'Electrónica' : 
                                category.name === 'Refrigeration' ? 'Refrigeración' : 
                                category.name) : 
                             i18n.language === 'pl' ? 
                               (category.name === 'Kitchen Equipment' ? 'Wyposażenie Kuchni' : 
                                category.name === 'HVAC Systems' ? 'Systemy HVAC' :
                                category.name === 'Electrical Systems' ? 'Systemy Elektryczne' : 
                                category.name === 'Plumbing' ? 'Hydraulika' : 
                                category.name === 'Furniture' ? 'Meble' : 
                                category.name === 'Electronics' ? 'Elektronika' : 
                                category.name === 'Refrigeration' ? 'Chłodnictwo' : 
                                category.name) : 
                             category.name}
                          </SelectItem>
                        ))}
                        {customCategories.map(category => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name} {i18n.language === 'en' ? '(Custom)' : 
                              i18n.language === 'es' ? '(Personalizado)' : 
                              i18n.language === 'pl' ? '(Niestandardowy)' : 
                              '(Custom)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className="shrink-0"
                    onClick={() => setShowAddCategoryDialog(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="serviceIntervalDays">
                  {i18n.language === 'en' ? 'Service Interval (days)' : 
                   i18n.language === 'es' ? 'Intervalo de Servicio (días)' : 
                   i18n.language === 'pl' ? 'Interwał Serwisowy (dni)' : 'Service Interval (days)'}
                </Label>
                <Input 
                  id="serviceIntervalDays" 
                  name="serviceIntervalDays"
                  type="number"
                  min="1"
                  placeholder="90" 
                  value={newMachine.serviceIntervalDays?.toString() || "90"}
                  onChange={handleNewMachineInputChange}
                />
              </div>
              
              <div className="space-y-2 relative">
                <Label htmlFor="location">
                  {i18n.language === 'en' ? 'Building/Location' : 
                   i18n.language === 'es' ? 'Edificio/Ubicación' : 
                   i18n.language === 'pl' ? 'Budynek/Lokalizacja' : 'Building/Location'}
                </Label>
                <div className="flex gap-2">
                  <Input 
                    id="location" 
                    name="location"
                    className="flex-1"
                    placeholder="Building Name" 
                    value={newMachine.location || locationName}
                    onChange={handleNewMachineInputChange}
                    readOnly={!showAddLocationInMachineDialog}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className="shrink-0"
                    onClick={() => setShowAddLocationInMachineDialog(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="floor">
                  {i18n.language === 'en' ? 'Floor' : 
                   i18n.language === 'es' ? 'Piso' : 
                   i18n.language === 'pl' ? 'Piętro' : 'Floor'}
                </Label>
                <div className="flex gap-2">
                  <Input 
                    id="floor" 
                    name="floor"
                    placeholder={i18n.language === 'en' ? 'Main Floor' : 
                               i18n.language === 'es' ? 'Planta Principal' : 
                               i18n.language === 'pl' ? 'Główne Piętro' : 
                               'Main Floor'} 
                    value={newMachine.floor || ''}
                    onChange={handleNewMachineInputChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="room">
                  {i18n.language === 'en' ? 'Room/Area' : 
                   i18n.language === 'es' ? 'Sala/Área' : 
                   i18n.language === 'pl' ? 'Pomieszczenie/Strefa' : 'Room/Area'}
                </Label>
                <div className="flex gap-2">
                  <Input 
                    id="room" 
                    name="room"
                    placeholder={i18n.language === 'en' ? 'Kitchen Area' : 
                               i18n.language === 'es' ? 'Área de Cocina' : 
                               i18n.language === 'pl' ? 'Strefa Kuchenna' : 
                               'Kitchen Area'} 
                    value={newMachine.room || ''}
                    onChange={handleNewMachineInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Location Dialog */}
            {showAddLocationInMachineDialog && (
              <Dialog open={showAddLocationInMachineDialog} onOpenChange={setShowAddLocationInMachineDialog}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {i18n.language === 'en' ? 'Add New Location' : 
                       i18n.language === 'es' ? 'Agregar Nueva Ubicación' : 
                       i18n.language === 'pl' ? 'Dodaj Nową Lokalizację' : 'Add New Location'}
                    </DialogTitle>
                    <DialogDescription>
                      {i18n.language === 'en' ? 'Create a custom location for your equipment' : 
                       i18n.language === 'es' ? 'Cree una ubicación personalizada para su equipo' : 
                       i18n.language === 'pl' ? 'Utwórz niestandardową lokalizację dla swoich urządzeń' : 
                       'Create a custom location for your equipment'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="newLocationName">
                        {i18n.language === 'en' ? 'Location Name' : 
                         i18n.language === 'es' ? 'Nombre de Ubicación' : 
                         i18n.language === 'pl' ? 'Nazwa Lokalizacji' : 'Location Name'}
                      </Label>
                      <Input 
                        id="newLocationName" 
                        placeholder={i18n.language === 'en' ? 'e.g. Kitchen Area 2' : 
                                   i18n.language === 'es' ? 'ej. Área de Cocina 2' : 
                                   i18n.language === 'pl' ? 'np. Strefa Kuchenna 2' : 
                                   'e.g. Kitchen Area 2'} 
                        value={newLocationName}
                        onChange={(e) => setNewLocationName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newLocationAddress">
                        {i18n.language === 'en' ? 'Location Address' : 
                         i18n.language === 'es' ? 'Dirección de la Ubicación' : 
                         i18n.language === 'pl' ? 'Adres Lokalizacji' : 'Location Address'}
                      </Label>
                      <Input 
                        id="newLocationAddress" 
                        placeholder={i18n.language === 'en' ? 'e.g. North Section, 2nd Floor' : 
                                   i18n.language === 'es' ? 'ej. Sección Norte, 2do Piso' : 
                                   i18n.language === 'pl' ? 'np. Sekcja Północna, 2 Piętro' : 
                                   'e.g. North Section, 2nd Floor'} 
                        value={newLocationAddress}
                        onChange={(e) => setNewLocationAddress(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAddLocationInMachineDialog(false)}
                    >
                      {i18n.language === 'en' ? 'Cancel' : 
                       i18n.language === 'es' ? 'Cancelar' : 
                       i18n.language === 'pl' ? 'Anuluj' : 'Cancel'}
                    </Button>
                    <Button 
                      onClick={handleAddLocationInMachineDialog}
                      disabled={!newLocationName || !newLocationAddress}
                    >
                      {i18n.language === 'en' ? 'Add Location' : 
                       i18n.language === 'es' ? 'Agregar Ubicación' : 
                       i18n.language === 'pl' ? 'Dodaj Lokalizację' : 'Add Location'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="description">
                {i18n.language === 'en' ? 'Description' : 
                 i18n.language === 'es' ? 'Descripción' : 
                 i18n.language === 'pl' ? 'Opis' : 'Description'}
              </Label>
              <Textarea 
                id="description" 
                name="description"
                placeholder={i18n.language === 'en' ? 'Brief description of the machine' : 
                           i18n.language === 'es' ? 'Breve descripción de la máquina' : 
                           i18n.language === 'pl' ? 'Krótki opis maszyny' : 
                           'Brief description of the machine'} 
                rows={3}
                value={newMachine.description || ''}
                onChange={handleNewMachineInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">
                {i18n.language === 'en' ? 'Notes' : 
                 i18n.language === 'es' ? 'Notas' : 
                 i18n.language === 'pl' ? 'Uwagi' : 'Notes'}
              </Label>
              <Textarea 
                id="notes" 
                name="notes"
                placeholder={i18n.language === 'en' ? 'Additional notes about maintenance, parts, etc.' : 
                           i18n.language === 'es' ? 'Notas adicionales sobre mantenimiento, piezas, etc.' : 
                           i18n.language === 'pl' ? 'Dodatkowe uwagi dotyczące konserwacji, części itp.' : 
                           'Additional notes about maintenance, parts, etc.'} 
                rows={3}
                value={newMachine.notes || ''}
                onChange={handleNewMachineInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label>
                {i18n.language === 'en' ? 'Machine Photo' : 
                 i18n.language === 'es' ? 'Foto de la Máquina' : 
                 i18n.language === 'pl' ? 'Zdjęcie Maszyny' : 'Machine Photo'}
              </Label>
              <div 
                className="relative border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleImageDrop}
              >
                {newMachine.imageUrl ? (
                  <div className="relative w-full">
                    <img 
                      src={newMachine.imageUrl} 
                      alt={i18n.language === 'en' ? 'Machine preview' : 
                           i18n.language === 'es' ? 'Vista previa de la máquina' : 
                           i18n.language === 'pl' ? 'Podgląd maszyny' : 'Machine preview'} 
                      className="max-h-64 mx-auto rounded-md object-contain cursor-pointer"
                      onClick={() => {
                        setSelectedImage(newMachine.imageUrl!);
                        setViewerOpen(true);
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full bg-white/80"
                      onClick={() => setNewMachine(prev => ({ ...prev, image: null, imageUrl: null }))}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span className="sr-only">
                        {i18n.language === 'en' ? 'Remove' : 
                         i18n.language === 'es' ? 'Eliminar' : 
                         i18n.language === 'pl' ? 'Usuń' : 'Remove'}
                      </span>
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mx-auto flex flex-col items-center justify-center text-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <div className="mt-4 text-sm text-muted-foreground">
                        <p className="mb-1 font-medium">
                          {i18n.language === 'en' ? 'Drag and drop a photo here, or click to select' : 
                           i18n.language === 'es' ? 'Arrastra y suelta una foto aquí, o haz clic para seleccionar' : 
                           i18n.language === 'pl' ? 'Przeciągnij i upuść zdjęcie tutaj lub kliknij, aby wybrać' : 
                           'Drag and drop a photo here, or click to select'}
                        </p>
                        <p>
                          {i18n.language === 'en' ? 'You can also use your camera to take a photo' : 
                           i18n.language === 'es' ? 'También puedes usar tu cámara para tomar una foto' : 
                           i18n.language === 'pl' ? 'Możesz również użyć aparatu, aby zrobić zdjęcie' : 
                           'You can also use your camera to take a photo'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 mt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex items-center gap-2"
                        onClick={() => document.getElementById('machine-photo-upload')?.click()}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        {i18n.language === 'en' ? 'Upload Photo' : 
                         i18n.language === 'es' ? 'Subir Foto' : 
                         i18n.language === 'pl' ? 'Prześlij Zdjęcie' : 'Upload Photo'}
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex items-center gap-2"
                        onClick={handleCameraCapture}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                          <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                        {i18n.language === 'en' ? 'Take Photo' : 
                         i18n.language === 'es' ? 'Tomar Foto' : 
                         i18n.language === 'pl' ? 'Zrób Zdjęcie' : 'Take Photo'}
                      </Button>
                    </div>
                    
                    <input
                      id="machine-photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMachineDialog(false)}>
              {i18n.language === 'en' ? 'Cancel' : 
               i18n.language === 'es' ? 'Cancelar' : 
               i18n.language === 'pl' ? 'Anuluj' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleAddMachine}
              disabled={addingMachine || !newMachine.name || !newMachine.serialNumber || !newMachine.location || !newMachine.categoryId}
            >
              {addingMachine ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {i18n.language === 'en' ? 'Adding...' : 
                   i18n.language === 'es' ? 'Añadiendo...' : 
                   i18n.language === 'pl' ? 'Dodawanie...' : 'Adding...'}
                </>
              ) : (
                <>{i18n.language === 'en' ? 'Add Machine' : 
                  i18n.language === 'es' ? 'Agregar Máquina' : 
                  i18n.language === 'pl' ? 'Dodaj Maszynę' : 'Add Machine'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Machine Dialog */}
      <Dialog open={showEditMachineDialog} onOpenChange={setShowEditMachineDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {i18n.language === 'en' ? 'Edit Machine' : 
               i18n.language === 'es' ? 'Editar Máquina' : 
               i18n.language === 'pl' ? 'Edytuj Maszynę' : 'Edit Machine'}
            </DialogTitle>
            <DialogDescription>
              {i18n.language === 'en' ? 'Update the details for this machine' : 
               i18n.language === 'es' ? 'Actualiza los detalles de esta máquina' : 
               i18n.language === 'pl' ? 'Zaktualizuj szczegóły tej maszyny' : 
               'Update the details for this machine'}
            </DialogDescription>
          </DialogHeader>
          {editingMachine && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">
                    {i18n.language === 'en' ? 'Machine Name' : 
                     i18n.language === 'es' ? 'Nombre de Máquina' : 
                     i18n.language === 'pl' ? 'Nazwa Maszyny' : 'Machine Name'}
                  </Label>
                  <Input 
                    id="edit-name" 
                    defaultValue={editingMachine.name}
                    placeholder={i18n.language === 'en' ? 'Ice Cream Machine' : 
                               i18n.language === 'es' ? 'Máquina de Helados' : 
                               i18n.language === 'pl' ? 'Maszyna do lodów' : 'Ice Cream Machine'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-serial">
                    {i18n.language === 'en' ? 'Serial Number' : 
                     i18n.language === 'es' ? 'Número de Serie' : 
                     i18n.language === 'pl' ? 'Numer Seryjny' : 'Serial Number'}
                  </Label>
                  <Input 
                    id="edit-serial" 
                    value={editingMachine.serialNumber}
                    onChange={(e) => setEditingMachine({...editingMachine, serialNumber: e.target.value})}
                    placeholder={i18n.language === 'en' ? 'ABC123456' : 
                               i18n.language === 'es' ? 'ABC123456' : 
                               i18n.language === 'pl' ? 'ABC123456' : 'ABC123456'}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-manufacturer">
                    {i18n.language === 'en' ? 'Manufacturer' : 
                     i18n.language === 'es' ? 'Fabricante' : 
                     i18n.language === 'pl' ? 'Producent' : 'Manufacturer'}
                  </Label>
                  <Input 
                    id="edit-manufacturer" 
                    defaultValue={editingMachine.manufacturer}
                    placeholder={i18n.language === 'en' ? 'Taylor Company' : 
                               i18n.language === 'es' ? 'Taylor Company' : 
                               i18n.language === 'pl' ? 'Taylor Company' : 'Taylor Company'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-model">
                    {i18n.language === 'en' ? 'Model' : 
                     i18n.language === 'es' ? 'Modelo' : 
                     i18n.language === 'pl' ? 'Model' : 'Model'}
                  </Label>
                  <Input 
                    id="edit-model" 
                    defaultValue={editingMachine.model}
                    placeholder={i18n.language === 'en' ? 'C712-33' : 
                               i18n.language === 'es' ? 'C712-33' : 
                               i18n.language === 'pl' ? 'C712-33' : 'C712-33'}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-location">
                    {i18n.language === 'en' ? 'Location' : 
                     i18n.language === 'es' ? 'Ubicación' : 
                     i18n.language === 'pl' ? 'Lokalizacja' : 'Location'}
                  </Label>
                  <Input 
                    id="edit-location" 
                    defaultValue={editingMachine.location}
                    placeholder={i18n.language === 'en' ? 'Kitchen Area' : 
                               i18n.language === 'es' ? 'Área de Cocina' : 
                               i18n.language === 'pl' ? 'Strefa Kuchenna' : 'Kitchen Area'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">
                    {i18n.language === 'en' ? 'Category' : 
                     i18n.language === 'es' ? 'Categoría' : 
                     i18n.language === 'pl' ? 'Kategoria' : 'Category'}
                  </Label>
                  <Select defaultValue={editingMachine.categoryId?.toString()}>
                    <SelectTrigger>
                      <SelectValue placeholder={i18n.language === 'en' ? 'Select category' : 
                                              i18n.language === 'es' ? 'Seleccionar categoría' : 
                                              i18n.language === 'pl' ? 'Wybierz kategorię' : 'Select category'} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-installation-date">
                    {i18n.language === 'en' ? 'Installation Date' : 
                     i18n.language === 'es' ? 'Fecha de Instalación' : 
                     i18n.language === 'pl' ? 'Data Instalacji' : 'Installation Date'}
                  </Label>
                  <Input 
                    id="edit-installation-date" 
                    type="date"
                    value={editingMachine.installationDate}
                    onChange={(e) => setEditingMachine({...editingMachine, installationDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-last-service-date">
                    {i18n.language === 'en' ? 'Last Service Date' : 
                     i18n.language === 'es' ? 'Fecha del Último Servicio' : 
                     i18n.language === 'pl' ? 'Data Ostatniego Serwisu' : 'Last Service Date'}
                  </Label>
                  <Input 
                    id="edit-last-service-date" 
                    type="date"
                    value={editingMachine.lastServiceDate || ''}
                    onChange={(e) => {
                      if (editingMachine) {
                        setEditingMachine({
                          ...editingMachine,
                          lastServiceDate: e.target.value
                        });
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-service-interval">
                    {i18n.language === 'en' ? 'Service Interval (days)' : 
                     i18n.language === 'es' ? 'Intervalo de Servicio (días)' : 
                     i18n.language === 'pl' ? 'Interwał Serwisu (dni)' : 'Service Interval (days)'}
                  </Label>
                  <Input 
                    id="edit-service-interval" 
                    type="number"
                    value={editingMachine.serviceIntervalDays}
                    onChange={(e) => setEditingMachine({...editingMachine, serviceIntervalDays: parseInt(e.target.value) || 90})}
                    placeholder="30"
                    min="1"
                    max="365"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">
                    {i18n.language === 'en' ? 'Status' : 
                     i18n.language === 'es' ? 'Estado' : 
                     i18n.language === 'pl' ? 'Status' : 'Status'}
                  </Label>
                  <Select defaultValue={editingMachine.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {i18n.language === 'en' ? 'Active' : 
                         i18n.language === 'es' ? 'Activo' : 
                         i18n.language === 'pl' ? 'Aktywny' : 'Active'}
                      </SelectItem>
                      <SelectItem value="maintenance">
                        {i18n.language === 'en' ? 'Under Maintenance' : 
                         i18n.language === 'es' ? 'En Mantenimiento' : 
                         i18n.language === 'pl' ? 'W Serwisie' : 'Under Maintenance'}
                      </SelectItem>
                      <SelectItem value="out_of_order">
                        {i18n.language === 'en' ? 'Out of Order' : 
                         i18n.language === 'es' ? 'Fuera de Servicio' : 
                         i18n.language === 'pl' ? 'Niesprawny' : 'Out of Order'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">
                  {i18n.language === 'en' ? 'Description' : 
                   i18n.language === 'es' ? 'Descripción' : 
                   i18n.language === 'pl' ? 'Opis' : 'Description'}
                </Label>
                <Textarea 
                  id="edit-description" 
                  defaultValue={editingMachine.description || ''}
                  placeholder={i18n.language === 'en' ? 'Additional notes about this machine...' : 
                             i18n.language === 'es' ? 'Notas adicionales sobre esta máquina...' : 
                             i18n.language === 'pl' ? 'Dodatkowe uwagi o tej maszynie...' : 'Additional notes about this machine...'}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditMachineDialog(false)}>
              {i18n.language === 'en' ? 'Cancel' : 
               i18n.language === 'es' ? 'Cancelar' : 
               i18n.language === 'pl' ? 'Anuluj' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveEditedMachine}>
              {i18n.language === 'en' ? 'Save Changes' : 
               i18n.language === 'es' ? 'Guardar Cambios' : 
               i18n.language === 'pl' ? 'Zapisz Zmiany' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Category Dialog */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {i18n.language === 'en' ? 'Add New Category' : 
               i18n.language === 'es' ? 'Agregar Nueva Categoría' : 
               i18n.language === 'pl' ? 'Dodaj Nową Kategorię' : 'Add New Category'}
            </DialogTitle>
            <DialogDescription>
              {i18n.language === 'en' ? 'Create a custom equipment category with service interval' : 
               i18n.language === 'es' ? 'Crear una categoría de equipo personalizada con intervalo de servicio' : 
               i18n.language === 'pl' ? 'Utwórz niestandardową kategorię urządzeń z interwałem serwisu' : 
               'Create a custom equipment category with service interval'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newCategoryName">
                {i18n.language === 'en' ? 'Category Name' : 
                 i18n.language === 'es' ? 'Nombre de Categoría' : 
                 i18n.language === 'pl' ? 'Nazwa Kategorii' : 'Category Name'}
              </Label>
              <Input 
                id="newCategoryName" 
                placeholder={i18n.language === 'en' ? 'e.g. Office Equipment' : 
                            i18n.language === 'es' ? 'ej. Equipo de Oficina' : 
                            i18n.language === 'pl' ? 'np. Wyposażenie Biurowe' : 'e.g. Office Equipment'} 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCategoryDescription">
                {i18n.language === 'en' ? 'Description (Optional)' : 
                 i18n.language === 'es' ? 'Descripción (Opcional)' : 
                 i18n.language === 'pl' ? 'Opis (Opcjonalny)' : 'Description (Optional)'}
              </Label>
              <Input 
                id="newCategoryDescription" 
                placeholder={i18n.language === 'en' ? 'e.g. Equipment used in office areas' : 
                            i18n.language === 'es' ? 'ej. Equipo utilizado en áreas de oficina' : 
                            i18n.language === 'pl' ? 'np. Urządzenia używane w obszarach biurowych' : 'e.g. Equipment used in office areas'} 
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCategoryServiceInterval">
                {i18n.language === 'en' ? 'Service Interval (days)' : 
                 i18n.language === 'es' ? 'Intervalo de Servicio (días)' : 
                 i18n.language === 'pl' ? 'Interwał Serwisu (dni)' : 'Service Interval (days)'}
              </Label>
              <Input 
                id="newCategoryServiceInterval" 
                type="number"
                min="1"
                placeholder="90" 
                value={newCategoryServiceInterval}
                onChange={(e) => setNewCategoryServiceInterval(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAddCategoryDialog(false)}
            >
              {i18n.language === 'en' ? 'Cancel' : 
               i18n.language === 'es' ? 'Cancelar' : 
               i18n.language === 'pl' ? 'Anuluj' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleAddCategory}
              disabled={!newCategoryName}
            >
              {i18n.language === 'en' ? 'Add Category' : 
               i18n.language === 'es' ? 'Agregar Categoría' : 
               i18n.language === 'pl' ? 'Dodaj Kategorię' : 'Add Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overdue Services Dialog */}
      <Dialog open={showOverdueServicesDialog} onOpenChange={setShowOverdueServicesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> 
              {i18n.language === 'en' ? 'Overdue Services' : 
               i18n.language === 'es' ? 'Servicios Atrasados' : 
               i18n.language === 'pl' ? 'Zaległe Serwisy' : 
               'Overdue Services'}
            </DialogTitle>
            <DialogDescription>
              {i18n.language === 'en' ? 'Machines that have passed their scheduled service date' : 
               i18n.language === 'es' ? 'Máquinas que han superado su fecha programada de servicio' : 
               i18n.language === 'pl' ? 'Maszyny, które przekroczyły zaplanowany termin serwisu' : 
               'Machines that have passed their scheduled service date'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            {machines?.filter(m => {
              if (!m.nextServiceDate) return false;
              return differenceInDays(new Date(m.nextServiceDate), new Date()) < 0;
            }).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machines.filter(m => {
                    if (!m.nextServiceDate) return false;
                    return differenceInDays(new Date(m.nextServiceDate), new Date()) < 0;
                  }).map((machine: Machine) => (
                    <TableRow key={machine.id}>
                      <TableCell className="font-medium">{machine.name}</TableCell>
                      <TableCell>{machine.serialNumber}</TableCell>
                      <TableCell>{machine.location}</TableCell>
                      <TableCell>
                        {categories?.find(c => c.id === machine.categoryId)?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {machine.nextServiceDate ? 
                          format(new Date(machine.nextServiceDate), 'MMM d, yyyy') : 
                          'Not scheduled'
                        }
                      </TableCell>
                      <TableCell className="text-red-500 font-medium">
                        {Math.abs(differenceInDays(new Date(machine.nextServiceDate!), new Date()))} days
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedMachine(machine);
                            setShowOverdueServicesDialog(false);
                          }}
                        >
                          Service
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground bg-slate-50 rounded-md">
                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <p className="font-medium text-green-700">
                  {i18n.language === 'en' ? 'All machines are up to date!' : 
                   i18n.language === 'es' ? '¡Todas las máquinas están actualizadas!' : 
                   i18n.language === 'pl' ? 'Wszystkie maszyny są aktualne!' : 
                   'All machines are up to date!'}
                </p>
                <p className="text-sm mt-1">
                  {i18n.language === 'en' ? 'No overdue services at this time.' : 
                   i18n.language === 'es' ? 'No hay servicios atrasados en este momento.' : 
                   i18n.language === 'pl' ? 'Brak zaległych serwisów na ten moment.' : 
                   'No overdue services at this time.'}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowOverdueServicesDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Upcoming Services Dialog */}
      <Dialog open={showUpcomingServicesDialog} onOpenChange={setShowUpcomingServicesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-amber-500 flex items-center gap-2">
              <Clock className="h-5 w-5" /> 
              {i18n.language === 'en' ? 'Upcoming Services' : 
               i18n.language === 'es' ? 'Próximos Servicios' : 
               i18n.language === 'pl' ? 'Nadchodzące Serwisy' : 
               'Upcoming Services'}
            </DialogTitle>
            <DialogDescription>
              {i18n.language === 'en' ? 'Machines scheduled for service in the next 7 days' : 
               i18n.language === 'es' ? 'Máquinas programadas para servicio en los próximos 7 días' : 
               i18n.language === 'pl' ? 'Maszyny zaplanowane do serwisu w ciągu najbliższych 7 dni' : 
               'Machines scheduled for service in the next 7 days'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            {machines?.filter(m => {
              if (!m.nextServiceDate) return false;
              const days = differenceInDays(new Date(m.nextServiceDate), new Date());
              return days >= 0 && days <= 7;
            }).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Service Date</TableHead>
                    <TableHead>Days Remaining</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machines.filter(m => {
                    if (!m.nextServiceDate) return false;
                    const days = differenceInDays(new Date(m.nextServiceDate), new Date());
                    return days >= 0 && days <= 7;
                  }).map((machine: Machine) => (
                    <TableRow key={machine.id}>
                      <TableCell className="font-medium">{machine.name}</TableCell>
                      <TableCell>{machine.serialNumber}</TableCell>
                      <TableCell>{machine.location}</TableCell>
                      <TableCell>
                        {categories?.find(c => c.id === machine.categoryId)?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {machine.nextServiceDate ? 
                          format(new Date(machine.nextServiceDate), 'MMM d, yyyy') : 
                          'Not scheduled'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {differenceInDays(new Date(machine.nextServiceDate!), new Date())} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedMachine(machine);
                            setShowUpcomingServicesDialog(false);
                          }}
                        >
                          Schedule
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground bg-slate-50 rounded-md">
                <Calendar className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="font-medium">
                  {i18n.language === 'en' ? 'No upcoming services' : 
                   i18n.language === 'es' ? 'No hay próximos servicios' : 
                   i18n.language === 'pl' ? 'Brak nadchodzących serwisów' : 
                   'No upcoming services'}
                </p>
                <p className="text-sm mt-1">
                  {i18n.language === 'en' ? 'No machines are scheduled for service in the next 7 days.' : 
                   i18n.language === 'es' ? 'No hay máquinas programadas para servicio en los próximos 7 días.' : 
                   i18n.language === 'pl' ? 'Żadne maszyny nie są zaplanowane do serwisu w ciągu najbliższych 7 dni.' : 
                   'No machines are scheduled for service in the next 7 days.'}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowUpcomingServicesDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Viewer for full-screen image display */}
      <ImageViewer 
        imageUrl={selectedImage}
        alt="Machine image"
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
      
      {/* Machine Details Dialog */}
      <Dialog open={showMachineDetailsDialog} onOpenChange={setShowMachineDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {i18n.language === 'en' ? 'Machine Details' : 
               i18n.language === 'es' ? 'Detalles de la Máquina' : 
               i18n.language === 'pl' ? 'Szczegóły Maszyny' : 'Machine Details'}
            </DialogTitle>
          </DialogHeader>
          {selectedMachine && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'en' ? 'Name' : 
                     i18n.language === 'es' ? 'Nombre' : 
                     i18n.language === 'pl' ? 'Nazwa' : 'Name'}
                  </Label>
                  <p className="text-base font-medium">{selectedMachine.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'en' ? 'Serial Number' : 
                     i18n.language === 'es' ? 'Número de Serie' : 
                     i18n.language === 'pl' ? 'Numer Seryjny' : 'Serial Number'}
                  </Label>
                  <p className="text-base">{selectedMachine.serialNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'en' ? 'Model' : 
                     i18n.language === 'es' ? 'Modelo' : 
                     i18n.language === 'pl' ? 'Model' : 'Model'}
                  </Label>
                  <p className="text-base">{selectedMachine.model || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'en' ? 'Manufacturer' : 
                     i18n.language === 'es' ? 'Fabricante' : 
                     i18n.language === 'pl' ? 'Producent' : 'Manufacturer'}
                  </Label>
                  <p className="text-base">{selectedMachine.manufacturer || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'en' ? 'Location' : 
                     i18n.language === 'es' ? 'Ubicación' : 
                     i18n.language === 'pl' ? 'Lokalizacja' : 'Location'}
                  </Label>
                  <p className="text-base">{selectedMachine.location}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'en' ? 'Installation Date' : 
                     i18n.language === 'es' ? 'Fecha de Instalación' : 
                     i18n.language === 'pl' ? 'Data Instalacji' : 'Installation Date'}
                  </Label>
                  <p className="text-base">
                    {selectedMachine.installationDate ? 
                      format(new Date(selectedMachine.installationDate), 'MMM d, yyyy', { locale: getDateLocale() }) : 
                      'N/A'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'en' ? 'Next Service' : 
                     i18n.language === 'es' ? 'Próximo Servicio' : 
                     i18n.language === 'pl' ? 'Następny Serwis' : 'Next Service'}
                  </Label>
                  <p className="text-base">
                    {selectedMachine.nextServiceDate ? 
                      format(new Date(selectedMachine.nextServiceDate), 'MMM d, yyyy') : 
                      'Not scheduled'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'en' ? 'Service Interval' : 
                     i18n.language === 'es' ? 'Intervalo de Servicio' : 
                     i18n.language === 'pl' ? 'Interwał Serwisu' : 'Service Interval'}
                  </Label>
                  <p className="text-base">
                    {selectedMachine.serviceIntervalDays} {i18n.language === 'en' ? 'days' : 
                     i18n.language === 'es' ? 'días' : 
                     i18n.language === 'pl' ? 'dni' : 'days'}
                  </p>
                </div>
              </div>
              
              {selectedMachine.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {i18n.language === 'en' ? 'Description' : 
                     i18n.language === 'es' ? 'Descripción' : 
                     i18n.language === 'pl' ? 'Opis' : 'Description'}
                  </Label>
                  <p className="text-base mt-1">{selectedMachine.description}</p>
                </div>
              )}
              

            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowMachineDetailsDialog(false)}
            >
              {i18n.language === 'en' ? 'Close' : 
               i18n.language === 'es' ? 'Cerrar' : 
               i18n.language === 'pl' ? 'Zamknij' : 'Close'}
            </Button>
            <Button 
              onClick={() => {
                // Store machine filter for the reports page
                if (selectedMachine) {
                  sessionStorage.setItem('machineFilter', JSON.stringify({
                    machineId: selectedMachine.id,
                    machineName: selectedMachine.name,
                    machineSerial: selectedMachine.serialNumber
                  }));
                }
                setLocation('/my-reports');
                setShowMachineDetailsDialog(false);
              }}
            >
              {i18n.language === 'en' ? 'View Issues' : 
               i18n.language === 'es' ? 'Ver Problemas' : 
               i18n.language === 'pl' ? 'Zobacz Problemy' : 'View Issues'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Remove Machine Confirmation Dialog */}
      <Dialog open={showRemoveMachineDialog} onOpenChange={setShowRemoveMachineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Machine</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {machineToRemove?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRemoveMachineDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRemoveMachine}
            >
              Remove Machine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Location Management Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {i18n.language === 'en' ? 'Switch Location' : 
               i18n.language === 'es' ? 'Cambiar Ubicación' : 
               i18n.language === 'pl' ? 'Zmień Lokalizację' : 'Switch Location'}
            </DialogTitle>
            <DialogDescription>
              {i18n.language === 'en' ? 'Select a location to view its machines and issues.' : 
               i18n.language === 'es' ? 'Selecciona una ubicación para ver sus máquinas y problemas.' : 
               i18n.language === 'pl' ? 'Wybierz lokalizację, aby zobaczyć jej maszyny i zgłoszenia.' : 
               'Select a location to view its machines and issues.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="location-select">
                {i18n.language === 'en' ? 'Select Location' : 
                 i18n.language === 'es' ? 'Seleccionar Ubicación' : 
                 i18n.language === 'pl' ? 'Wybierz Lokalizację' : 'Select Location'}
              </Label>
              <Select
                value={selectedLocationForChange}
                onValueChange={setSelectedLocationForChange}
              >
                <SelectTrigger id="location-select">
                  <SelectValue placeholder={
                    i18n.language === 'en' ? 'Select a location' : 
                    i18n.language === 'es' ? 'Selecciona una ubicación' : 
                    i18n.language === 'pl' ? 'Wybierz lokalizację' : 'Select a location'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLocationDialog(false)}>
              {i18n.language === 'en' ? 'Cancel' : 
               i18n.language === 'es' ? 'Cancelar' : 
               i18n.language === 'pl' ? 'Anuluj' : 'Cancel'}
            </Button>
            <Button onClick={handleLocationChange}>
              {i18n.language === 'en' ? 'Switch Location' : 
               i18n.language === 'es' ? 'Cambiar Ubicación' : 
               i18n.language === 'pl' ? 'Zmień Lokalizację' : 'Switch Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={showEditCategoryDialog} onOpenChange={setShowEditCategoryDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {i18n.language === 'en' ? 'Manage Categories' : 
               i18n.language === 'es' ? 'Gestionar Categorías' : 
               i18n.language === 'pl' ? 'Zarządzaj Kategoriami' : 'Manage Categories'}
            </DialogTitle>
            <DialogDescription>
              {i18n.language === 'en' ? 'Edit existing categories, add new ones, or remove categories' : 
               i18n.language === 'es' ? 'Editar categorías existentes, agregar nuevas o eliminar categorías' : 
               i18n.language === 'pl' ? 'Edytuj istniejące kategorie, dodawaj nowe lub usuwaj kategorie' : 
               'Edit existing categories, add new ones, or remove categories'}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">
                {i18n.language === 'en' ? 'Edit Category' : 
                 i18n.language === 'es' ? 'Editar Categoría' : 
                 i18n.language === 'pl' ? 'Edytuj Kategorię' : 'Edit Category'}
              </TabsTrigger>
              <TabsTrigger value="manage">
                {i18n.language === 'en' ? 'Add/Remove' : 
                 i18n.language === 'es' ? 'Agregar/Quitar' : 
                 i18n.language === 'pl' ? 'Dodaj/Usuń' : 'Add/Remove'}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="edit" className="space-y-4 mt-4">
              {editingCategory && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="editCategoryName">
                      {i18n.language === 'en' ? 'Category Name' : 
                       i18n.language === 'es' ? 'Nombre de Categoría' : 
                       i18n.language === 'pl' ? 'Nazwa Kategorii' : 'Category Name'}
                    </Label>
                    <Input 
                      id="editCategoryName" 
                      placeholder={i18n.language === 'en' ? 'e.g. Office Equipment' : 
                                  i18n.language === 'es' ? 'ej. Equipo de Oficina' : 
                                  i18n.language === 'pl' ? 'np. Wyposażenie Biurowe' : 'e.g. Office Equipment'} 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editCategoryDescription">
                      {i18n.language === 'en' ? 'Description (Optional)' : 
                       i18n.language === 'es' ? 'Descripción (Opcional)' : 
                       i18n.language === 'pl' ? 'Opis (Opcjonalny)' : 'Description (Optional)'}
                    </Label>
                    <Input 
                      id="editCategoryDescription" 
                      placeholder={i18n.language === 'en' ? 'e.g. Equipment used in office areas' : 
                                  i18n.language === 'es' ? 'ej. Equipo utilizado en áreas de oficina' : 
                                  i18n.language === 'pl' ? 'np. Urządzenia używane w obszarach biurowych' : 'e.g. Equipment used in office areas'} 
                      value={newCategoryDescription}
                      onChange={(e) => setNewCategoryDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editCategoryServiceInterval">
                      {i18n.language === 'en' ? 'Service Interval (days)' : 
                       i18n.language === 'es' ? 'Intervalo de Servicio (días)' : 
                       i18n.language === 'pl' ? 'Interwał Serwisu (dni)' : 'Service Interval (days)'}
                    </Label>
                    <Input 
                      id="editCategoryServiceInterval" 
                      type="number"
                      min="1"
                      placeholder="90" 
                      value={newCategoryServiceInterval}
                      onChange={(e) => setNewCategoryServiceInterval(e.target.value)}
                    />
                  </div>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="manage" className="space-y-4 mt-4">
              {/* Add New Category Section */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">
                  {i18n.language === 'en' ? 'Add New Category' : 
                   i18n.language === 'es' ? 'Agregar Nueva Categoría' : 
                   i18n.language === 'pl' ? 'Dodaj Nową Kategorię' : 'Add New Category'}
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="addNewCategoryName">
                    {i18n.language === 'en' ? 'Category Name' : 
                     i18n.language === 'es' ? 'Nombre de Categoría' : 
                     i18n.language === 'pl' ? 'Nazwa Kategorii' : 'Category Name'}
                  </Label>
                  <Input 
                    id="addNewCategoryName" 
                    placeholder={i18n.language === 'en' ? 'e.g. Security Equipment' : 
                                i18n.language === 'es' ? 'ej. Equipo de Seguridad' : 
                                i18n.language === 'pl' ? 'np. Wyposażenie Bezpieczeństwa' : 'e.g. Security Equipment'} 
                    value={addNewCategoryName}
                    onChange={(e) => setAddNewCategoryName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addNewCategoryDescription">
                    {i18n.language === 'en' ? 'Description (Optional)' : 
                     i18n.language === 'es' ? 'Descripción (Opcional)' : 
                     i18n.language === 'pl' ? 'Opis (Opcjonalny)' : 'Description (Optional)'}
                  </Label>
                  <Input 
                    id="addNewCategoryDescription" 
                    placeholder={i18n.language === 'en' ? 'e.g. Safety and security equipment' : 
                                i18n.language === 'es' ? 'ej. Equipo de seguridad y protección' : 
                                i18n.language === 'pl' ? 'np. Sprzęt bezpieczeństwa i ochrony' : 'e.g. Safety and security equipment'} 
                    value={addNewCategoryDescription}
                    onChange={(e) => setAddNewCategoryDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addNewCategoryServiceInterval">
                    {i18n.language === 'en' ? 'Service Interval (days)' : 
                     i18n.language === 'es' ? 'Intervalo de Servicio (días)' : 
                     i18n.language === 'pl' ? 'Interwał Serwisu (dni)' : 'Service Interval (days)'}
                  </Label>
                  <Input 
                    id="addNewCategoryServiceInterval" 
                    type="number"
                    min="1"
                    placeholder="180" 
                    value={addNewCategoryServiceInterval}
                    onChange={(e) => setAddNewCategoryServiceInterval(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleAddNewCategory}
                  disabled={!addNewCategoryName}
                  className="w-full"
                >
                  {i18n.language === 'en' ? 'Add Category' : 
                   i18n.language === 'es' ? 'Agregar Categoría' : 
                   i18n.language === 'pl' ? 'Dodaj Kategorię' : 'Add Category'}
                </Button>
              </div>
              
              {/* Remove Existing Category Section */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-red-600">
                  {i18n.language === 'en' ? 'Remove Category' : 
                   i18n.language === 'es' ? 'Eliminar Categoría' : 
                   i18n.language === 'pl' ? 'Usuń Kategorię' : 'Remove Category'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {i18n.language === 'en' ? 'Warning: Removing a category will affect machines assigned to it.' : 
                   i18n.language === 'es' ? 'Advertencia: Eliminar una categoría afectará las máquinas asignadas a ella.' : 
                   i18n.language === 'pl' ? 'Ostrzeżenie: Usunięcie kategorii wpłynie na maszyny przypisane do niej.' : 
                   'Warning: Removing a category will affect machines assigned to it.'}
                </p>
                <div className="space-y-2">
                  <Label>
                    {i18n.language === 'en' ? 'Select Category to Remove' : 
                     i18n.language === 'es' ? 'Seleccionar Categoría para Eliminar' : 
                     i18n.language === 'pl' ? 'Wybierz Kategorię do Usunięcia' : 'Select Category to Remove'}
                  </Label>
                  <Select value={categoryToRemove} onValueChange={setCategoryToRemove}>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        i18n.language === 'en' ? 'Choose category...' : 
                        i18n.language === 'es' ? 'Elegir categoría...' : 
                        i18n.language === 'pl' ? 'Wybierz kategorię...' : 'Choose category...'
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category: MachineCategory) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name} ({machines?.filter(m => m.categoryId === category.id).length || 0} machines)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleRemoveCategory}
                  disabled={!categoryToRemove}
                  variant="destructive"
                  className="w-full"
                >
                  {i18n.language === 'en' ? 'Remove Category' : 
                   i18n.language === 'es' ? 'Eliminar Categoría' : 
                   i18n.language === 'pl' ? 'Usuń Kategorię' : 'Remove Category'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowEditCategoryDialog(false)}
            >
              {i18n.language === 'en' ? 'Close' : 
               i18n.language === 'es' ? 'Cerrar' : 
               i18n.language === 'pl' ? 'Zamknij' : 'Close'}
            </Button>
            <Button 
              onClick={handleSaveEditedCategory}
              disabled={!newCategoryName}
            >
              {i18n.language === 'en' ? 'Save Changes' : 
               i18n.language === 'es' ? 'Guardar Cambios' : 
               i18n.language === 'pl' ? 'Zapisz Zmiany' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Service Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Service</DialogTitle>
            <DialogDescription>
              Schedule maintenance service for {machineToSchedule?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="service-date">Service Date</Label>
              <Input 
                id="service-date" 
                type="date"
                min={format(new Date(), 'yyyy-MM-dd')}
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="service-description">Service Description</Label>
              <Textarea 
                id="service-description" 
                placeholder="Describe the maintenance work to be performed..."
                rows={3}
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="technician">Assign Technician (Optional)</Label>
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger>
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-assign</SelectItem>
                  {availableTechnicians.map((technician) => (
                    <SelectItem key={technician.id} value={technician.id.toString()}>
                      {technician.username} ({technician.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button 
              disabled={!machineToSchedule || !serviceDate}
              onClick={async () => {
              if (machineToSchedule && serviceDate) {
                const technicianName = selectedTechnician === 'auto' ? 'Auto-assigned' : 
                                     (() => {
                                       const technician = availableTechnicians.find(t => t.id.toString() === selectedTechnician);
                                       return technician ? `${technician.username} (${technician.role})` : 'Unassigned';
                                     })();
                
                const newScheduledService = {
                  machineId: machineToSchedule.id,
                  serviceDate,
                  technician: technicianName,
                  description: serviceDescription,
                  status: 'Scheduled',
                  cost: '-'
                };
                
                setScheduledServices(prev => [...prev, newScheduledService]);
                
                // Send push notification to all users via WebSocket
                try {
                  const response = await fetch('/api/notifications/service-scheduled', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      machineName: machineToSchedule.name,
                      serviceDate,
                      technician: technicianName,
                      description: serviceDescription,
                      location: locationName
                    }),
                  });
                  
                  if (response.ok) {
                    console.log('Push notification sent to all users');
                  }
                } catch (error) {
                  console.error('Failed to send push notification:', error);
                }
                
                toast({
                  title: "Service Scheduled & Team Notified",
                  description: `Maintenance scheduled for ${machineToSchedule?.name} on ${format(new Date(serviceDate), 'MMM d, yyyy')}. All team members have been notified.`,
                });
                
                // Reset form
                setServiceDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
                setServiceDescription('');
                setSelectedTechnician('');
                setShowScheduleDialog(false);
              }
            }}>
              Schedule Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}