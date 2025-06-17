import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { resizeImage, validateImage } from "@/lib/imageUtils";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud } from "lucide-react";
import LocationPicker from "@/components/map/LocationPicker";
import { IssueStatus, IssuePriority } from "@shared/schema";

// Form schema for issue reporting
const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long"),
  description: z.string().optional().default(""),
  location: z.string().min(3, "Location is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  status: z.enum([
    IssueStatus.PENDING, 
    IssueStatus.IN_PROGRESS, 
    IssueStatus.SCHEDULED, 
    IssueStatus.URGENT, 
    IssueStatus.COMPLETED
  ]),
  priority: z.enum([IssuePriority.LOW, IssuePriority.MEDIUM, IssuePriority.HIGH]),
  reportedById: z.number(),
  reportedByName: z.string(),
  estimatedCost: z.number().optional().default(0)
});

export type IssueFormValues = z.infer<typeof formSchema>;

interface IssueFormProps {
  defaultValues?: Partial<IssueFormValues>;
  onSubmit: (values: IssueFormValues) => void;
  isSubmitting?: boolean;
}

export default function IssueForm({ defaultValues, onSubmit, isSubmitting = false }: IssueFormProps) {
  const { toast } = useToast();
  const [images, setImages] = useState<File[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Form definition
  const form = useForm<IssueFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      status: IssueStatus.PENDING,
      priority: IssuePriority.MEDIUM,
      reportedById: 1, // Demo user ID
      reportedByName: "Demo User",
      estimatedCost: 0,
      ...defaultValues
    },
  });

  // Handle image uploads
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

  // Handle location selection
  const handleLocationSelected = (location: string, lat?: number, lng?: number) => {
    form.setValue("location", location);
    if (lat && lng) {
      form.setValue("latitude", lat);
      form.setValue("longitude", lng);
    }
  };

  const handleSubmit = (data: IssueFormValues) => {
    onSubmit({
      ...data,
      estimatedCost: typeof data.estimatedCost === 'string' 
        ? parseFloat(data.estimatedCost) || 0 
        : data.estimatedCost
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issue Title</FormLabel>
              <FormControl>
                <Input 
                  placeholder="E.g. Broken playground swing" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                A brief title describing the issue
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the issue in detail..." 
                  rows={4} 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Include as much detail as possible to help with repairs
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel className="block mb-2">Upload Photos</FormLabel>
          <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
            <div className="space-y-1 text-center">
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none">
                  <span>Upload photos</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={imageUploading}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              
              {imageUploading && (
                <div className="flex items-center justify-center mt-2">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-500">Processing images...</span>
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
              <FormLabel>Location</FormLabel>
              <div className="mt-1">
                <LocationPicker 
                  onLocationSelected={handleLocationSelected} 
                  initialValue={field.value} 
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="estimatedCost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Cost (if known)</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    step="0.01"
                    className="pl-7"
                    placeholder="0.00"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </FormControl>
              <FormDescription>
                Optional: Enter an estimated repair cost if you have an idea
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
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
                      <p>Low</p>
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
                      <p>Medium</p>
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
                      <p>High</p>
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
            onClick={() => history.back()}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || imageUploading}
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Submit Report
          </Button>
        </div>
      </form>
    </Form>
  );
}
