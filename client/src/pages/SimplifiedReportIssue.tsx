import React, { useState, useEffect } from 'react';
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { IssueStatus, IssuePriority } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, Wrench, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

// Define the form schema
const formSchema = z.object({
  location: z.string().min(3, "Location must be at least 3 characters"),
  machineId: z.string().optional(),
  machineName: z.string().optional(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional().default(""),
  issueType: z.enum([
    "damage", 
    "hazard", 
    "maintenance", 
    "cleaning", 
    "other"
  ]),
  priority: z.enum([
    IssuePriority.LOW,
    IssuePriority.MEDIUM,
    IssuePriority.HIGH
  ]),
  status: z.string().default(IssueStatus.PENDING),
  reporterId: z.number().default(1),
  reportedByName: z.string().default("Demo User"),
});

// Interface for machine
interface Machine {
  id: string;
  name: string;
  serialNumber: string;
  location: string;
  categoryId: number | string;
  manufacturer?: string;
  model?: string;
  imageUrl?: string;
}

export default function SimplifiedReportIssue() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // State for machine selection
  const [showMachineSelector, setShowMachineSelector] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  
  // State for image uploads
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  
  // Get location from localStorage
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>("");

  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: "",  // Will be set by the useEffect
      machineId: "",
      machineName: "",
      title: "",
      description: "",
      issueType: "other",
      priority: IssuePriority.MEDIUM,
      status: IssueStatus.PENDING,
      reporterId: 1,
      reportedByName: "Demo User"
    }
  });
  
  // Get form values and helpers
  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;
  
  // Initialize location
  useEffect(() => {
    // Get location from localStorage
    const locationFromStorage = localStorage.getItem('selectedLocation');
    
    if (!locationFromStorage) {
      // No location selected, redirect to location selection
      navigate('/location-select');
      return;
    }
    
    // Save location ID to state
    setLocationId(locationFromStorage);
    
    // Determine the exact location name for the form
    let exactLocationName = "";
    
    if (locationFromStorage.startsWith('custom-')) {
      // Get custom locations from localStorage
      const savedLocations = localStorage.getItem('customLocations');
      const customLocs = savedLocations ? JSON.parse(savedLocations) : [];
      
      // Find the custom location by ID
      const customLocation = customLocs.find((loc: any) => loc.id === locationFromStorage);
      if (customLocation) {
        exactLocationName = customLocation.name;
      }
    } else {
      // This is a default location - use hardcoded names based on the ID
      const locationNames: {[key: string]: string} = {
        '1': 'Jakubowski McDonald\'s',
        '2': 'Centrum McDonald\'s',
        '3': 'Galeria Baltycka McDonald\'s'
      };
      exactLocationName = locationNames[locationFromStorage] || `Location ${locationFromStorage}`;
    }
    
    // Save location name to state and form
    setLocationName(exactLocationName);
    
    // Update form with exact location name
    setValue('location', exactLocationName);
  }, [navigate, setValue]);
  
  // Function to normalize text for comparison
  const normalizeText = (text: string): string => {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove non-alphanumeric characters
      .replace(/\s+/g, ' ')    // Replace multiple spaces with a single space
      .trim();                  // Remove leading/trailing whitespace
  };

  // Fetch machines from localStorage and filter by current location
  const getMachinesFromStorage = (): Machine[] => {
    try {
      const storedMachines = localStorage.getItem('machines');
      const allMachines = storedMachines ? JSON.parse(storedMachines) : [];
      
      // If no location is selected, return all machines
      if (!locationName) return allMachines;
      
      // Filter machines to only show those from the current location
      return allMachines.filter((machine: Machine) => {
        if (!machine.location) return false;
        
        const normalizedMachineLocation = normalizeText(machine.location);
        const normalizedCurrentLocation = normalizeText(locationName);
        
        // Match machines where the location contains the current location name
        // or the current location name contains parts of the machine location
        return normalizedMachineLocation.includes(normalizedCurrentLocation) || 
               normalizedCurrentLocation.includes(normalizedMachineLocation);
      });
    } catch (error) {
      console.error('Error fetching/filtering machines from localStorage:', error);
      return [];
    }
  };
  
  // Filter machines based on search query
  const filteredMachines = searchQuery 
    ? machines.filter((machine) => 
        machine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        machine.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (machine.model && machine.model.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : machines;
  
  // Handle machine selection
  const handleSelectMachine = (machine: Machine) => {
    setSelectedMachine(machine);
    setValue('machineId', machine.id);
    setValue('machineName', machine.name);
    setShowMachineSelector(false);
    
    // Update the title if it's empty or default
    const currentTitle = watch('title');
    if (!currentTitle || currentTitle === '') {
      setValue('title', `Issue with ${machine.name}`);
    }
    
    toast({
      title: "Machine Selected",
      description: `Selected ${machine.name} for this issue.`,
    });
  };
  
  // Load machines when dialog opens
  useEffect(() => {
    if (showMachineSelector) {
      setMachines(getMachinesFromStorage());
    }
  }, [showMachineSelector]);
  
  // Handle image uploads
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files);
    setImageUploading(true);
    
    try {
      const newPreviewUrls: string[] = [];
      
      newFiles.forEach(file => {
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        newPreviewUrls.push(previewUrl);
      });
      
      // Update state with new images and previews
      setImages(prev => [...prev, ...newFiles]);
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
  
  // Remove image from preview
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    
    // Release the object URL to avoid memory leaks
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };
  
  // We'll separate the issue creation and image upload into different mutations
  const createIssueMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("POST", "/api/issues", {
        ...data
      });
      return response.json();
    },
    onSuccess: (issue) => {
      console.log('Issue created successfully:', issue);
      
      // If we have images, upload them now
      if (images.length > 0) {
        uploadImagesMutation.mutate(issue.id);
      } else {
        // No images to upload, we're done
        handleSubmissionComplete();
      }
    },
    onError: (error) => {
      console.error("Error creating issue:", error);
      toast({
        title: "Error",
        description: "Failed to create issue. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Separate mutation for image uploads
  const uploadImagesMutation = useMutation({
    mutationFn: async (issueId: number) => {
      console.log(`Uploading ${images.length} images for issue ${issueId}`);
      
      const formData = new FormData();
      formData.append("issueId", issueId.toString());
      
      images.forEach((file, index) => {
        console.log(`Uploading image ${index + 1}/${images.length}: ${file.name}`);
        formData.append("images", file);
      });
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Image upload failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Images uploaded successfully:', data);
      handleSubmissionComplete();
    },
    onError: (error) => {
      console.error("Error uploading images:", error);
      // Don't show an error toast here since the issue was created successfully
      // Just log the error and proceed with completion
      console.warn('Issue created but image upload failed');
      handleSubmissionComplete();
    },
  });
  
  // Function to handle completion (used by both mutations)
  const handleSubmissionComplete = () => {
    // Clean up preview URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    
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
    navigate("/");
  };
  
  // Form submission handler
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log('Form data before submission:', data);
    createIssueMutation.mutate(data);
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('issues.createNew', 'Report New Issue')}</h1>
        <p className="text-muted-foreground">{t('issues.submitDetails', 'Submit details about an issue that needs attention')}</p>
      </div>
      
      <div className="bg-white rounded-md shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-2">{t('issues.issueDetails', 'Issue Details')}</h2>
        <p className="text-muted-foreground mb-6">{t('issues.fillOutForm', 'Fill out the form below to report a problem in your company')}</p>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 1. Location Field */}
          <div className="space-y-2">
            <Label htmlFor="location" className="font-medium">Location</Label>
            <Input
              id="location"
              value={locationName}
              readOnly
              className="w-full bg-gray-50"
              title="Location is set based on your selected location"
            />
            <input type="hidden" {...register('location')} />
            {errors.location && (
              <p className="text-sm text-red-500">{errors.location.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              This is your selected location. To change it, go back to location selection.
            </p>
          </div>
          
          {/* 2. Machine Selection */}
          <div className="space-y-2">
            <Label htmlFor="machineName" className="font-medium">Machine Selection</Label>
            <div className="flex gap-2">
              <Input
                id="machineName"
                placeholder="Select a machine from inventory"
                value={selectedMachine?.name || ""}
                readOnly
                className="flex-1"
                {...register('machineName')}
              />
              <Button
                type="button"
                variant={selectedMachine ? "outline" : "default"}
                onClick={() => setShowMachineSelector(true)}
                className="flex items-center gap-1"
              >
                <Wrench className="h-4 w-4" />
                {selectedMachine ? "Change" : "Select"}
              </Button>
            </div>
            {selectedMachine ? (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="font-medium text-sm">{selectedMachine.name}</p>
                <p className="text-xs text-muted-foreground">S/N: {selectedMachine.serialNumber}</p>
                <p className="text-xs text-muted-foreground">Location: {selectedMachine.location}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Select a machine from your inventory
              </p>
            )}
          </div>
          
          {/* 3. Issue Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="font-medium">Issue Title</Label>
            <Input 
              id="title" 
              placeholder="E.g. Broken equipment" 
              className="w-full"
              {...register('title')} 
            />
            <p className="text-xs text-muted-foreground">A brief title describing the issue</p>
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>
          
          {/* 4. Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="font-medium">Description</Label>
            <Textarea 
              id="description" 
              placeholder="Describe the issue in detail..." 
              className="min-h-[120px] w-full"
              {...register('description')} 
            />
            <p className="text-xs text-muted-foreground">Include as much detail as possible to help with repairs</p>
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>
          
          {/* Photo Upload Section */}
          <div className="space-y-2">
            <Label className="font-medium">Upload Photos</Label>
            <div className="border-2 border-dashed rounded-md flex flex-col items-center justify-center py-6 px-4">
              <div className="flex flex-col items-center text-center">
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                
                <div className="flex gap-2 items-center mt-2">
                  <Button 
                    type="button" 
                    variant="link" 
                    size="sm"
                    className="text-primary"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                  >
                    Add Images
                  </Button>
                  <span className="text-muted-foreground">or drag and drop</span>
                  <Button 
                    type="button" 
                    variant="link" 
                    size="sm"
                    className="text-primary"
                  >
                    Take a photo
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">PNG, JPG, GIF up to 10MB</p>
                
                {/* Hidden file input */}
                <input 
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={imageUploading}
                />
              </div>
            </div>
            
            {/* Image previews */}
            {previewUrls.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group rounded-md overflow-hidden h-24">
                    <img 
                      src={url} 
                      alt={`Preview ${index}`} 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 5. Additional Details (Issue Type) */}
          <div className="space-y-2">
            <Label htmlFor="issueType" className="font-medium">Issue Type</Label>
            <Select 
              defaultValue="other" 
              onValueChange={(value) => setValue('issueType', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="damage">Damage</SelectItem>
                <SelectItem value="hazard">Hazard</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.issueType && (
              <p className="text-sm text-red-500">{errors.issueType.message}</p>
            )}
          </div>
          
          {/* 6. Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority" className="font-medium">Priority</Label>
            <Select 
              defaultValue={IssuePriority.MEDIUM} 
              onValueChange={(value) => setValue('priority', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={IssuePriority.LOW}>Low</SelectItem>
                <SelectItem value={IssuePriority.MEDIUM}>Medium</SelectItem>
                <SelectItem value={IssuePriority.HIGH}>High</SelectItem>
              </SelectContent>
            </Select>
            {errors.priority && (
              <p className="text-sm text-red-500">{errors.priority.message}</p>
            )}
          </div>
          
          {/* 7. Submit Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              type="submit" 
              className="px-8" 
              disabled={createIssueMutation.isPending || uploadImagesMutation.isPending}
            >
              {createIssueMutation.isPending || uploadImagesMutation.isPending 
                ? t('common.submitting', "Submitting...") 
                : t('issues.submitReport', "Submit Report")}
            </Button>
          </div>
        </form>
      </div>
      
      {/* Machine Selector Dialog */}
      <Dialog open={showMachineSelector} onOpenChange={setShowMachineSelector}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Machine</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a machine from your inventory for this issue report
            </p>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search machines..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {filteredMachines.length > 0 ? (
                <div className="space-y-2">
                  {filteredMachines.map((machine) => (
                    <div
                      key={machine.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
                      onClick={() => handleSelectMachine(machine)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{machine.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {machine.serialNumber} | {machine.location}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm">Select</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-muted-foreground">No machines found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try a different search term or add machines in the inventory
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}