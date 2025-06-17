import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { IssueStatus, IssueType } from '@shared/schema';

import EnhancedLeafletPlanViewer from './EnhancedLeafletPlanViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { 
  Plus, Filter, RotateCcw, CheckCircle, Clock, 
  AlertTriangle, Pencil, Map 
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IssueReportForm } from '../../issues/IssueReportForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import './enhanced-leaflet-plan.css';

interface Issue {
  id: number | string;
  title: string;
  description: string;
  status: IssueStatus;
  location: string;
  latitude?: number;
  longitude?: number;
  pinX?: number;
  pinY?: number;
  isInteriorPin?: boolean;
  issueType?: string;
  priority?: string;
  reportedByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function McDonaldsIssueManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [activeTab, setActiveTab] = useState("interior");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isReportFormOpen, setIsReportFormOpen] = useState(false);
  
  // Fetch issues
  const { data: issues, isLoading, isError } = useQuery({
    queryKey: ['/api/issues'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Filter issues based on selected filters
  const filteredIssues = React.useMemo(() => {
    if (!issues) return [];
    
    let filtered = [...issues];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(issue => {
        if (statusFilter === 'active') {
          return issue.status !== IssueStatus.FIXED && issue.status !== IssueStatus.COMPLETED;
        } else if (statusFilter === 'fixed') {
          return issue.status === IssueStatus.FIXED || issue.status === IssueStatus.COMPLETED;
        } else {
          return issue.status === statusFilter;
        }
      });
    }
    
    return filtered;
  }, [issues, statusFilter]);
  
  // Filter issues by interior/exterior
  const interiorIssues = React.useMemo(() => {
    console.log('Filtering issues for interior map:', filteredIssues);
    // For interior, we want either true or null/undefined (as default)
    return filteredIssues.filter(issue => 
      issue.isInteriorPin === true || issue.isInteriorPin === null || issue.isInteriorPin === undefined
    );
  }, [filteredIssues]);
  
  const exteriorIssues = React.useMemo(() => {
    console.log('Filtering issues for exterior map:', filteredIssues);
    // For exterior, we want explicitly false
    return filteredIssues.filter(issue => issue.isInteriorPin === false);
  }, [filteredIssues]);
  
  // Handle adding a new issue
  const handleAddIssue = async (issueData: any) => {
    try {
      // Make sure we have pin coordinates - use default values if not provided
      const enhancedIssueData = {
        ...issueData,
        // Ensure we have valid pin coordinates
        pinX: typeof issueData.pinX === 'number' ? issueData.pinX : 
              (issueData.isInteriorPin ? 1000 : 2000), // Default X positions if none provided
        pinY: typeof issueData.pinY === 'number' ? issueData.pinY : 
              (issueData.isInteriorPin ? 500 : 1000),  // Default Y positions if none provided
        isInteriorPin: typeof issueData.isInteriorPin === 'boolean' ? 
                      issueData.isInteriorPin : activeTab === 'interior'
      };
      
      console.log('Submitting issue with coordinates:', enhancedIssueData);
      
      const response = await apiRequest('/api/issues', {
        method: 'POST',
        body: JSON.stringify(enhancedIssueData),
      });
      
      if (response) {
        toast({
          title: "Issue Added",
          description: "The new issue has been successfully added.",
        });
        
        // Refresh queries
        queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
        queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
        
        // Close the form dialog
        setIsReportFormOpen(false);
      }
    } catch (error) {
      console.error("Error adding issue:", error);
      toast({
        title: "Error",
        description: "Failed to add the issue. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle updating an issue's status
  const handleUpdateIssueStatus = async (issueId: string | number, newStatus: IssueStatus) => {
    try {
      // Optimistically update UI
      queryClient.setQueryData(['/api/issues'], (oldData: Issue[]) => {
        return oldData.map(issue => {
          if (issue.id === issueId) {
            return { ...issue, status: newStatus };
          }
          return issue;
        });
      });
      
      // Refresh queries to ensure consistent state
      queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
      
      toast({
        title: "Status Updated",
        description: `Issue status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating issue status:", error);
      toast({
        title: "Error",
        description: "Failed to update the issue status.",
        variant: "destructive",
      });
      
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
    }
  };
  
  // Get status badge variant
  const getStatusBadgeVariant = (status: IssueStatus) => {
    switch (status) {
      case IssueStatus.PENDING:
        return "default";
      case IssueStatus.IN_PROGRESS:
        return "warning";
      case IssueStatus.URGENT:
        return "destructive";
      case IssueStatus.SCHEDULED:
        return "secondary";
      case IssueStatus.FIXED:
      case IssueStatus.COMPLETED:
        return "success";
      default:
        return "outline";
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">McDonald's Issue Management</h1>
        <Button onClick={() => setIsReportFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Report New Issue
        </Button>
      </div>
      
      <div className="mb-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>Issue Filter</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setStatusFilter('all')}
                title="Reset filters"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Filter issues by status to focus on active problems or review fixed ones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="w-full md:w-56">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Issues</SelectItem>
                    <SelectItem value="active">Active Issues</SelectItem>
                    <SelectItem value="fixed">Fixed Issues</SelectItem>
                    <SelectItem value={IssueStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={IssueStatus.IN_PROGRESS}>In Progress</SelectItem>
                    <SelectItem value={IssueStatus.SCHEDULED}>Scheduled</SelectItem>
                    <SelectItem value={IssueStatus.URGENT}>Urgent</SelectItem>
                    <SelectItem value={IssueStatus.COMPLETED}>Completed</SelectItem>
                    <SelectItem value={IssueStatus.FIXED}>Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Status summary */}
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="outline" className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Total: {issues?.length || 0}
                </Badge>
                <Badge variant="outline" className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Active: {issues?.filter(i => i.status !== IssueStatus.FIXED && i.status !== IssueStatus.COMPLETED).length || 0}
                </Badge>
                <Badge variant="outline" className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Fixed: {issues?.filter(i => i.status === IssueStatus.FIXED || i.status === IssueStatus.COMPLETED).length || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Floor Plan Tabs */}
      <Tabs defaultValue="interior" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="interior">
            Interior Floor Plan
          </TabsTrigger>
          <TabsTrigger value="exterior">
            Exterior Floor Plan
          </TabsTrigger>
          <TabsTrigger value="list">
            Issue List
          </TabsTrigger>
        </TabsList>
        
        {/* Interior Plan Tab */}
        <TabsContent value="interior">
          <Card>
            <CardHeader>
              <CardTitle>Interior Issue Map</CardTitle>
              <CardDescription>
                View and manage issues on the interior floor plan. Click on pins to see details and update status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedLeafletPlanViewer
                imagePath="/MC Donald's (Jana Bazynskiego2)interior plan.jpg"
                aspectRatio={0.5}
                isInterior={true}
                existingIssues={interiorIssues.map(issue => {
                  console.log('Processing interior issue for map:', issue);
                  // Calculate offset based on issue ID to space out pins if they have default coordinates
                  const idOffset = parseInt(String(issue.id)) * 100 || 0;
                  return {
                    id: issue.id,
                    x: typeof issue.pinX === 'number' && issue.pinX !== 0 ? issue.pinX : (1000 + idOffset % 500), 
                    y: typeof issue.pinY === 'number' && issue.pinY !== 0 ? issue.pinY : (500 + Math.floor(idOffset / 500) * 100),
                    title: issue.title,
                    description: issue.description,
                    status: issue.status,
                    reportedByName: issue.reportedByName,
                    issueType: issue.issueType,
                    priority: issue.priority,
                    createdAt: issue.createdAt ? new Date(issue.createdAt) : undefined,
                    updatedAt: issue.updatedAt ? new Date(issue.updatedAt) : undefined
                  };
                })}
                onIssueUpdated={handleUpdateIssueStatus}
                onIssueAdded={handleAddIssue}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Exterior Plan Tab */}
        <TabsContent value="exterior">
          <Card>
            <CardHeader>
              <CardTitle>Exterior Issue Map</CardTitle>
              <CardDescription>
                View and manage issues on the exterior floor plan. Click on pins to see details and update status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedLeafletPlanViewer
                imagePath="/MC Donald's (Jana Bazynskiego2) exterior plan.jpg"
                aspectRatio={0.5}
                isInterior={false}
                existingIssues={exteriorIssues.map(issue => {
                  console.log('Processing exterior issue for map:', issue);
                  // Calculate offset based on issue ID to space out pins if they have default coordinates
                  const idOffset = parseInt(String(issue.id)) * 100 || 0;
                  return {
                    id: issue.id,
                    x: typeof issue.pinX === 'number' && issue.pinX !== 0 ? issue.pinX : (2000 + idOffset % 800), 
                    y: typeof issue.pinY === 'number' && issue.pinY !== 0 ? issue.pinY : (1000 + Math.floor(idOffset / 800) * 150),
                    title: issue.title,
                    description: issue.description,
                    status: issue.status,
                    reportedByName: issue.reportedByName,
                    issueType: issue.issueType,
                    priority: issue.priority,
                    createdAt: issue.createdAt ? new Date(issue.createdAt) : undefined,
                    updatedAt: issue.updatedAt ? new Date(issue.updatedAt) : undefined
                  };
                })}
                onIssueUpdated={handleUpdateIssueStatus}
                onIssueAdded={handleAddIssue}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Issue List Tab */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Issue List</CardTitle>
              <CardDescription>
                View all issues in a list format. Click on an issue to see details and take action.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading issues...</div>
              ) : isError ? (
                <div className="text-center py-8 text-red-500">Error loading issues. Please try again.</div>
              ) : filteredIssues.length === 0 ? (
                <div className="text-center py-8">No issues found matching the selected filters.</div>
              ) : (
                <div className="grid gap-4">
                  {filteredIssues.map(issue => (
                    <Card key={issue.id} className="overflow-hidden">
                      <div className="p-4 grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-4">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{issue.title}</h3>
                            <Badge variant={getStatusBadgeVariant(issue.status)}>
                              {issue.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mb-2">{issue.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {issue.reportedByName && (
                              <span className="text-gray-500">
                                Reported by: {issue.reportedByName}
                              </span>
                            )}
                            {issue.createdAt && (
                              <span className="text-gray-500">
                                Reported on: {new Date(issue.createdAt).toLocaleDateString()}
                              </span>
                            )}
                            {issue.issueType && (
                              <Badge variant="outline">{issue.issueType}</Badge>
                            )}
                            {issue.priority && (
                              <Badge variant="outline">{issue.priority}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="md:col-span-2 flex flex-col justify-center items-end">
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // Set active tab based on issue location
                                setActiveTab(issue.isInteriorPin ? "interior" : "exterior");
                                
                                // Scroll to map and highlight pin (in a real app,
                                // you would implement highlighting functionality)
                                setTimeout(() => {
                                  document.querySelector('.leaflet-map-container')?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center'
                                  });
                                }, 100);
                              }}
                            >
                              <Map className="h-4 w-4" />
                              <span className="sr-only">View on Map</span>
                            </Button>
                            
                            {/* Only show mark as fixed button for active issues */}
                            {issue.status !== IssueStatus.FIXED && issue.status !== IssueStatus.COMPLETED && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await apiRequest(`/api/issues/${issue.id}/fix`, {
                                      method: 'POST',
                                      body: JSON.stringify({
                                        notes: `Marked as fixed from issue list`
                                      })
                                    });
                                    
                                    handleUpdateIssueStatus(issue.id, IssueStatus.FIXED);
                                  } catch (error) {
                                    console.error("Error marking issue as fixed:", error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to mark issue as fixed",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                                <span className="sr-only">Mark as Fixed</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Issue Report Dialog */}
      <Dialog open={isReportFormOpen} onOpenChange={setIsReportFormOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Report New Issue</DialogTitle>
          </DialogHeader>
          <IssueReportForm onSuccess={handleAddIssue} />
        </DialogContent>
      </Dialog>
    </div>
  );
}