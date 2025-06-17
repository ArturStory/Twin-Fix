import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { insertIssueSchema, IssueStatus, IssuePriority, IssueCategory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wrench, AlertTriangle, Camera, Upload, X } from "lucide-react";

// Enhanced form schema supporting both machine and general issues
const enhancedFormSchema = z.object({
  category: z.enum([IssueCategory.MACHINE, IssueCategory.GENERAL]),
  machineId: z.number().optional().nullable(),
  title: z.string().min(5, "Title must be at least 5 characters long"),
  description: z.string().min(10, "Please provide a more detailed description"),
  location: z.string().min(1, "Location is required"),
  priority: z.enum([IssuePriority.LOW, IssuePriority.MEDIUM, IssuePriority.HIGH]),
  issueType: z.string().optional(),
  reporterId: z.number(),
  reportedByName: z.string(),
  createdAt: z.string().optional(),
});

type FormData = z.infer<typeof enhancedFormSchema>;

export default function EnhancedReportIssue() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch machines for machine-specific issues
  const { data: machines = [], isLoading: machinesLoading } = useQuery({
    queryKey: ['/api/machines'],
    enabled: true,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(enhancedFormSchema),
    defaultValues: {
      category: IssueCategory.GENERAL,
      machineId: null,
      title: "",
      description: "",
      location: "",
      priority: IssuePriority.MEDIUM,
      issueType: "",
      reporterId: user?.id || 0,
      reportedByName: user?.username || "",
      createdAt: new Date().toISOString(),
    },
  });

  const watchCategory = form.watch("category");

  const createIssueMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const issueData = {
        ...data,
        status: IssueStatus.PENDING,
        // Only include machineId if it's a machine issue
        machineId: data.category === IssueCategory.MACHINE ? data.machineId : null,
      };

      return await apiRequest('/api/issues', {
        method: 'POST',
        body: JSON.stringify(issueData),
      });
    },
    onSuccess: (newIssue: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
      
      toast({
        title: t('issues.created'),
        description: `${t('issues.issueCreated')}: ${newIssue.title}`,
      });

      // Navigate to appropriate page based on category
      if (newIssue.category === IssueCategory.MACHINE && newIssue.machineId) {
        navigate(`/machines/${newIssue.machineId}`);
      } else {
        navigate('/');
      }
    },
    onError: (error) => {
      console.error('Error creating issue:', error);
      toast({
        variant: "destructive",
        title: t('issues.error'),
        description: t('issues.createError'),
      });
    },
  });

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setImageFiles(prev => [...prev, ...files]);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      setImageUploading(true);
      await createIssueMutation.mutateAsync(data);
    } finally {
      setImageUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-primary" />
              {t('issues.reportIssue')}
            </CardTitle>
            <CardDescription>
              {t('issues.selectIssueType')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Issue Category Selection */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('issues.issueCategory')}</FormLabel>
                      <FormControl>
                        <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value={IssueCategory.MACHINE} className="flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              {t('issues.machineIssue')}
                            </TabsTrigger>
                            <TabsTrigger value={IssueCategory.GENERAL} className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              {t('issues.generalIssue')}
                            </TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value={IssueCategory.MACHINE} className="space-y-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                              <h3 className="font-medium text-blue-900 mb-2">
                                {t('issues.machineIssueDescription')}
                              </h3>
                              <p className="text-sm text-blue-700">
                                {t('issues.machineIssueHint')}
                              </p>
                            </div>
                            
                            {/* Machine Selection */}
                            <FormField
                              control={form.control}
                              name="machineId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('machines.selectMachine')}</FormLabel>
                                  <Select 
                                    value={field.value?.toString()} 
                                    onValueChange={(value) => field.onChange(parseInt(value))}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={t('machines.selectMachinePlaceholder')} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {machinesLoading ? (
                                        <SelectItem value="loading" disabled>
                                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                          Loading machines...
                                        </SelectItem>
                                      ) : (
                                        machines.map((machine: any) => (
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
                          
                          <TabsContent value={IssueCategory.GENERAL} className="space-y-4">
                            <div className="p-4 bg-amber-50 rounded-lg">
                              <h3 className="font-medium text-amber-900 mb-2">
                                {t('issues.generalIssueDescription')}
                              </h3>
                              <p className="text-sm text-amber-700">
                                {t('issues.generalIssueHint')}
                              </p>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Issue Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('issues.issueTitle')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={
                            watchCategory === IssueCategory.MACHINE 
                              ? t('issues.machineTitlePlaceholder')
                              : t('issues.generalTitlePlaceholder')
                          } 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Issue Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('issues.issueDescription')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t('issues.descriptionPlaceholder')}
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Location */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('issues.issueLocation')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={
                            watchCategory === IssueCategory.MACHINE 
                              ? t('issues.machineLocationHint')
                              : t('issues.locationPlaceholder')
                          }
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Priority */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('issues.issuePriority')}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex space-x-6"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={IssuePriority.LOW} id="low" />
                            <label htmlFor="low" className="text-sm font-medium">
                              {t('priorities.low')}
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={IssuePriority.MEDIUM} id="medium" />
                            <label htmlFor="medium" className="text-sm font-medium">
                              {t('priorities.medium')}
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={IssuePriority.HIGH} id="high" />
                            <label htmlFor="high" className="text-sm font-medium">
                              {t('priorities.high')}
                            </label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image Upload */}
                <div className="space-y-4">
                  <label className="text-sm font-medium">
                    {t('issues.attachImages')}
                  </label>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          {t('issues.addImages')}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {t('issues.imageFormats')}
                      </p>
                    </div>
                  </div>

                  {/* Selected Images Preview */}
                  {imageFiles.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imageFiles.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
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
    </div>
  );
}