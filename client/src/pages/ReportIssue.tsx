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
import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import BuildingSelector, { BuildingDetails } from "@/components/location/BuildingSelector";
import { UploadCloud, Loader2, AlertTriangle, Wrench } from "lucide-react";

// Create a custom form schema instead of extending the insert schema
// This avoids type issues caused by schema changes
const formSchema = z.object({
  category: z.enum([IssueCategory.MACHINE, IssueCategory.GENERAL]).default(IssueCategory.GENERAL),
  title: z.string().min(5, "Title must be at least 5 characters long"),
  description: z.string().min(10, "Please provide a more detailed description"),
  location: z.string(),
  status: z.string().default(IssueStatus.PENDING),
  priority: z.enum([IssuePriority.LOW, IssuePriority.MEDIUM, IssuePriority.HIGH]),
  reporterId: z.number().default(1), // Match the schema field name
  reportedByName: z.string().default("Demo User"),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  // Pin coordinates have been removed
  technicianId: z.number().optional().nullable(),
  fixedByName: z.string().optional().nullable(),
  machineId: z.number().optional().nullable(),
  // Add these fields to match what we're sending to the server
  createdAt: z.string().optional(),
  submissionTime: z.string().optional(),
});

export default function ReportIssue() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  
  // Fetch machines for machine-specific issues
  const { data: machines = [], isLoading: machinesLoading } = useQuery({
    queryKey: ['/api/machines'],
    enabled: true,
  });

  // Current date for submission timestamp
  const currentDate = new Date();
  const formattedDate = format(currentDate, "yyyy-MM-dd'T'HH:mm:ss");
  const humanReadableDate = format(currentDate, "PPpp");
  
  // Create form with authenticated user data
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: IssueCategory.GENERAL,
      title: "",
      description: "",
      location: "",
      latitude: undefined,
      longitude: undefined,
      status: IssueStatus.PENDING,
      priority: IssuePriority.MEDIUM,
      reporterId: user?.id || 1, // Default to 1 if user not loaded yet
      reportedByName: user?.username || "Loading user...", // Default message while loading
      machineId: null,
      // Timestamp fields will be added when submitting the form
    },
  });
  
  // Update form values when user is loaded
  useEffect(() => {
    if (user && !authLoading) {
      // Set the reporter ID - this will be used by the server to identify the user
      form.setValue("reporterId", user.id);
      
      // In case session authentication fails, provide a formatted username
      // Use username along with position if available for better identification
      let displayName = user.username;
      
      // Add role information if available to help with categorization
      if (user.role) {
        displayName = `${displayName} (${user.role})`;
      } 
      // Otherwise use position if available
      else if (user.position) {
        displayName = `${displayName} (${user.position})`;
      }
      
      form.setValue("reportedByName", displayName);
      
      // Log the reporter information for debugging purposes
      console.log(`Issue will be reported by: ${displayName} (ID: ${user.id})`);
      console.log(`Submission timestamp: ${humanReadableDate}`);
    }
  }, [user, authLoading, form, formattedDate, humanReadableDate]);

  // Handle image uploads
  const [images, setImages] = useState<File[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  // Camera capture related state
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  // Location management state
  const [buildings, setBuildings] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  
  // Load custom locations from localStorage
  useEffect(() => {
    try {
      // Get custom locations from localStorage
      const savedLocations = localStorage.getItem('mcd-locations');
      if (savedLocations) {
        const parsedLocations = JSON.parse(savedLocations);
        setBuildings(parsedLocations);
      }
    } catch (error) {
      console.error('Error loading custom locations:', error);
      toast({
        title: "Error",
        description: "Failed to load location data. You may need to set up locations first.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Function to clear all pin data from localStorage
  const clearAllPinData = useCallback(() => {
    try {
      // Clear all pins from localStorage
      localStorage.removeItem('mcdonalds-pins-interior');
      localStorage.removeItem('mcdonalds-pins-exterior');
      
      // Clear any other pin-related data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('pins') || key.includes('marker') || key.includes('location'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Reset the state variables
      // Floor plan functionality has been removed
      
      // Show toast notification
      toast({
        title: "Pins cleared",
        description: "All pin data has been cleared. You can start fresh.",
      });
      
      console.log('Manually cleared all pin data from localStorage');
    } catch (e) {
      console.error('Error clearing pin data:', e);
      toast({
        title: "Error clearing pins",
        description: "There was an error clearing the pin data.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files);
    setImageUploading(true);
    
    try {
      // Validate and resize each image
      const processedFiles: File[] = [];
      const newPreviewUrls: string[] = [];
      
      for (const file of newFiles) {
        const validationResult = await validateImage(file);
        if (validationResult !== true) {
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
      
      // Add submission timestamp to data
      const submissionData = {
        ...data,
        createdAt: formattedDate, // Add the formatted timestamp in ISO format for database storage
        submissionTime: humanReadableDate // Add human-readable version for display purposes
      };
      
      console.log('Submitting issue with authenticated user information:', {
        reporter: submissionData.reportedByName,
        reporterId: submissionData.reporterId,
        createdAt: submissionData.createdAt,
        submissionTime: submissionData.submissionTime
      });
      
      // First create the issue
      const response = await apiRequest("POST", "/api/issues", submissionData);
      const issue = await response.json();
      console.log('Issue created response:', issue);
      
      // Then upload images if there are any
      if (images.length > 0) {
        console.log(`Uploading ${images.length} images for issue ${issue.id}`);
        
        const formData = new FormData();
        formData.append("issueId", issue.id.toString());
        
        images.forEach((file, index) => {
          console.log(`Uploading image ${index + 1}/${images.length}: ${file.name}`);
          formData.append("images", file);
        });
        
        // Upload the images and get the URLs
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        
        if (!uploadResponse.ok) {
          console.error(`Error uploading images: ${uploadResponse.status} ${uploadResponse.statusText}`);
          throw new Error(`Image upload failed: ${uploadResponse.statusText}`);
        }
        
        const uploadedImages = await uploadResponse.json();
        console.log('Uploaded images:', uploadedImages);
        
        // Now update the issue with the image URLs
        if (uploadedImages && uploadedImages.length > 0) {
          const imageUrls = uploadedImages.map((img: any) => img.url);
          console.log('Updating issue with image URLs:', imageUrls);
          
          await apiRequest("PATCH", `/api/issues/${issue.id}`, {
            imageUrls: imageUrls
          });
        }
      }
      
      return issue;
    },
    onSuccess: () => {
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

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Log the form data being submitted
    console.log('Form data before submission:', data);
    
    // Submit the form data directly without pin coordinates
    createIssueMutation.mutate(data);
  };

  // Handle location selection
  const handleLocationSelected = (location: string, details: BuildingDetails) => {
    form.setValue("location", location);
    
    // Store building, floor, and room details in the description
    const additionalInfo = `Building: ${details.buildingName || details.buildingId}${details.floorName ? `\nFloor: ${details.floorName}` : ''}${details.roomName ? `\nRoom: ${details.roomName}` : ''}${details.details ? `\nDetails: ${details.details}` : ''}`;
    
    const currentDescription = form.getValues("description");
    if (currentDescription && !currentDescription.includes("Building:")) {
      form.setValue("description", `${currentDescription}\n\n${additionalInfo}`);
    } else if (!currentDescription) {
      form.setValue("description", additionalInfo);
    }
    
    // Reset latitude/longitude since we're no longer using map coordinates
    form.setValue("latitude", undefined);
    form.setValue("longitude", undefined);
  };

  // Handle the pin placement from SimplePinMap - pin placement has been removed
  const handlePinMoved = (coordinates: { 
    xPercent: number; 
    yPercent: number;
    x: number; 
    y: number;
  }) => {
    console.log('Pin functionality has been removed');
    
    // Show toast notification
    toast({
      title: "Pin Point Functionality Removed",
      description: "The pin point location feature has been removed from the application.",
      variant: "destructive"
    });
  };
  
  // Legacy handler for old implementation - pin functionality removed
  const handlePreciseLocationSelected = (coordinates: string, description: string, capturedImageData?: string) => {
    console.log('Pin functionality has been removed');
    
    // Just update regular location description
    const currentLocation = form.getValues("location");
    const locationDescription = `${currentLocation} (${description})`;
    form.setValue("location", locationDescription);
    
    // Add to description
    const currentDescription = form.getValues("description");
    if (currentDescription) {
      form.setValue("description", `${currentDescription}\n${description}`);
    } else {
      form.setValue("description", description);
    }
    
    // Save the captured image if available
    if (capturedImageData) {
      // Convert data URL to File object
      try {
        const dataURLtoFile = (dataurl: string, filename: string): File => {
          const arr = dataurl.split(',');
          const mime = arr[0].match(/:(.*?);/)![1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          
          return new File([u8arr], filename, { type: mime });
        };
        
        // Create a file with a timestamp name
        const locationImageFile = dataURLtoFile(
          capturedImageData, 
          `location-image-${Date.now()}.png`
        );
        
        // Add the location image to the images array
        setImages(prev => [locationImageFile, ...prev]);
        setPreviewUrls(prev => [capturedImageData, ...prev]);
      } catch (error) {
        console.error('Error converting image:', error);
      }
    }
    
    // Show toast notification
    toast({
      title: "Location Added",
      description: "Location information has been added to the report",
    });
  };
  
  // Camera functionality
  const startCamera = useCallback(async () => {
    // First show the camera modal to improve user experience
    setShowCamera(true);
    
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in your browser or environment");
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setCameraStream(stream);
    } catch (error) {
      console.error("Error accessing camera:", error);
      
      // Get more specific error message
      let errorMessage = "Could not access your camera. ";
      
      if (error instanceof Error) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          errorMessage += "Camera permission was denied. Please allow camera access.";
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          errorMessage += "No camera detected on your device.";
        } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
          errorMessage += "Your camera is already in use by another application.";
        } else if (error.name === "OverconstrainedError") {
          errorMessage += "Camera constraints cannot be satisfied.";
        } else if (error.name === "TypeError" || error.message.includes("SSL")) {
          errorMessage += "Camera access requires a secure connection (HTTPS). This may not work in preview environments.";
        } else {
          errorMessage += error.message || "Unknown camera error.";
        }
      } else {
        errorMessage += "Unexpected error occurred.";
      }
      
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);
  
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  }, [cameraStream]);
  
  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame to the canvas
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to file
    try {
      const blob = await new Promise<Blob>((resolve) => 
        canvas.toBlob(blob => resolve(blob as Blob), 'image/jpeg', 0.8)
      );
      
      // Create a File object
      const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Process the file (resize, validate)
      setImageUploading(true);
      
      try {
        const validationResult = await validateImage(file);
        if (validationResult !== true) {
          throw new Error(validationResult);
        }
        
        const resizedFile = await resizeImage(file);
        
        // Create a preview URL
        const previewUrl = URL.createObjectURL(resizedFile);
        
        // Update state with the new image and preview
        setImages(prev => [...prev, resizedFile]);
        setPreviewUrls(prev => [...prev, previewUrl]);
        
        // Close the camera view
        stopCamera();
        
        toast({
          title: "Image Captured",
          description: "Your photo has been added to the report.",
          variant: "default",
        });
      } catch (error) {
        console.error("Error processing captured image:", error);
        toast({
          title: "Error",
          description: typeof error === 'object' && error !== null && 'message' in error 
            ? String(error.message) 
            : "Failed to process captured image.",
          variant: "destructive",
        });
      } finally {
        setImageUploading(false);
      }
    } catch (error) {
      console.error("Error creating blob from canvas:", error);
      toast({
        title: "Error",
        description: "Failed to capture image from camera.",
        variant: "destructive",
      });
    }
  }, [stopCamera, toast]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t('issues.createNew')}</h2>
        <p className="mt-1 text-gray-600">{t('issues.submitDetails', 'Submit details about an issue that needs attention')}</p>
      </div>
      
      {/* Camera modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-xl w-full">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium">Take a photo</h3>
              <button 
                type="button" 
                className="text-gray-500 hover:text-gray-700" 
                onClick={stopCamera}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            {cameraStream ? (
              <>
                <div className="relative aspect-video">
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex justify-center">
                  <button 
                    type="button" 
                    className="inline-flex items-center justify-center rounded-md bg-primary text-white py-2 px-4 text-sm font-medium shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    onClick={captureImage}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"></circle></svg>
                    Capture
                  </button>
                </div>
              </>
            ) : (
              <div className="p-6 text-center">
                <div className="mb-4 text-gray-600">
                  <p className="mb-4">Unable to access camera or camera not available.</p>
                  <p className="text-sm mb-4">This could be due to browser security restrictions, permissions, or running in a sandboxed environment like Replit's editor.</p>
                </div>
                
                <div className="py-4 border-t border-b border-gray-200 mb-4">
                  <p className="text-sm font-medium mb-3">You can upload an image instead:</p>
                  <label className="inline-flex items-center justify-center rounded-md bg-primary text-white py-2 px-4 text-sm font-medium shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Upload Photo
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
                
                <button 
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  Close
                </button>
              </div>
            )}
          </div>
          {/* Hidden canvas element for image processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('issues.details')}</CardTitle>
          <CardDescription>
            {t('issues.fillOutForm', 'Fill out the form below to report a problem in your company.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Issue Category Selection */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Category</FormLabel>
                    <FormControl>
                      <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value={IssueCategory.GENERAL} className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            General Issue
                          </TabsTrigger>
                          <TabsTrigger value={IssueCategory.MACHINE} className="flex items-center gap-2">
                            <Wrench className="h-4 w-4" />
                            Machine Issue
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value={IssueCategory.GENERAL} className="space-y-4">
                          <div className="p-4 bg-amber-50 rounded-lg">
                            <h3 className="font-medium text-amber-900 mb-2">
                              General Facility Issue
                            </h3>
                            <p className="text-sm text-amber-700">
                              For issues like broken lights, facility problems, or other non-equipment related issues that will be stored in "Others" category.
                            </p>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value={IssueCategory.MACHINE} className="space-y-4">
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <h3 className="font-medium text-blue-900 mb-2">
                              Machine-Related Issue
                            </h3>
                            <p className="text-sm text-blue-700">
                              Report issues with specific machines from inventory. This will be saved to the machine's history for maintenance tracking.
                            </p>
                          </div>
                          
                          {/* Machine Selection */}
                          <FormField
                            control={form.control}
                            name="machineId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Select Machine</FormLabel>
                                <Select 
                                  value={field.value?.toString()} 
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose a machine from inventory" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {machinesLoading ? (
                                      <SelectItem value="loading" disabled>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Loading machines...
                                      </SelectItem>
                                    ) : (
                                      Array.isArray(machines) && machines.map((machine: any) => (
                                        <SelectItem key={machine.id} value={machine.id.toString()}>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline">{machine.serialNumber}</Badge>
                                            {machine.name} - {machine.location}
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

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('issues.issueTitle')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('issues.titlePlaceholder', 'E.g. Broken equipment')} 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      {t('issues.briefTitle')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('issues.description')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('form.descriptionPlaceholder', 'Describe the issue in detail...')} 
                        rows={4} 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      {t('issues.detailedDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel className="block mb-2">{t('issues.uploadPhotos')}</FormLabel>
                <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
                  <div className="space-y-1 text-center">
                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none">
                        <span>{t('form.addImages')}</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          multiple
                          accept="image/*"
                          onChange={handleImageChange}
                          disabled={imageUploading || showCamera}
                        />
                      </label>
                      <p className="pl-1">{t('or', 'or')} {t('form.dragDrop', 'drag and drop')}</p>
                      <p className="mx-1">{t('or', 'or')}</p>
                      <button
                        type="button"
                        className="font-medium text-primary hover:text-primary-dark focus:outline-none"
                        onClick={startCamera}
                        disabled={imageUploading || showCamera}
                      >
                        {t('issues.takePhoto')}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">{t('form.imageFormats', 'PNG, JPG, GIF up to 10MB')}</p>
                    
                    {imageUploading && (
                      <div className="flex items-center justify-center mt-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm text-gray-500">{t('form.processingImages')}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {previewUrls.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className="relative group rounded-md overflow-hidden">
                        <img
                          src={url}
                          alt={`Preview ${idx + 1}`}
                          className="h-24 w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="text-white p-1 rounded-full hover:bg-white hover:bg-opacity-20"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('locations.title')}</FormLabel>
                    <div className="mt-1">
                      <BuildingSelector onLocationSelected={handleLocationSelected} initialValue={field.value} />
                    </div>
                    
                    <FormMessage />
                  </FormItem>
                )}
              />



              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.priority')}</FormLabel>
                    <FormControl>
                      <RadioGroup 
                        className="grid grid-cols-3 gap-3 mt-1"
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <div>
                          <RadioGroupItem value={IssuePriority.LOW} id="priority-low" className="sr-only" />
                          <FormLabel
                            htmlFor="priority-low"
                            className={`block w-full rounded-md border ${
                              field.value === IssuePriority.LOW
                                ? 'border-primary bg-blue-50'
                                : 'border-gray-300 hover:border-primary'
                            } p-2 text-center text-sm font-medium cursor-pointer`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-green-500 mb-1"><path d="M18 15l-6-6-6 6"></path></svg>
                            <p>{t('priorities.low')}</p>
                          </FormLabel>
                        </div>
                        <div>
                          <RadioGroupItem value={IssuePriority.MEDIUM} id="priority-medium" className="sr-only" />
                          <FormLabel
                            htmlFor="priority-medium"
                            className={`block w-full rounded-md border ${
                              field.value === IssuePriority.MEDIUM
                                ? 'border-primary bg-blue-50'
                                : 'border-gray-300 hover:border-primary'
                            } p-2 text-center text-sm font-medium cursor-pointer`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-yellow-500 mb-1"><path d="M5 12h14"></path></svg>
                            <p>{t('priorities.medium')}</p>
                          </FormLabel>
                        </div>
                        <div>
                          <RadioGroupItem value={IssuePriority.HIGH} id="priority-high" className="sr-only" />
                          <FormLabel
                            htmlFor="priority-high"
                            className={`block w-full rounded-md border ${
                              field.value === IssuePriority.HIGH
                                ? 'border-primary bg-blue-50'
                                : 'border-gray-300 hover:border-primary'
                            } p-2 text-center text-sm font-medium cursor-pointer`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-red-500 mb-1"><path d="M6 9l6 6 6-6"></path></svg>
                            <p>{t('priorities.high')}</p>
                          </FormLabel>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/")}
                >
                  {t('form.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createIssueMutation.isPending || imageUploading}
                >
                  {createIssueMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t('issues.submitReport')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
