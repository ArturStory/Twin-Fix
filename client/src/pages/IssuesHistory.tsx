import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Issue, IssueStatus } from "@shared/schema";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Calendar,
  CalendarClock,
  Search,
  MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function IssuesHistory() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  
  // Fetch issues
  const { data: issues, isLoading } = useQuery<Issue[]>({
    queryKey: ["/api/issues"],
    staleTime: 10000,
  });

  // Filter issues based on search term and status
  const filteredIssues = issues?.filter(issue => {
    const matchesSearch = searchTerm === "" ||
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === null || issue.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Format date for display
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return format(date, "MMM d, yyyy h:mm a");
  };

  // Get status count
  const getStatusCount = (status: string) => {
    return issues?.filter(issue => issue.status === status).length || 0;
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header with back button */}
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('history.backToDashboard')}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">{t('history.repairHistory')}</h1>
      </div>

      <p className="text-gray-600 mb-6">
        {t('history.trackRepairStatus')}
      </p>

      {/* Search and filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('history.searchPlaceholder')}
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant={selectedStatus === null ? "default" : "outline"} 
            size="sm"
            onClick={() => setSelectedStatus(null)}
          >
            {t('history.all')}
          </Button>
          <Button 
            variant={selectedStatus === IssueStatus.PENDING ? "default" : "outline"} 
            size="sm"
            onClick={() => setSelectedStatus(IssueStatus.PENDING)}
          >
            {t('status.pending')} ({getStatusCount(IssueStatus.PENDING)})
          </Button>
          <Button 
            variant={selectedStatus === IssueStatus.SCHEDULED ? "default" : "outline"} 
            size="sm"
            onClick={() => setSelectedStatus(IssueStatus.SCHEDULED)}
          >
            {t('status.scheduled')} ({getStatusCount(IssueStatus.SCHEDULED)})
          </Button>
          <Button 
            variant={selectedStatus === IssueStatus.COMPLETED ? "default" : "outline"} 
            size="sm"
            onClick={() => setSelectedStatus(IssueStatus.COMPLETED)}
          >
            {t('status.completed')} ({getStatusCount(IssueStatus.COMPLETED)})
          </Button>
        </div>
      </div>

      {/* Repair History Table */}
      <Card className="shadow-sm mb-6">
        <CardHeader className="pb-2">
          <CardTitle>{t('history.repairStatusHistory')}</CardTitle>
          <CardDescription>
            {t('history.completeHistory')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <HistoryTableSkeleton />
          ) : filteredIssues.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">{t('history.issue')}</TableHead>
                  <TableHead>{t('common.location')}</TableHead>
                  <TableHead>{t('history.currentStatus')}</TableHead>
                  <TableHead>{t('history.reported')}</TableHead>
                  <TableHead>{t('history.lastUpdated')}</TableHead>
                  <TableHead className="text-right">{t('history.details')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">
                      <Link href={`/issue/${issue.id}`} className="hover:text-primary hover:underline">
                        {issue.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1 text-gray-500" /> 
                        {issue.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={issue.status} />
                    </TableCell>
                    <TableCell>{formatDate(issue.createdAt)}</TableCell>
                    <TableCell>{formatDate(issue.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/issue/${issue.id}`}>
                          {t('history.viewHistory')}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700">{t('history.noHistoryFound')}</h3>
              <p className="text-gray-500 mt-1">{t('history.tryDifferentSearch')}</p>
              <Button asChild className="mt-4">
                <Link href="/report">{t('history.reportNewIssue')}</Link>
              </Button>
            </div>
          )}
        </CardContent>
        {filteredIssues.length > 0 && (
          <CardFooter className="border-t px-6 py-4">
            <div className="text-sm text-gray-500">
              {t('history.showing')} {filteredIssues.length} {filteredIssues.length === 1 ? t('history.issue') : t('history.issues')}
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Quick status reference */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatusCountCard status={IssueStatus.PENDING} count={getStatusCount(IssueStatus.PENDING)} icon={<Clock className="h-5 w-5 text-gray-500" />} />
        <StatusCountCard status={IssueStatus.SCHEDULED} count={getStatusCount(IssueStatus.SCHEDULED)} icon={<CalendarClock className="h-5 w-5 text-blue-500" />} />
        <StatusCountCard status={IssueStatus.IN_PROGRESS} count={getStatusCount(IssueStatus.IN_PROGRESS)} icon={<Clock className="h-5 w-5 text-yellow-500" />} />
        <StatusCountCard status={IssueStatus.COMPLETED} count={getStatusCount(IssueStatus.COMPLETED)} icon={<CheckCircle className="h-5 w-5 text-green-500" />} />
      </div>
    </div>
  );
}

// Status count card
function StatusCountCard({ status, count, icon }: { status: string; count: number; icon: React.ReactNode }) {
  const { t } = useTranslation();
  let bgColor = "";
  
  switch (status) {
    case IssueStatus.URGENT:
      bgColor = "bg-red-50";
      break;
    case IssueStatus.IN_PROGRESS:
      bgColor = "bg-yellow-50";
      break;
    case IssueStatus.COMPLETED:
      bgColor = "bg-green-50";
      break;
    case IssueStatus.SCHEDULED:
      bgColor = "bg-blue-50";
      break;
    default:
      bgColor = "bg-gray-50";
  }
  
  return (
    <div className={`border rounded-lg p-4 ${bgColor}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm font-medium text-gray-500">{t(`status.${status}`)}</div>
          <div className="text-2xl font-bold mt-1">{count}</div>
        </div>
        <div className="rounded-full p-2 bg-white">
          {icon}
        </div>
      </div>
    </div>
  );
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  let backgroundColor = "";
  let textColor = "";
  let icon = null;
  
  switch (status) {
    case IssueStatus.URGENT:
      backgroundColor = "bg-red-100";
      textColor = "text-red-800";
      icon = <AlertTriangle className="h-3 w-3 mr-1" />;
      break;
    case IssueStatus.IN_PROGRESS:
      backgroundColor = "bg-yellow-100";
      textColor = "text-yellow-800";
      icon = <Clock className="h-3 w-3 mr-1" />;
      break;
    case IssueStatus.COMPLETED:
      backgroundColor = "bg-green-100";
      textColor = "text-green-800";
      icon = <CheckCircle className="h-3 w-3 mr-1" />;
      break;
    case IssueStatus.SCHEDULED:
      backgroundColor = "bg-blue-100";
      textColor = "text-blue-800";
      icon = <Calendar className="h-3 w-3 mr-1" />;
      break;
    default:
      backgroundColor = "bg-gray-100";
      textColor = "text-gray-800";
      icon = <Clock className="h-3 w-3 mr-1" />;
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${backgroundColor} ${textColor}`}>
      {icon}
      {t(`status.${status}`)}
    </span>
  );
}

// Loading skeleton
function HistoryTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex space-x-4 border-b pb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-6 w-24" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex space-x-4 border-b pb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}