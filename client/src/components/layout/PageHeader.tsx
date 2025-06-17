import React from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  backLink?: string;
  backLabel?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  backLink,
  backLabel = 'Back',
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {backLink && (
        <div className="mb-2">
          <Link href={backLink}>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {backLabel}
            </Button>
          </Link>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        
        {action && (
          <div className="flex-shrink-0 ml-4">{action}</div>
        )}
      </div>
    </div>
  );
}