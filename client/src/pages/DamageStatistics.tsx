import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BarChart, ChevronDown, ChevronUp, Clock, Download, Pin, TrendingUp } from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { useTranslation } from "react-i18next";

// Types for our statistics data
interface DamageType {
  type: string;
  count: number;
}

interface LocationCount {
  location: string;
  count: number;
}

interface StatusDistribution {
  status: string;
  count: number;
}

interface PriorityDistribution {
  priority: string;
  count: number;
}

interface MonthlyReport {
  month: string;
  count: number;
}

interface DamageStatistics {
  totalReports: number;
  commonDamageTypes: DamageType[];
  topLocations: LocationCount[];
  statusDistribution: StatusDistribution[];
  priorityDistribution: PriorityDistribution[];
  reportsByMonth: MonthlyReport[];
}

// Color palettes for charts
const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", 
  "#82CA9D", "#FF6B6B", "#6A5ACD", "#FF85AD", "#45B7D1"
];

const STATUS_COLORS: Record<string, string> = {
  "pending": "#FFBB28",   // Yellow
  "in_progress": "#0088FE", // Blue
  "completed": "#00C49F",  // Green
  "scheduled": "#8884D8",  // Purple
  "urgent": "#FF8042"      // Orange
};

const PRIORITY_COLORS: Record<string, string> = {
  "low": "#00C49F",    // Green
  "medium": "#FFBB28", // Yellow
  "high": "#FF8042"    // Orange
};

// Format month string to more readable format
const formatMonth = (monthStr: string) => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

