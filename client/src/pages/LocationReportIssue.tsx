import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { insertIssueSchema, IssueStatus, IssuePriority, IssueCategory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { resizeImage, validateImage } from "@/lib/imageUtils";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

// Helper function for direct translations to avoid translation key issues
const getLocalizedText = (key: string, en: string, es: string, pl: string) => {
  if (i18n.language.startsWith('es')) return es;
  if (i18n.language.startsWith('pl')) return pl;
  return en; // Default to English
};
import { v4 as uuidv4 } from 'uuid';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, Loader2, AlertTriangle, Trash, Building, LayoutDashboard, DoorClosed, Plus, Building2, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import TranslateLocationName from "@/components/location/TranslateLocationName";

// Types for buildings data
interface BuildingData {
  id: string;
  name: string;
  floors: FloorData[];
}

interface FloorData {
  id: string;
  name: string;
  rooms: RoomData[];
}

interface RoomData {
  id: string;
  name: string;
}

// Form schema for issue reporting
const formSchema = z.object({
  category: z.enum([IssueCategory.MACHINE, IssueCategory.GENERAL]).default(IssueCategory.GENERAL),
  title: z.string().min(5, "Title must be at least 5 characters long"),
  description: z.string().optional().default(""),
  location: z.string().min(1, "Location is required"),
  status: z.string().default(IssueStatus.PENDING),
  priority: z.enum([IssuePriority.LOW, IssuePriority.MEDIUM, IssuePriority.HIGH]),
  reporterId: z.number().default(1),
  reportedByName: z.string().default("Demo User"),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  technicianId: z.number().optional().nullable(),
  fixedByName: z.string().optional().nullable(),
  machineId: z.number().optional().nullable(),
  createdAt: z.date().optional().nullable(),
  submissionTime: z.string().optional().nullable(),
});

export default function LocationReportIssue() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  
  // Location management state
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [selectedFloorId, setSelectedFloorId] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [newLocationName, setNewLocationName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [locationText, setLocationText] = useState("");

  // Fetch machines for machine-specific issues
  const { data: machines = [], isLoading: machinesLoading } = useQuery({
    queryKey: ['/api/machines'],
    enabled: true,
  });

  // Filter machines based on selected location
  const filteredMachines = machines.filter((machine: any) => {
    if (!locationText) return false;
    
    // Extract the building name from locationText (format: "Building > Floor > Room")
    const buildingName = locationText.split(' > ')[0];
    
    // Check if machine location matches the selected building
    return machine.location && machine.location.toLowerCase().includes(buildingName.toLowerCase());
  });
  
  // State for image uploads
  const [images, setImages] = useState<File[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  // References to selected items
  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);
  const selectedFloor = selectedBuilding?.floors.find(f => f.id === selectedFloorId);
  const selectedRoom = selectedFloor?.rooms.find(r => r.id === selectedRoomId);
  
  // Load custom locations from localStorage
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      try {
        const savedLocations = localStorage.getItem('mcd-locations');
        if (savedLocations) {
          const parsedLocations = JSON.parse(savedLocations);
          setBuildings(parsedLocations);
        } else {
          // Create default locations if none exist
          initializeDefaultLocations();
        }
      } catch (error) {
        console.error('Error loading custom locations:', error);
        toast({
          title: "Error",
          description: "Failed to load location data. Creating default locations.",
          variant: "destructive",
        });
        initializeDefaultLocations();
      }
    }
  }, [toast]);
  
  // Save buildings to localStorage whenever they change
  useEffect(() => {
    try {
      if (typeof window === 'undefined' || buildings.length === 0) return;
      localStorage.setItem('mcd-locations', JSON.stringify(buildings));
    } catch (error) {
      console.error('Error saving locations:', error);
    }
  }, [buildings]);
  
  // Initialize default locations for first-time users
  const initializeDefaultLocations = () => {
    const defaultLocations: BuildingData[] = [
      {
        id: uuidv4(),
        name: "McDonald's Shopping Mall",
        floors: [
          {
            id: uuidv4(),
            name: "Ground Floor",
            rooms: [
              { id: uuidv4(), name: "Kitchen" },
              { id: uuidv4(), name: "Dining Area" },
              { id: uuidv4(), name: "Restrooms" }
            ]
          },
          {
            id: uuidv4(),
            name: "First Floor",
            rooms: [
              { id: uuidv4(), name: "Office" },
              { id: uuidv4(), name: "Storage" }
            ]
          }
        ]
      },
      {
        id: uuidv4(),
        name: "Jakubowski McDonald's",
        floors: [
          {
            id: uuidv4(),
            name: "Main Floor",
            rooms: [
              { id: uuidv4(), name: "Kitchen" },
              { id: uuidv4(), name: "Counter Area" },
              { id: uuidv4(), name: "Dining Area" }
            ]
          }
        ]
      }
    ];
    
    setBuildings(defaultLocations);
    localStorage.setItem('mcd-locations', JSON.stringify(defaultLocations));
  };
  
  // Form setup with defaultValues
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: IssueCategory.GENERAL,
      title: "",
      description: "",
      location: "",
      status: IssueStatus.PENDING,
      priority: IssuePriority.MEDIUM,
      reporterId: user?.id || 1,
      reportedByName: user?.username || "Anonymous",
      technicianId: null,
      fixedByName: null,
      machineId: null,
      latitude: null,
      longitude: null,
    },
  });
  
  // Functions for location management
  const handleAddBuilding = () => {
    if (!newLocationName.trim()) {
      toast({
        title: "Pole Wymagane",
        description: "Nazwa budynku jest wymagana",
        variant: "destructive",
      });
      return;
    }
    
    const newBuilding: BuildingData = {
      id: uuidv4(),
      name: newLocationName.trim(),
      floors: []
    };
    
    setBuildings([...buildings, newBuilding]);
    setNewLocationName('');
    
    toast({
      title: t('locations.buildingCreated', "Building Created"),
      description: t('locations.buildingCreatedDescription', "New building has been added successfully"),
    });
    
    // Auto-select the new building
    setSelectedBuildingId(newBuilding.id);
  };
  
  const handleAddFloor = () => {
    if (!selectedBuildingId) {
      toast({
        title: getLocalizedText('validation.selectionRequired', 'Selection Required', 'Selección Requerida', 'Wybór Wymagany'),
        description: getLocalizedText('locations.selectBuildingFirst', 'Please select a building first', 'Por favor selecciona un edificio primero', 'Najpierw wybierz budynek'),
        variant: "destructive",
      });
      return;
    }
    
    // Adding console logs to debug floor creation
    console.log('Adding new floor, name:', newLocationName);
    console.log('Selected building ID:', selectedBuildingId);
    
    if (!newLocationName || !newLocationName.trim()) {
      toast({
        title: getLocalizedText('validation.requiredField', 'Required Field', 'Campo Obligatorio', 'Pole Wymagane'),
        description: getLocalizedText('locations.floorNameRequired', 'Floor name is required', 'El nombre del piso es obligatorio', 'Nazwa piętra jest wymagana'),
        variant: "destructive",
      });
      return;
    }
    
    const updatedBuildings = buildings.map(building => {
      if (building.id === selectedBuildingId) {
        const newFloor: FloorData = {
          id: uuidv4(),
          name: newLocationName.trim(),
          rooms: []
        };
        
        return {
          ...building,
          floors: [...building.floors, newFloor]
        };
      }
      return building;
    });
    
    setBuildings(updatedBuildings);
    setNewLocationName('');
    
    // Find and select the newly created floor
    const newFloorId = updatedBuildings
      .find(b => b.id === selectedBuildingId)?.floors
      .slice(-1)[0]?.id;
    
    if (newFloorId) {
      setSelectedFloorId(newFloorId);
    }
    
    toast({
      title: t('locations.floorCreated', "Floor Created"),
      description: t('locations.floorCreatedDescription', "New floor has been added successfully"),
    });
  };
  
  const handleAddRoom = () => {
    if (!selectedBuildingId || !selectedFloorId) {
      toast({
        title: getLocalizedText('validation.selectionRequired', 'Selection Required', 'Selección Requerida', 'Wybór Wymagany'),
        description: getLocalizedText('locations.selectFloorFirst', 'Please select a floor first', 'Por favor selecciona un piso primero', 'Najpierw wybierz piętro'),
        variant: "destructive",
      });
      return;
    }
    
    if (!newLocationName.trim()) {
      toast({
        title: getLocalizedText('validation.requiredField', 'Required Field', 'Campo Obligatorio', 'Pole Wymagane'),
        description: getLocalizedText('locations.roomNameRequired', 'Room name is required', 'El nombre de la sala es obligatorio', 'Nazwa pokoju jest wymagana'),
        variant: "destructive",
      });
      return;
    }
    
    const updatedBuildings = buildings.map(building => {
      if (building.id === selectedBuildingId) {
        return {
          ...building,
          floors: building.floors.map(floor => {
            if (floor.id === selectedFloorId) {
              const newRoom: RoomData = {
                id: uuidv4(),
                name: newLocationName.trim()
              };
              
              return {
                ...floor,
                rooms: [...floor.rooms, newRoom]
              };
            }
            return floor;
          })
        };
      }
      return building;
    });
    
    setBuildings(updatedBuildings);
    setNewLocationName('');
    
    // Find and select the newly created room
    const newRoomId = updatedBuildings
      .find(b => b.id === selectedBuildingId)?.floors
      .find(f => f.id === selectedFloorId)?.rooms
      .slice(-1)[0]?.id;
    
    if (newRoomId) {
      setSelectedRoomId(newRoomId);
    }
    
    toast({
      title: t('locations.roomCreated', "Room Created"),
      description: t('locations.roomCreatedDescription', "New room has been added successfully"),
    });
  };
  
  // Image upload handling
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setImageUploading(true);
    
    try {
      const files = Array.from(e.target.files);
      const processedFiles: File[] = [];
      const newPreviewUrls: string[] = [];
      
      for (const file of files) {
        // Validate the image
        const validationResult = validateImage(file);
        if (typeof validationResult === 'string') {
          toast({
            title: "Invalid image",
            description: validationResult,
            variant: "destructive",
          });
          continue;
        }
        
        const resizedFile = await resizeImage(file);
        processedFiles.push(resizedFile);
        
        // Create a preview URL
        const previewUrl = URL.createObjectURL(resizedFile);
        newPreviewUrls.push(previewUrl);
      }
      
      // Update state with new images and previews
      setImages(prev => [...prev, ...processedFiles]);
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    } catch (error) {
      console.error("Error processing images:", error);
      toast({
        title: "Error",
        description: "Failed to process images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setImageUploading(false);
      // Reset the input element to allow selecting the same file again
      e.target.value = '';
    }
  };
  
  // Remove an image
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    
    // Release the object URL to avoid memory leaks
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Mutation for submitting the issue
  const createIssueMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      console.log('Submitting issue with data:', data);
      
      // First create the issue
      const response = await apiRequest("POST", "/api/issues", data);
      
      if (!response.ok) {
        throw new Error("Failed to create issue");
      }
      
      const issueData = await response.json();
      
      // If we have images, upload them
      if (images.length > 0) {
        const issueId = issueData.id;
        const formData = new FormData();
        
        // Add each image to the form data
        images.forEach((image) => {
          formData.append('images', image);
        });
        
        // Add the issue ID to the form data
        formData.append('issueId', issueId.toString());
        
        // Upload the images
        const imageResponse = await fetch('/api/issues/images', {
          method: 'POST',
          body: formData,
        });
        
        if (!imageResponse.ok) {
          throw new Error("Failed to upload images");
        }
      }
      
      return issueData;
    },
    onSuccess: (data) => {
      console.log('Issue created successfully:', data);
      
      // Clear the form
      form.reset();
      
      // Clear images
      setImages([]);
      setPreviewUrls([]);
      
      // Reset location selections
      setSelectedBuildingId("");
      setSelectedFloorId("");
      setSelectedRoomId("");
      setLocationText("");
      
      // Show success message
      toast({
        title: "Issue reported",
        description: "Your issue has been reported successfully",
        variant: "default",
      });
      
      // Invalidate queries to refetch the issues list
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
      
      // Navigate to the dashboard
      setLocation("/");
    },
    onError: (error) => {
      console.error("Error reporting issue:", error);
      toast({
        title: "Error",
        description: "Failed to report issue. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Log the form data being submitted
    console.log('Form data before submission:', data);
    
    // Add current date for createdAt field
    const dataWithDate = {
      ...data,
      createdAt: new Date(),
      submissionTime: format(new Date(), 'MM/dd/yyyy, h:mm:ss a')
    };
    
    // Submit the form data with proper date format
    createIssueMutation.mutate(dataWithDate);
  };
  
  // Update form location when selections change
  useEffect(() => {
    let newLocationText = "";
    
    if (selectedBuilding) {
      newLocationText = selectedBuilding.name;
      
      if (selectedFloor) {
        newLocationText += ` > ${selectedFloor.name}`;
        
        if (selectedRoom) {
          newLocationText += ` > ${selectedRoom.name}`;
        }
      }
    }
    
    // Update the location text state
    setLocationText(newLocationText);
    
    // Also update the form field if we have a valid location
    if (newLocationText) {
      form.setValue("location", newLocationText, { 
        shouldValidate: true, 
        shouldDirty: true, 
        shouldTouch: true 
      });
    }
  }, [selectedBuildingId, selectedFloorId, selectedRoomId, selectedBuilding, selectedFloor, selectedRoom, form]);

  return (
    <div className="w-full max-w-4xl mx-auto pb-20">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{i18n.language === 'en' ? "Report an Issue" : t('issues.reportAnIssue')}</h1>
        <p className="text-muted-foreground mt-1">{i18n.language === 'en' ? "Report issues for faster resolution" : t('issues.reportDetails')}</p>
      </div>

      {/* Step 1: Location Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{i18n.language === 'en' ? "Step 1: Select Location" : t('locations.customLocationSelection')}</CardTitle>
          <CardDescription>
            {i18n.language === 'en' ? "First choose the location where the issue is occurring" : t('locations.selectFromCustomLocations')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {buildings.length > 0 ? (
              <div className="space-y-4">
                {/* Building selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {getLocalizedText('locations.building', 'Building', 'Edificio', 'Budynek')}
                    </Label>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => {
                        // Show the input field for adding a new building
                        setShowAddForm(true);
                        setNewLocationName("");
                      }}
                      type="button"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      <span>{i18n.language === 'en' ? "Add New" : (i18n.language === 'es' ? "Añadir Nuevo" : "Dodaj Nowy")}</span>
                    </Button>
                  </div>
                  
                  <Select
                    value={selectedBuildingId || undefined}
                    onValueChange={(value) => {
                      setSelectedBuildingId(value);
                      setSelectedFloorId("");
                      setSelectedRoomId("");
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={i18n.language === 'en' ? "Select Building" : (i18n.language === 'es' ? "Seleccionar Edificio" : "Wybierz Budynek")} />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                          <TranslateLocationName name={building.name} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Floor selection - only shown if a building is selected */}
                {selectedBuilding && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1">
                        <LayoutDashboard className="h-4 w-4" />
                        {i18n.language === 'en' ? "Floor" : (i18n.language === 'es' ? "Piso" : "Piętro")}
                      </Label>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => {
                          // Show the input field for adding a new floor
                          console.log('Floor add button clicked');
                          setShowAddForm(true);
                          setNewLocationName("");
                        }}
                        type="button"
                        disabled={!selectedBuildingId}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        <span>{getLocalizedText('locations.addNew', 'Add New', 'Agregar Nuevo', 'Dodaj Nowy')}</span>
                      </Button>
                    </div>
                    
                    <Select
                      value={selectedFloorId || undefined}
                      onValueChange={(value) => {
                        setSelectedFloorId(value);
                        setSelectedRoomId("");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={i18n.language === 'en' ? "Select Floor" : (i18n.language === 'es' ? "Seleccionar Piso" : "Wybierz Piętro")} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedBuilding?.floors?.map((floor) => (
                          <SelectItem key={floor.id} value={floor.id}>
                            <TranslateLocationName name={floor.name} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Room selection - only shown if a floor is selected */}
                {selectedFloor && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1">
                        <DoorClosed className="h-4 w-4" />
                        {t('locations.room', "Sala")}
                      </Label>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => {
                          // Show the input field for adding a new room
                          setShowAddForm(true);
                          setNewLocationName("");
                        }}
                        type="button"
                        disabled={!selectedFloorId}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        <span>{getLocalizedText('locations.addNew', 'Add New', 'Agregar Nuevo', 'Dodaj Nowy')}</span>
                      </Button>
                    </div>
                    
                    <Select
                      value={selectedRoomId || undefined}
                      onValueChange={(value) => {
                        setSelectedRoomId(value);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('locations.selectRoom', "Seleccionar Sala")} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedFloor?.rooms?.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            <TranslateLocationName name={room.name} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Input form for adding new locations */}
                {showAddForm && (
                  <div className="space-y-2 border-t pt-3 mt-3">
                    <Label>
                      {(() => {
                        const translation = t('locations.newLocationName');
                        if (translation.includes('locations.')) {
                          return i18n.language === 'pl' ? 'Nazwa Nowej Lokalizacji' :
                                 i18n.language === 'es' ? 'Nombre de Nueva Ubicación' :
                                 'New Location Name';
                        }
                        return translation;
                      })()}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={newLocationName}
                        onChange={(e) => setNewLocationName(e.target.value)}
                        placeholder={(() => {
                          const translation = t('locations.enterName');
                          if (translation.includes('locations.')) {
                            return i18n.language === 'pl' ? 'Wprowadź nazwę' :
                                   i18n.language === 'es' ? 'Ingrese nombre' :
                                   'Enter name';
                          }
                          return translation;
                        })()}
                        autoFocus
                      />
                      <Button 
                        type="button"
                        onClick={() => {
                          if (!selectedBuildingId) {
                            handleAddBuilding();
                          } else if (!selectedFloorId) {
                            handleAddFloor();
                          } else {
                            handleAddRoom();
                          }
                          setShowAddForm(false);
                        }}
                      >
                        {(() => {
                          const translation = t('locations.add');
                          if (translation.includes('locations.')) {
                            return i18n.language === 'pl' ? 'Dodaj' :
                                   i18n.language === 'es' ? 'Agregar' :
                                   'Add';
                          }
                          return translation;
                        })()}
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Selected location path - to confirm current selection */}
                <div className="mt-4 pt-4 border-t">
                  <Label>{t('locations.selectedLocation', "Selected Location")}</Label>
                  <div className="mt-1.5 p-3 bg-muted rounded-md text-sm font-medium">
                    {locationText || t('locations.noLocationSelected', "No location selected")}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-gray-50 rounded-md flex flex-col items-center justify-center">
                <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('locations.noLocationsFound', "No Locations Found")}</h3>
                <p className="text-gray-600 text-center mb-4">
                  {t('locations.noLocationsDescription', "You need to set up locations before reporting issues.")}
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => initializeDefaultLocations()}
                  type="button"
                >
                  {t('locations.setupDefaultLocations', "Set Up Default Locations")}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Step 2: Issue Details */}
      {(locationText !== "") && (
        <Card>
          <CardHeader>
            <CardTitle>{i18n.language === 'en' ? "Step 2: Issue Details" : t('issues.issueDetails')}</CardTitle>
            <CardDescription>{i18n.language === 'en' ? "Fill out the issue details" : t('issues.fillOutForm')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Location field - read-only, managed by the selectors */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{i18n.language === 'en' ? "Location" : t('issues.location')}</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly value={locationText} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Issue Category Selection */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('form.issueCategory')}</FormLabel>
                      <FormControl>
                        <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                          <TabsList className="grid w-full grid-cols-2 h-auto min-h-[60px]">
                            <TabsTrigger value={IssueCategory.GENERAL} className="flex flex-col items-center gap-1 p-2 text-[10px] sm:text-sm h-auto min-h-[56px] leading-tight">
                              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="text-center break-words">{t('form.generalIssue')}</span>
                            </TabsTrigger>
                            <TabsTrigger value={IssueCategory.MACHINE} className="flex flex-col items-center gap-1 p-2 text-[10px] sm:text-sm h-auto min-h-[56px] leading-tight">
                              <Wrench className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="text-center break-words">{t('form.machineIssue')}</span>
                            </TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value={IssueCategory.GENERAL} className="space-y-4">
                            <div className="p-4 bg-amber-50 rounded-lg">
                              <h3 className="font-medium text-amber-900 mb-2">
                                {t('form.generalFacilityIssue')}
                              </h3>
                              <p className="text-sm text-amber-700">
                                {t('form.generalFacilityDescription')}
                              </p>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value={IssueCategory.MACHINE} className="space-y-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                              <h3 className="font-medium text-blue-900 mb-2">
                                {t('form.machineRelatedIssue')}
                              </h3>
                              <p className="text-sm text-blue-700">
                                {t('form.machineRelatedDescription')}
                              </p>
                            </div>
                            
                            {/* Machine Selection */}
                            <FormField
                              control={form.control}
                              name="machineId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {t('form.selectMachine')} 
                                    {!machinesLoading && filteredMachines.length > 0 && (
                                      <span className="text-sm font-normal text-gray-500 ml-2">
                                        ({filteredMachines.length} {t('form.available')})
                                      </span>
                                    )}
                                  </FormLabel>
                                  <Select 
                                    value={field.value?.toString()} 
                                    onValueChange={(value) => field.onChange(parseInt(value))}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={t('form.chooseMachineFromInventory')}>
                                          {field.value && (() => {
                                            const selectedMachine = filteredMachines.find((m: any) => m.id === field.value);
                                            return selectedMachine ? (
                                              <div className="flex items-center gap-2">
                                                <span>{selectedMachine.name}</span>
                                                <Badge variant="outline" className="text-xs">
                                                  {selectedMachine.serialNumber}
                                                </Badge>
                                              </div>
                                            ) : null;
                                          })()}
                                        </SelectValue>
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {machinesLoading ? (
                                        <SelectItem value="loading" disabled>
                                          <div className="flex items-center">
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Loading machines...
                                          </div>
                                        </SelectItem>
                                      ) : filteredMachines.length === 0 ? (
                                        <SelectItem value="no-machines" disabled>
                                          <div className="text-center py-2 text-gray-500">
                                            No machines found for this location
                                          </div>
                                        </SelectItem>
                                      ) : (
                                        filteredMachines.map((machine: any) => (
                                          <SelectItem key={machine.id} value={machine.id.toString()}>
                                            <div className="flex flex-col items-start gap-1 py-1 w-full">
                                              <div className="flex items-center gap-2 w-full">
                                                <span className="font-medium text-sm">{machine.name}</span>
                                                <Badge variant="outline" className="text-xs ml-auto">
                                                  {machine.serialNumber}
                                                </Badge>
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                {machine.location}
                                              </div>
                                            </div>
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TabsContent>
                        </Tabs>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              
                {/* Title field */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{i18n.language === 'en' ? "Title" : t('issues.title')}</FormLabel>
                      <FormControl>
                        <Input placeholder={i18n.language === 'es' ? "Título breve del problema" : (i18n.language === 'pl' ? "Krótki tytuł problemu" : "Brief issue title")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Description field */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{i18n.language === 'en' ? "Description" : t('issues.description')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={i18n.language === 'en' ? "Describe the issue in detail" : (i18n.language === 'es' ? "Describe el problema en detalle" : "Opisz szczegółowo problem")}
                          className="min-h-32"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Priority field */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{i18n.language === 'en' ? "Priority" : t('issues.priority')}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={IssuePriority.LOW} />
                            </FormControl>
                            <FormLabel className="font-normal">{i18n.language === 'en' ? "Low" : (i18n.language === 'es' ? "Baja" : "Niski")}</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={IssuePriority.MEDIUM} />
                            </FormControl>
                            <FormLabel className="font-normal">{i18n.language === 'en' ? "Medium" : (i18n.language === 'es' ? "Media" : "Średni")}</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={IssuePriority.HIGH} />
                            </FormControl>
                            <FormLabel className="font-normal">{i18n.language === 'en' ? "High" : (i18n.language === 'es' ? "Alta" : "Wysoki")}</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Image uploads */}
                <div className="space-y-4">
                  <Label>{i18n.language === 'es' ? "Imágenes" : (i18n.language === 'pl' ? "Zdjęcia" : "Photos")}</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Current image previews */}
                    {previewUrls.map((url, index) => (
                      <div key={index} className="relative rounded-md overflow-hidden border">
                        <img 
                          src={url} 
                          alt={`Upload preview ${index + 1}`}
                          className="w-full h-40 object-cover" 
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 rounded-full"
                          onClick={() => removeImage(index)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {/* Upload button */}
                    <div className="border border-dashed rounded-md flex flex-col items-center justify-center p-6 h-40">
                      <label
                        htmlFor="image-upload"
                        className="cursor-pointer flex flex-col items-center justify-center space-y-2 text-center"
                      >
                        <UploadCloud className="h-10 w-10 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {i18n.language === 'en' ? "Upload Images" : (i18n.language === 'es' ? "Subir Imágenes" : "Prześlij Zdjęcia")}
                        </span>
                        <span className="text-xs text-muted-foreground max-w-[200px]">
                          {i18n.language === 'en' ? "Upload up to 3 images (max 5MB each)" : (i18n.language === 'es' ? "Sube hasta 3 imágenes (máx. 5MB cada una)" : "Prześlij do 3 zdjęć (maks. 5MB każde)")}
                        </span>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          multiple
                          className="sr-only"
                          onChange={handleImageUpload}
                          disabled={imageUploading}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={createIssueMutation.isPending || imageUploading || locationText === ""}
                  >
                    {createIssueMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {i18n.language === 'en' ? "Submit Report" : (i18n.language === 'es' ? "Enviar Informe" : "Wyślij Zgłoszenie")}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Show a message if no location is selected */}
      {locationText === "" && buildings.length > 0 && (
        <Card className="mt-4 bg-gray-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium">{i18n.language === 'en' ? "No Location Selected" : (i18n.language === 'es' ? "Ninguna Ubicación Seleccionada" : "Nie Wybrano Lokalizacji")}</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                {i18n.language === 'en' ? "Please select a location above before filling out the issue details" : (i18n.language === 'es' ? "Por favor, seleccione una ubicación arriba antes de completar los detalles del problema" : "Wybierz lokalizację powyżej zanim wypełnisz szczegóły problemu")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}