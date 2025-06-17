import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Issue, IssueStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import IssueCard from "@/components/issues/IssueCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, CalendarIcon, Filter, MapPin, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function DamageReports() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Build query parameters for server-side filtering
  const getQueryParams = () => {
    const params = new URLSearchParams();
    
    if (startDate) {
      params.append('startDate', startDate.toISOString());
    }
    
    if (endDate) {
      params.append('endDate', endDate.toISOString());
    }
    
    if (locationFilter) {
      params.append('location', locationFilter);
    }
    
    return params.toString();
  };
  
  // Fetch issues with server-side filtering
  const { data: issues, isLoading, error } = useQuery<Issue[]>({
    queryKey: ["/api/issues", startDate, endDate, locationFilter],
    queryFn: async () => {
      const queryParams = getQueryParams();
      const url = `/api/issues${queryParams ? `?${queryParams}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch damage reports');
      }
      
      return response.json();
    },
  });
  
  // Handle error if present
  if (error) {
    toast({
      title: "Error",
      description: "Failed to load damage reports. Please try again.",
      variant: "destructive",
    });
  }

  // Get unique locations for the filter dropdown
  const uniqueLocations = issues
    ? Array.from(new Set(issues.map((issue) => issue.location)))
    : [];

  // Filter issues based on search term, location, status, and date range
  const filteredIssues = issues?.filter((issue: Issue) => {
    const matchesSearch = 
      searchTerm === "" || 
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation =
      locationFilter === "" ||
      issue.location === locationFilter;
    
    const matchesStatus = 
      statusFilter === "all" || 
      issue.status === statusFilter;

    // Filter by date range if dates are selected
    const matchesDateRange = (() => {
      if (!startDate && !endDate) return true;
      
      const issueDate = issue.createdAt ? new Date(issue.createdAt) : null;
      if (!issueDate) return false;
      
      // Check if issue date is after start date (if provided)
      const afterStartDate = startDate ? issueDate >= startDate : true;
      
      // Check if issue date is before end date (if provided)
      // For end date, include the entire day by setting time to 23:59:59
      const beforeEndDate = endDate ? issueDate <= new Date(endDate.setHours(23, 59, 59, 999)) : true;
      
      return afterStartDate && beforeEndDate;
    })();
    
    return matchesSearch && matchesLocation && matchesStatus && matchesDateRange;
  });

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setLocationFilter("");
    setStatusFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32 mt-4 sm:mt-0" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="py-4 border-b last:border-0">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-4 w-1/2 mt-2" />
                <Skeleton className="h-4 w-full mt-2" />
                <div className="flex gap-4 mt-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Damage Reports</h2>
          <p className="mt-1 text-gray-600">View and filter all reported damage across locations</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button asChild variant="outline">
            <Link href="/damage-statistics">
              <BarChart className="mr-2 h-4 w-4" />
              View Statistics
            </Link>
          </Button>
          <Button asChild>
            <Link href="/report">
              <Plus className="mr-2 h-4 w-4" />
              Report Damage
            </Link>
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>All Reports</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search reports..."
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
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value={IssueStatus.PENDING}>Pending</SelectItem>
                      <SelectItem value={IssueStatus.IN_PROGRESS}>In Progress</SelectItem>
                      <SelectItem value={IssueStatus.COMPLETED}>Completed</SelectItem>
                      <SelectItem value={IssueStatus.SCHEDULED}>Scheduled</SelectItem>
                      <SelectItem value={IssueStatus.URGENT}>Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Location filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Location</label>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Locations</SelectItem>
                      {uniqueLocations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date range filter */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Date Range</label>
                  <div className="flex gap-2">
                    {/* Start date */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {/* End date */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : "End date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          disabled={(date) => 
                            (startDate ? date < startDate : false)
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Clear filters button */}
              <div className="flex justify-end">
                <Button 
                  variant="ghost" 
                  onClick={clearFilters}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {(!filteredIssues || filteredIssues.length === 0) ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Filter className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium">No damage reports found</h3>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                {searchTerm || locationFilter || statusFilter !== "all" || startDate || endDate
                  ? "Try adjusting your search filters to find what you're looking for."
                  : "No damage reports have been submitted yet. Click the 'Report Damage' button to get started."}
              </p>
              <Button asChild className="mt-6">
                <Link href="/report">Report Damage</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredIssues.map((issue) => (
                <div key={issue.id} className="py-4 first:pt-0 last:pb-0">
                  <IssueCard issue={issue} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {filteredIssues && filteredIssues.length > 0 && (
        <div className="text-sm text-gray-500 mb-8">
          Showing {filteredIssues.length} of {issues?.length} damage reports
        </div>
      )}
    </>
  );
}