import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

export default function AdminPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleClearIssues = async () => {
    if (!confirm('Are you sure you want to clear all issues? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/clean-issues', {
        method: 'POST',
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'All issues have been cleared',
        });

        // Force refresh of issues data
        queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
        queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to clear issues',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear issues',
        variant: 'destructive',
      });
      console.error('Error clearing issues:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/refresh-clients', {
        method: 'POST',
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Refresh command sent to all clients',
        });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to refresh clients',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh clients',
        variant: 'destructive',
      });
      console.error('Error refreshing clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">Admin Tools</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Manage application data and force client refreshes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button 
                onClick={handleClearIssues} 
                disabled={isLoading}
                variant="destructive"
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Clear All Issues
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                This will permanently delete all issues, comments, images and status changes.
              </p>
            </div>
            
            <div>
              <Button 
                onClick={handleRefreshClients}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Force Client Refresh
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Send a refresh command to all connected clients
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}