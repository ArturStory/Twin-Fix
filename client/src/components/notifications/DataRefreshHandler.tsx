import { useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';
import { useAppWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';

/**
 * A component that listens for data refresh events from the server
 * and refreshes the relevant data in the client
 */
export function DataRefreshHandler() {
  const { addListener, removeListener } = useAppWebSocket();
  const { toast } = useToast();

  useEffect(() => {
    // Handler for data refresh events
    const handleDataRefresh = (data: any) => {
      console.log('Received data refresh event:', data);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
      
      // Show toast notification
      toast({
        title: 'Data Updated',
        description: data.message || 'Issue data has been refreshed',
      });
    };
    
    // Handler for force refresh events
    const handleForceRefresh = (data: any) => {
      console.log('Received force refresh event:', data);
      
      // Invalidate all queries
      queryClient.invalidateQueries();
      
      // Show toast notification
      toast({
        title: 'Data Updated',
        description: data.message || 'All data has been refreshed',
      });
      
      // Reload the page if needed
      if (data.reload) {
        window.location.reload();
      }
    };

    // Add listeners
    addListener('data_refresh', handleDataRefresh);
    addListener('force_refresh', handleForceRefresh);

    // Remove listeners on cleanup
    return () => {
      removeListener('data_refresh', handleDataRefresh);
      removeListener('force_refresh', handleForceRefresh);
    };
  }, [addListener, removeListener, toast]);

  // This component doesn't render anything
  return null;
}

export default DataRefreshHandler;