export default function DamageStatistics() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    damageTypes: true,
    locations: true,
    status: true,
    priority: true,
    monthly: true
  });

  // Toggle a section's expanded state
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Fetch damage statistics
  const { data: statistics, isLoading, error } = useQuery<DamageStatistics>({
    queryKey: ["/api/damage-statistics"],
  });

  // Handle error if present
  if (error) {
    toast({
      title: "Error",
      description: "Failed to load damage statistics. Please try again.",
      variant: "destructive",
    });
  }

  // Function to download statistics as CSV
  const downloadCSV = () => {
    if (!statistics) return;

    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add total reports
    csvContent += "Total Reports," + statistics.totalReports + "\n\n";
    
    // Add common damage types
    csvContent += "Common Damage Types\nType,Count\n";
    statistics.commonDamageTypes.forEach(item => {
      csvContent += `${item.type},${item.count}\n`;
    });
    csvContent += "\n";
    
    // Add top locations
    csvContent += "Top Locations\nLocation,Count\n";
    statistics.topLocations.forEach(item => {
      csvContent += `${item.location},${item.count}\n`;
    });
    csvContent += "\n";
    
    // Add status distribution
    csvContent += "Status Distribution\nStatus,Count\n";
    statistics.statusDistribution.forEach(item => {
      csvContent += `${item.status},${item.count}\n`;
    });
    csvContent += "\n";
    
    // Add priority distribution
    csvContent += "Priority Distribution\nPriority,Count\n";
    statistics.priorityDistribution.forEach(item => {
      csvContent += `${item.priority},${item.count}\n`;
    });
    csvContent += "\n";
    
    // Add monthly reports
    csvContent += "Monthly Reports\nMonth,Count\n";
    statistics.reportsByMonth.forEach(item => {
      csvContent += `${item.month},${item.count}\n`;
    });
    
    // Create download link and trigger it
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "damage_statistics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Overview cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Chart placeholders */}
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="mb-6">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <BarChart className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium">No statistics available</h3>
        <p className="text-gray-500 mt-2 max-w-md mx-auto">
          There are currently no damage reports to generate statistics from.
        </p>
        <Button asChild className="mt-6">
          <Link href="/report">Report Damage</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Damage Statistics</h2>
          <p className="mt-1 text-gray-600">
            Analyze trends and patterns in damage reports
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button
            variant="outline"
            onClick={downloadCSV}
            className="flex items-center"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button asChild>
            <Link href="/damage-reports">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalReports}</div>
            <p className="text-sm text-gray-500 mt-1">Total damage reports submitted</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Most Common Issue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {statistics.commonDamageTypes.length > 0 ? statistics.commonDamageTypes[0].type : "None"}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {statistics.commonDamageTypes.length > 0 
                ? `Reported ${statistics.commonDamageTypes[0].count} times`
                : "No damage reports yet"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Top Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.topLocations.length > 0 
                ? (statistics.topLocations[0].location.length > 25 
                  ? `${statistics.topLocations[0].location.substring(0, 25)}...` 
                  : statistics.topLocations[0].location)
                : "None"}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {statistics.topLocations.length > 0 
                ? `${statistics.topLocations[0].count} reports at this location`
                : "No locations reported yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Common Damage Types */}
      <Card className="mb-6">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('damageTypes')}>
          <div className="flex justify-between items-center">
            <CardTitle>Most Common Damage Types</CardTitle>
            {expandedSections.damageTypes ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
          <CardDescription>
            Analysis of the most frequent types of damage reported
          </CardDescription>
        </CardHeader>
        {expandedSections.damageTypes && (
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={statistics.commonDamageTypes}
                  margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" angle={-45} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" name="Number of Reports" fill="#0088FE">
                    {statistics.commonDamageTypes.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Top Locations */}
      <Card className="mb-6">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('locations')}>
          <div className="flex justify-between items-center">
            <CardTitle>Locations with Most Damage Reports</CardTitle>
            {expandedSections.locations ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
          <CardDescription>
            Areas with the highest number of reported issues
          </CardDescription>
        </CardHeader>
        {expandedSections.locations && (
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={statistics.topLocations}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="location" 
                    type="category" 
                    width={150}
                    tick={{ 
                      fontSize: 12, 
                      width: 140
                    }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" name="Number of Reports" fill="#00C49F">
                    {statistics.topLocations.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Status Distribution */}
      <Card className="mb-6">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('status')}>
          <div className="flex justify-between items-center">
            <CardTitle>Status Distribution</CardTitle>
            {expandedSections.status ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
          <CardDescription>
            Distribution of reports by their current status
          </CardDescription>
        </CardHeader>
        {expandedSections.status && (
          <CardContent>
            <div className="h-80 flex flex-col sm:flex-row items-center justify-center">
              <div className="w-full h-full sm:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statistics.statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="status"
                      label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {statistics.statusDistribution.map((entry) => (
                        <Cell 
                          key={`cell-${entry.status}`} 
                          fill={STATUS_COLORS[entry.status] || COLORS[0]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="sm:w-1/2 grid grid-cols-1 gap-2 mt-4 sm:mt-0">
                {statistics.statusDistribution.map((item) => (
                  <div key={item.status} className="flex items-center">
                    <div 
                      className="w-4 h-4 mr-2" 
                      style={{ backgroundColor: STATUS_COLORS[item.status] || COLORS[0] }}
                    ></div>
                    <span className="font-medium capitalize">{item.status.replace('_', ' ')}: </span>
                    <span className="ml-2">{item.count} reports</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Priority Distribution */}
      <Card className="mb-6">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('priority')}>
          <div className="flex justify-between items-center">
            <CardTitle>Priority Distribution</CardTitle>
            {expandedSections.priority ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
          <CardDescription>
            Distribution of reports by priority level
          </CardDescription>
        </CardHeader>
        {expandedSections.priority && (
          <CardContent>
            <div className="h-80 flex flex-col sm:flex-row items-center justify-center">
              <div className="w-full h-full sm:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statistics.priorityDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="priority"
                      label={({ priority, percent }) => `${priority}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {statistics.priorityDistribution.map((entry) => (
                        <Cell 
                          key={`cell-${entry.priority}`} 
                          fill={PRIORITY_COLORS[entry.priority] || COLORS[0]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="sm:w-1/2 grid grid-cols-1 gap-2 mt-4 sm:mt-0">
                {statistics.priorityDistribution.map((item) => (
                  <div key={item.priority} className="flex items-center">
                    <div 
                      className="w-4 h-4 mr-2" 
                      style={{ backgroundColor: PRIORITY_COLORS[item.priority] || COLORS[0] }}
                    ></div>
                    <span className="font-medium capitalize">{item.priority}: </span>
                    <span className="ml-2">{item.count} reports</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Monthly Reports */}
      <Card className="mb-6">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('monthly')}>
          <div className="flex justify-between items-center">
            <CardTitle>Reports by Month</CardTitle>
            {expandedSections.monthly ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
          <CardDescription>
            Number of reports submitted each month
          </CardDescription>
        </CardHeader>
        {expandedSections.monthly && (
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={statistics.reportsByMonth.map(item => ({
                    ...item,
                    formattedMonth: formatMonth(item.month)
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="formattedMonth" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    name="Number of Reports" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        )}
      </Card>
    </>
  );
}