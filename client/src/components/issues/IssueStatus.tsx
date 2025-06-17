import { Badge } from "@/components/ui/badge";
import { IssueStatus as StatusType } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface IssueStatusProps {
  status: string;
  size?: "sm" | "md" | "lg";
}

export default function IssueStatus({ status, size = "md" }: IssueStatusProps) {
  const { t } = useTranslation();
  
  let badgeVariant: 
    | "default" 
    | "secondary" 
    | "destructive" 
    | "outline" 
    | "success" 
    | "warning" 
    | "info" = "default";
  
  let statusKey = status;
  
  // Transform status key format for translation lookup
  if (status.includes("_")) {
    statusKey = status.toLowerCase();
  }

  let displayText;
  
  switch (status) {
    case StatusType.PENDING:
      badgeVariant = "secondary";
      displayText = t('status.pending', 'Pending');
      break;
    case StatusType.IN_PROGRESS:
      badgeVariant = "warning";
      displayText = t('status.in_progress', 'In Progress');
      break;
    case StatusType.SCHEDULED:
      badgeVariant = "info";
      displayText = t('status.scheduled', 'Scheduled');
      break;
    case StatusType.URGENT:
      badgeVariant = "destructive";
      displayText = t('status.urgent', 'Urgent');
      break;
    case StatusType.COMPLETED:
      badgeVariant = "success";
      displayText = t('status.completed', 'Completed');
      break;
    default:
      badgeVariant = "default";
      // Capitalize first letter and replace underscores with spaces
      const defaultText = status.charAt(0).toUpperCase() + status.slice(1);
      displayText = defaultText.includes("_") ? 
        defaultText.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") : 
        defaultText;
  }

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2.5 py-0.5",
    lg: "px-3 py-1"
  };

  return (
    <Badge 
      variant={badgeVariant} 
      className={cn(sizeClasses[size])}
    >
      {displayText}
    </Badge>
  );
}
