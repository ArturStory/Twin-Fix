import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { IssuePriority } from '@shared/schema';
import { Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Define custom issue types
const MachineIssueType = {
  DAMAGE: 'damage',
  HAZARD: 'hazard',
  MAINTENANCE: 'maintenance',
  CLEANING: 'cleaning',
  OTHER: 'other',
} as const;

// Define the form validation schema
const issueFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  location: z.string().min(3, 'Location must be at least 3 characters'),
  issueType: z.enum([
    MachineIssueType.DAMAGE,
    MachineIssueType.HAZARD,
    MachineIssueType.MAINTENANCE, 
    MachineIssueType.CLEANING,
    MachineIssueType.OTHER
  ]),
  priority: z.enum([
    IssuePriority.LOW,
    IssuePriority.MEDIUM,
    IssuePriority.HIGH
  ]),
});

// Infer the type from our schema
type IssueFormValues = z.infer<typeof issueFormSchema>;

// Props interface for the component
interface IssueReportFormProps {
  // Optional callback when form is successfully submitted
  onSuccess?: (data: any) => void;
  // Optional initial values
  defaultValues?: Partial<IssueFormValues>;
}

export function IssueReportForm({ onSuccess, defaultValues }: IssueReportFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Simplify the form with smart defaults for better user experience
  const initialValues = {
    title: '',
    description: '',
    location: 'McDonald\'s, Jana Bazynskiego 2',
    issueType: MachineIssueType.OTHER,
    priority: IssuePriority.MEDIUM,
    ...defaultValues
  };
  
  // Initialize form
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: initialValues
  });
  
  // Form submission handler
  const onSubmit = async (data: IssueFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Add a timestamp for creation
      const submissionData = {
        ...data,
        // Default status is "pending" (handled by the server)
        reportedByName: "Anonymous User", // Replace with actual user info when authentication is implemented
      };
      
      // Send the issue data to the server
      const response = await apiRequest(
        'POST',
        '/api/issues',
        submissionData
      );
      
      // Show success message
      toast({
        title: "Issue Reported",
        description: "Your issue has been successfully reported.",
      });
      
      // Invalidate queries to refresh issue lists
      queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
      
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error) {
      console.error("Error submitting issue:", error);
      toast({
        title: "Error",
        description: "Failed to submit the issue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Report New Issue</h1>
        <p className="text-muted-foreground">Submit details about an issue that needs attention</p>
      </div>
      
      <div className="bg-white rounded-md shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-2">Issue Details</h2>
        <p className="text-muted-foreground mb-6">Fill out the form below to report a problem in your company</p>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Issue Title */}
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
          
          {/* Description */}
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
          
          {/* Upload Photos */}
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
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              className="px-8" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}