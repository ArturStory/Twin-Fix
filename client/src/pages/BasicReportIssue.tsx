import React, { useState, useEffect } from 'react';
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { IssueStatus, IssuePriority } from "@shared/schema";
import { Wrench, Search, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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

export default function BasicReportIssue() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  
  // State for form fields
  const [location, setLocation] = useState("McDonald's, Jana Bazynskiego 2");
  const [machineId, setMachineId] = useState("");
  const [machineName, setMachineName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState("other");
  const [priority, setPriority] = useState(IssuePriority.MEDIUM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for machine selection
  const [showMachineSelector, setShowMachineSelector] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  
  // State for image uploads
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  
  // Fetch machines from localStorage
  const getMachinesFromStorage = (): Machine[] => {
    try {
      const storedMachines = localStorage.getItem('machines');
      return storedMachines ? JSON.parse(storedMachines) : [];
    } catch (error) {
      console.error('Error fetching machines from localStorage:', error);
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
    setMachineId(machine.id);
    setMachineName(machine.name);
    setShowMachineSelector(false);
    
    // Update the title if it's empty or default
    if (!title || title === '') {
      setTitle(t('issues.issueWithMachine', { name: machine.name }));
    }
    
    toast({
      title: t('issues.machineSelected'),
      description: t('issues.selectedMachineForIssue', { name: machine.name }),
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
  
  // Handle form submission - simple approach with direct fetch
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // Build the issue data with the user's input
      const issueData = {
        location,
        machineId,
        machineName,
        title,
        description,
        issueType,
        priority,
        status: IssueStatus.PENDING,
        reporterId: 1,
        reportedByName: "Demo User"
      };
      
      console.log('Submitting issue with data:', issueData);
      
      // Submit the issue - this will trigger a notification to all connected users
      // thanks to our WebSocket notification system
      const issueResponse = await fetch('/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueData),
      });
      
      if (!issueResponse.ok) {
        throw new Error(`Failed to create issue: ${issueResponse.statusText}`);
      }
      
      const issue = await issueResponse.json();
      console.log('Issue created:', issue);
      
      // Then upload images if there are any
      if (images.length > 0) {
        console.log(`Uploading ${images.length} images for issue ${issue.id}`);
        
        const formData = new FormData();
        formData.append("issueId", issue.id.toString());
        
        images.forEach(file => {
          formData.append("images", file);
        });
        
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          console.warn(`Image upload completed with status: ${uploadResponse.status}`);
        } else {
          console.log('Images uploaded successfully');
        }
      }
      
      // Show success message and navigate to dashboard
      toast({
        title: "Issue reported",
        description: "Your issue has been reported successfully",
      });
      
      // Clean up preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      
      navigate("/");
    } catch (error) {
      console.error('Error submitting issue:', error);
      toast({
        title: "Error",
        description: "Failed to submit issue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('issues.createNew')}</h1>
        <p className="text-muted-foreground">{t('issues.submitDetails')}</p>
      </div>
      
      <div className="bg-white rounded-md shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-2">{t('issues.issueDetails')}</h2>
        <p className="text-muted-foreground mb-6">{t('issues.fillOutForm')}</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Location Field */}
          <div className="space-y-2">
            <Label htmlFor="location" className="font-medium">{t('common.location')}</Label>
            <Input 
              id="location" 
              placeholder={t('locations.locationPlaceholder')}
              className="w-full"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
          
          {/* 2. Machine Selection */}
          <div className="space-y-2">
            <Label htmlFor="machineName" className="font-medium">{t('inventory.machineSelection')}</Label>
            <div className="flex gap-2">
              <Input
                id="machineName"
                placeholder={t('inventory.selectMachinePlaceholder')}
                value={selectedMachine?.name || ""}
                readOnly
                className="flex-1"
              />
              <Button
                type="button"
                variant={selectedMachine ? "outline" : "default"}
                onClick={() => setShowMachineSelector(true)}
                className="flex items-center gap-1"
              >
                <Wrench className="h-4 w-4" />
                {selectedMachine ? t('common.change') : t('common.select')}
              </Button>
            </div>
            {selectedMachine ? (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="font-medium text-sm">{selectedMachine.name}</p>
                <p className="text-xs text-muted-foreground">{t('inventory.serialNumber')}: {selectedMachine.serialNumber}</p>
                <p className="text-xs text-muted-foreground">{t('common.location')}: {selectedMachine.location}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                {t('inventory.selectMachineFromInventory')}
              </p>
            )}
          </div>
          
          {/* 3. Issue Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="font-medium">{t('issues.issueTitle')}</Label>
            <Input 
              id="title" 
              placeholder={t('issues.issueTitlePlaceholder')} 
              className="w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">{t('issues.issueTitleHelp')}</p>
          </div>
          
          {/* 4. Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="font-medium">{t('issues.description')}</Label>
            <Textarea 
              id="description" 
              placeholder={t('issues.descriptionPlaceholder')} 
              className="min-h-[120px] w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">{t('issues.descriptionHelp')}</p>
          </div>
          
          {/* Photo Upload Section */}
          <div className="space-y-2">
            <Label className="font-medium">{t('issues.uploadPhotos')}</Label>
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
                    {t('issues.addImages')}
                  </Button>
                  <span className="text-muted-foreground">{t('common.or')}</span>
                  <Button 
                    type="button" 
                    variant="link" 
                    size="sm"
                    className="text-primary"
                  >
                    {t('issues.takePhoto')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{t('issues.photoUploadHelp')}</p>
                
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
            <Label htmlFor="issueType" className="font-medium">{t('issues.issueType')}</Label>
            <Select 
              defaultValue="other" 
              onValueChange={(value) => setIssueType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('issues.selectIssueType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="damage">{t('issues.types.damage')}</SelectItem>
                <SelectItem value="hazard">{t('issues.types.hazard')}</SelectItem>
                <SelectItem value="maintenance">{t('issues.types.maintenance')}</SelectItem>
                <SelectItem value="cleaning">{t('issues.types.cleaning')}</SelectItem>
                <SelectItem value="other">{t('issues.types.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 6. Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority" className="font-medium">{t('issues.priority')}</Label>
            <Select 
              defaultValue={IssuePriority.MEDIUM} 
              onValueChange={(value) => setPriority(value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('issues.selectPriority')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={IssuePriority.LOW}>{t('issues.priorities.low')}</SelectItem>
                <SelectItem value={IssuePriority.MEDIUM}>{t('issues.priorities.medium')}</SelectItem>
                <SelectItem value={IssuePriority.HIGH}>{t('issues.priorities.high')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 7. Submit Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              type="submit" 
              className="px-8" 
              disabled={isSubmitting}
            >
              {isSubmitting ? t('common.submitting') : t('issues.submitReport')}
            </Button>
          </div>
        </form>
      </div>
      
      {/* Machine Selector Dialog */}
      <Dialog open={showMachineSelector} onOpenChange={setShowMachineSelector}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('inventory.selectMachine')}</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t('inventory.chooseMachineHelp')}
            </p>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('inventory.searchMachinePlaceholder')}
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
                      <Button variant="ghost" size="sm">{t('common.select')}</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-muted-foreground">{t('inventory.noMachinesFound')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('inventory.tryDifferentSearchOrAdd')}
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