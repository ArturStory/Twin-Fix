import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AdminPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset confirmation after 10 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConfirming) {
      timer = setTimeout(() => {
        setIsConfirming(false);
      }, 10000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isConfirming]);

  const handleCleanupIssues = async () => {
    // First confirmation step
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    
    // Actually delete
    try {
      setIsDeleting(true);
      setError(null);
      
      const response = await fetch('/api/admin/clean-all-issues', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clean up issues');
      }
      
      const result = await response.json();
      console.log('Clean up result:', result);
      
      toast({
        title: 'Success',
        description: 'All issues have been deleted successfully',
      });
      
      // Reset and refresh page
      setIsConfirming(false);
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error('Error cleaning up issues:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to clean up issues',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Database Management</CardTitle>
            <CardDescription>
              Clean up data for testing purposes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">
              This will delete all issues and related data from the database.
              This action is irreversible and should only be used for testing purposes.
            </p>
            
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              variant={isConfirming ? "destructive" : "outline"} 
              onClick={handleCleanupIssues}
              disabled={isDeleting}
              className={isConfirming ? "animate-pulse" : ""}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting 
                ? "Deleting..."
                : isConfirming 
                  ? "Click again to confirm" 
                  : "Clean up all issues"
              }
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}