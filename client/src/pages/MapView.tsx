import { useQuery } from "@tanstack/react-query";
import { Issue, IssueStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { getQueryFn } from "@/lib/queryClient";
import MapDisplay from "@/components/map/MapDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Filter } from "lucide-react";

export default function LocationView() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showIssueDetails, setShowIssueDetails] = useState(false);

  // Fetch all issues
  const { data: issues, isLoading } = useQuery<Issue[]>({
    queryKey: ["/api/issues"],
    queryFn: getQueryFn<Issue[]>({ on401: "throw" }),
  });

  // Filter issues based on search term and status
  const filteredIssues = issues ? issues.filter((issue: Issue) => {
    const matchesSearch = 
      searchTerm === "" || 
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      (statusFilter === "all" && !selectedStatus) || 
      (selectedStatus ? issue.status === selectedStatus : issue.status === statusFilter);
    
    return matchesSearch && matchesStatus;
  }) : [];
  
  // Handle clicks on the status boxes
  const handleStatusBoxClick = (status: string | null) => {
    setSelectedStatus(status);
    setShowIssueDetails(true);
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Location View</h2>
        <p className="mt-1 text-gray-600">Locate and explore company issues by location</p>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Issue Locations</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search issues..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-primary/10" : ""}
              >
                <Filter className="h-4 w-4" />
                <span className="sr-only">Filter</span>
              </Button>
            </div>
          </div>
          
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="h-[500px] rounded-md bg-gray-100 animate-pulse flex items-center justify-center">
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          ) : filteredIssues && filteredIssues.length > 0 ? (
            <div className="h-[500px] rounded-md overflow-hidden border">
              <MapDisplay issues={filteredIssues} zoom={12} />
            </div>
          ) : (
            <div className="h-[500px] rounded-md border bg-gray-50 flex flex-col items-center justify-center p-6">
              <MapPin className="h-12 w-12 text-gray-300 mb-2" />
              <h3 className="text-lg font-medium text-gray-700">No Issues Found</h3>
              <p className="text-gray-500 text-center mt-2">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filters to see more results." 
                  : "There are no reported issues yet."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-full md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Location Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div 
                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedStatus === "urgent" ? 'bg-red-100' : 'hover:bg-gray-100'}`}
                onClick={() => handleStatusBoxClick("urgent")}
              >
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white mr-3">
                  <span>!</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">Urgent Issues</p>
                  <p className="text-sm text-gray-500">High priority problems</p>
                </div>
                {selectedStatus === "urgent" && (
                  <div className="text-red-500 ml-2">
                    <span className="text-xs">▶</span>
                  </div>
                )}
              </div>
              
              <div 
                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedStatus === "in_progress" ? 'bg-yellow-100' : 'hover:bg-gray-100'}`}
                onClick={() => handleStatusBoxClick("in_progress")}
              >
                <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white mr-3">
                  <span>⟳</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">In Progress</p>
                  <p className="text-sm text-gray-500">Currently being fixed</p>
                </div>
                {selectedStatus === "in_progress" && (
                  <div className="text-yellow-500 ml-2">
                    <span className="text-xs">▶</span>
                  </div>
                )}
              </div>
              
              <div 
                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedStatus === "scheduled" ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                onClick={() => handleStatusBoxClick("scheduled")}
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white mr-3">
                  <span>⏱</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">Scheduled</p>
                  <p className="text-sm text-gray-500">Planned for repair</p>
                </div>
                {selectedStatus === "scheduled" && (
                  <div className="text-blue-500 ml-2">
                    <span className="text-xs">▶</span>
                  </div>
                )}
              </div>
              
              <div 
                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedStatus === "pending" ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                onClick={() => handleStatusBoxClick("pending")}
              >
                <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white mr-3">
                  <span>•</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">Pending</p>
                  <p className="text-sm text-gray-500">Awaiting review</p>
                </div>
                {selectedStatus === "pending" && (
                  <div className="text-gray-500 ml-2">
                    <span className="text-xs">▶</span>
                  </div>
                )}
              </div>
              
              <div 
                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedStatus === "completed" ? 'bg-green-100' : 'hover:bg-gray-100'}`}
                onClick={() => handleStatusBoxClick("completed")}
              >
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white mr-3">
                  <span>✓</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">Completed</p>
                  <p className="text-sm text-gray-500">Successfully repaired</p>
                </div>
                {selectedStatus === "completed" && (
                  <div className="text-green-500 ml-2">
                    <span className="text-xs">▶</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-full md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Location Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div 
                className={`p-4 ${selectedStatus === null ? 'bg-primary/10' : 'bg-gray-50'} rounded-md text-center cursor-pointer transition-colors hover:bg-gray-100`}
                onClick={() => handleStatusBoxClick(null)}
              >
                <p className="text-4xl font-bold text-primary">{filteredIssues?.length || 0}</p>
                <p className="text-sm text-gray-500 mt-1">Total Issues</p>
                {selectedStatus === null && (
                  <div className="mt-2 text-xs text-primary">▼ View on map</div>
                )}
              </div>
              
              <div 
                className={`p-4 ${selectedStatus === "in_progress" ? 'bg-yellow-100' : 'bg-gray-50'} rounded-md text-center cursor-pointer transition-colors hover:bg-gray-100`}
                onClick={() => handleStatusBoxClick("in_progress")}
              >
                <p className="text-4xl font-bold text-yellow-500">
                  {filteredIssues?.filter((i: Issue) => i.status === "in_progress").length || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">In Progress</p>
                {selectedStatus === "in_progress" && (
                  <div className="mt-2 text-xs text-yellow-500">▼ View on map</div>
                )}
              </div>
              
              <div 
                className={`p-4 ${selectedStatus === "urgent" ? 'bg-red-100' : 'bg-gray-50'} rounded-md text-center cursor-pointer transition-colors hover:bg-gray-100`}
                onClick={() => handleStatusBoxClick("urgent")}
              >
                <p className="text-4xl font-bold text-red-500">
                  {filteredIssues?.filter((i: Issue) => i.status === "urgent").length || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">Urgent</p>
                {selectedStatus === "urgent" && (
                  <div className="mt-2 text-xs text-red-500">▼ View on map</div>
                )}
              </div>
              
              <div 
                className={`p-4 ${selectedStatus === "completed" ? 'bg-green-100' : 'bg-gray-50'} rounded-md text-center cursor-pointer transition-colors hover:bg-gray-100`}
                onClick={() => handleStatusBoxClick("completed")}
              >
                <p className="text-4xl font-bold text-green-500">
                  {filteredIssues?.filter((i: Issue) => i.status === "completed").length || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">Completed</p>
                {selectedStatus === "completed" && (
                  <div className="mt-2 text-xs text-green-500">▼ View on map</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
