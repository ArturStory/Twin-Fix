import { useEffect } from 'react';
import { useAppWebSocket } from './use-websocket';

/**
 * A hook to subscribe to specific WebSocket events
 * @param eventType The type of event to subscribe to
 * @param callback The callback to run when the event is received
 */
export function useWebSocketSubscription(eventType: string, callback: (data: any) => void) {
  const { addListener, removeListener } = useAppWebSocket();

  useEffect(() => {
    // Subscribe to the event when the component mounts
    console.log(`Subscribing to WebSocket event: ${eventType}`);
    addListener(eventType, callback);
    
    // Clean up the subscription when the component unmounts
    return () => {
      console.log(`Unsubscribing from WebSocket event: ${eventType}`);
      removeListener(eventType, callback);
    };
  }, [eventType, callback, addListener, removeListener]);
}