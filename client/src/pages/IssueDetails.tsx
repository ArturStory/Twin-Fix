import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Issue, IssueStatus as IssueStatusEnum, Comment } from "@shared/schema";
import { useState } from "react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IssueStatus from "@/components/issues/IssueStatus";
import MapDisplay from "@/components/map/MapDisplay";
import { Clock, DollarSign, MapPin, MessageSquare, Eye, ArrowLeft, Edit, Save, Loader2 } from "lucide-react";

interface IssueDetailsProps {
  id: number;
}

export default function IssueDetails({ id }: IssueDetailsProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [editForm, setEditForm] = useState({
    status: "",
    estimatedCost: 0,
    finalCost: 0,
  });

  // Fetch issue details
  const { data: issue, isLoading: issueLoading } = useQuery<Issue>({
    queryKey: [`/api/issues/${id}`],
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to load issue details. Please try again.",
        variant: "destructive",
      });
      navigate("/");
    },
  });

  // Fetch comments
  const { data: comments, isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: [`/api/issues/${id}/comments`],
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to load comments. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update issue mutation
  const updateIssueMutation = useMutation({
    mutationFn: async (data: Partial<Issue>) => {
      const response = await apiRequest("PATCH", `/api/issues/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Issue updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/issues/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update issue. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/issues/${id}/comments`, {
        userId: 1, // Demo user ID
        username: "Demo User",
        content,
        issueId: id,
      });
      return response.json();
    },
    onSuccess: () => {
      setCommentText("");
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/issues/${id}/comments`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle edit mode toggle
  const handleEditToggle = () => {
    if (isEditing) {
      setIsEditing(false);
    } else if (issue) {
      setEditForm({
        status: issue.status,
        estimatedCost: issue.estimatedCost || 0,
        finalCost: issue.finalCost || 0,
      });
      setIsEditing(true);
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!issue) return;
    
    updateIssueMutation.mutate({
      status: editForm.status as IssueStatusEnum,
      estimatedCost: editForm.estimatedCost,
      finalCost: editForm.finalCost || undefined,
    });
  };

  // Handle comment submission
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    addCommentMutation.mutate(commentText);
  };

  // Format date for display
  const formatDate = (dateString?: Date) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (issueLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-40" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-40 w-full rounded" />
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold">Issue Not Found</h2>
              <p className="text-gray-500 mt-2">The issue you're looking for doesn't exist or has been removed.</p>
              <Button 
                className="mt-4" 
                onClick={() => navigate("/")}
              >
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate("/")} className="text-gray-600">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <IssueStatus status={issue.status} />
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{issue.title}</CardTitle>
              <CardDescription className="mt-1 flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-1" />
                {issue.location}
              </CardDescription>
            </div>
            <Button
              onClick={handleEditToggle}
              variant="outline"
              className="ml-4"
            >
              {isEditing ? <Eye className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              {isEditing ? "View Details" : "Edit Issue"}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {issue.imageUrls && issue.imageUrls.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {issue.imageUrls.map((imageUrl, index) => (
                <div key={index} className="relative rounded-md overflow-hidden">
                  <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-md flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-100 p-6 rounded-md text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400 mb-2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
              <p className="text-gray-500">No images available</p>
            </div>
          )}
          
          <div>
            <h3 className="text-lg font-medium mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-line">{issue.description}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Reported By</h3>
              <div className="flex items-center">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`https://randomuser.me/api/portraits/men/${id % 10}.jpg`} />
                  <AvatarFallback>{issue.reportedByName?.slice(0, 2) || "??"}</AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="font-medium">{issue.reportedByName}</p>
                  <p className="text-sm text-gray-500">{formatDate(issue.createdAt)}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Location</h3>
              {issue.latitude && issue.longitude ? (
                <div className="h-[150px] rounded-md overflow-hidden">
                  <MapDisplay issues={[issue]} singleIssueMode center={[issue.latitude, issue.longitude]} zoom={15} />
                </div>
              ) : (
                <p className="text-gray-500">{issue.location}</p>
              )}
            </div>
          </div>
          
          <Separator />
          
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Status</label>
                <Select 
                  value={editForm.status} 
                  onValueChange={(value) => setEditForm({...editForm, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={IssueStatusEnum.PENDING}>Pending</SelectItem>
                    <SelectItem value={IssueStatusEnum.IN_PROGRESS}>In Progress</SelectItem>
                    <SelectItem value={IssueStatusEnum.SCHEDULED}>Scheduled</SelectItem>
                    <SelectItem value={IssueStatusEnum.URGENT}>Urgent</SelectItem>
                    <SelectItem value={IssueStatusEnum.COMPLETED}>Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost ($)</label>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    value={editForm.estimatedCost || 0}
                    onChange={(e) => setEditForm({...editForm, estimatedCost: parseFloat(e.target.value) || 0})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Final Cost ($)</label>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    value={editForm.finalCost || 0}
                    onChange={(e) => setEditForm({...editForm, finalCost: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleSubmit} 
                  disabled={updateIssueMutation.isPending}
                >
                  {updateIssueMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Cost Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-500 mr-2">Estimated:</span>
                    <span className="font-medium">${issue.estimatedCost?.toFixed(2) || "0.00"}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-500 mr-2">Final:</span>
                    <span className="font-medium">${issue.finalCost?.toFixed(2) || "Not completed"}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Tracking Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-500 mr-2">Reported:</span>
                    <span className="font-medium">{formatDate(issue.createdAt)}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-500 mr-2">Last Update:</span>
                    <span className="font-medium">{formatDate(issue.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Tabs defaultValue="comments" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="comments" className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-2" />
            Comments {comments?.length ? `(${comments.length})` : ""}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Discussion</CardTitle>
              <CardDescription>
                Share updates and ask questions about this issue
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleCommentSubmit} className="mb-6">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="mb-3"
                />
                <Button 
                  type="submit" 
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {addCommentMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Comment
                </Button>
              </form>
              
              <div className="space-y-4">
                {commentsLoading ? (
                  <>
                    <div className="flex space-x-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </>
                ) : comments && comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={`https://randomuser.me/api/portraits/men/${comment.id % 10}.jpg`} />
                        <AvatarFallback>{comment.username.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="font-medium">{comment.username}</div>
                          <p className="text-gray-700 mt-1 whitespace-pre-line">{comment.content}</p>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(comment.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">No comments yet. Be the first to comment!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
